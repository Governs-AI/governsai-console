/**
 * OCR Service
 *
 * Handles text extraction from various document formats:
 * - Images (PNG, JPG, TIFF) using Tesseract.js
 * - PDFs using pdf-parse
 * - DOCX files using mammoth
 * - Plain text files (TXT, MD)
 */

import { createWorker, PSM } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { lookup } from 'mime-types';

export interface ExtractionResult {
  text: string;
  confidence?: number;
  pageCount?: number;
  metadata?: Record<string, any>;
}

export interface ExtractionProgress {
  status: 'initializing' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
}

export class OCRService {
  /**
   * Extract text from any supported document format
   */
  async extractText(
    buffer: Buffer,
    filename: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractionResult> {
    const mimeType = lookup(filename) || '';
    const extension = filename.split('.').pop()?.toLowerCase();

    onProgress?.({
      status: 'initializing',
      progress: 0,
      message: `Detecting document type: ${extension}`,
    });

    try {
      // Route to appropriate extraction method based on type
      if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'tiff', 'bmp'].includes(extension || '')) {
        return await this.extractFromImage(buffer, onProgress);
      } else if (mimeType === 'application/pdf' || extension === 'pdf') {
        return await this.extractFromPDF(buffer, onProgress);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx'
      ) {
        return await this.extractFromDOCX(buffer, onProgress);
      } else if (['txt', 'md', 'text', 'markdown'].includes(extension || '')) {
        return await this.extractFromPlainText(buffer, onProgress);
      } else {
        throw new Error(`Unsupported file format: ${extension || mimeType}`);
      }
    } catch (error) {
      onProgress?.({
        status: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extract text from images using Tesseract OCR
   */
  private async extractFromImage(
    buffer: Buffer,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      status: 'processing',
      progress: 10,
      message: 'Initializing OCR engine...',
    });

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: 'processing',
            progress: 10 + (m.progress * 80),
            message: `OCR processing: ${Math.round(m.progress * 100)}%`,
          });
        }
      },
    });

    try {
      // Set PSM mode for better accuracy
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      onProgress?.({
        status: 'processing',
        progress: 20,
        message: 'Running OCR on image...',
      });

      const { data } = await worker.recognize(buffer);

      onProgress?.({
        status: 'completed',
        progress: 100,
        message: 'OCR completed',
      });

      return {
        text: data.text.trim(),
        confidence: data.confidence,
        metadata: {
          words: data.words?.length || 0,
          lines: data.lines?.length || 0,
        },
      };
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Extract text from PDFs using pdf-parse
   */
  private async extractFromPDF(
    buffer: Buffer,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      status: 'processing',
      progress: 20,
      message: 'Parsing PDF document...',
    });

    try {
      const data = await pdfParse(buffer, {
        // Limit parsing to reasonable size
        max: 0, // 0 = no limit, adjust if needed
      });

      onProgress?.({
        status: 'processing',
        progress: 80,
        message: `Extracted text from ${data.numpages} pages`,
      });

      // If extracted text is empty or very short, might be scanned PDF
      if (data.text.trim().length < 50 && data.numpages > 0) {
        onProgress?.({
          status: 'processing',
          progress: 50,
          message: 'PDF appears to be scanned, attempting OCR...',
        });

        // Note: For production, you'd need pdf-to-image conversion here
        // This is a placeholder - actual implementation would need pdf2pic or similar
        throw new Error('Scanned PDF detected. OCR on PDF pages not yet implemented. Please extract images first.');
      }

      onProgress?.({
        status: 'completed',
        progress: 100,
        message: 'PDF extraction completed',
      });

      return {
        text: data.text.trim(),
        pageCount: data.numpages,
        metadata: {
          info: data.info,
          numPages: data.numpages,
        },
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from DOCX files using mammoth
   */
  private async extractFromDOCX(
    buffer: Buffer,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      status: 'processing',
      progress: 30,
      message: 'Extracting text from DOCX...',
    });

    try {
      const result = await mammoth.extractRawText({ buffer });

      onProgress?.({
        status: 'processing',
        progress: 90,
        message: 'DOCX text extracted',
      });

      if (result.messages.length > 0) {
        console.warn('Mammoth extraction warnings:', result.messages);
      }

      onProgress?.({
        status: 'completed',
        progress: 100,
        message: 'DOCX extraction completed',
      });

      return {
        text: result.value.trim(),
        metadata: {
          warnings: result.messages.length,
        },
      };
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromPlainText(
    buffer: Buffer,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      status: 'processing',
      progress: 50,
      message: 'Reading plain text file...',
    });

    const text = buffer.toString('utf-8');

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Text file read successfully',
    });

    return {
      text: text.trim(),
      metadata: {
        encoding: 'utf-8',
      },
    };
  }

  /**
   * Check if a file type is supported
   */
  isSupportedFormat(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    const supportedExtensions = [
      'pdf',
      'docx',
      'txt',
      'md',
      'markdown',
      'png',
      'jpg',
      'jpeg',
      'tiff',
      'bmp',
    ];
    return supportedExtensions.includes(extension || '');
  }

  /**
   * Get MIME type from filename
   */
  getMimeType(filename: string): string {
    return lookup(filename) || 'application/octet-stream';
  }
}

// Singleton instance
export const ocrService = new OCRService();
