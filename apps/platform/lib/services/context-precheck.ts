// Context precheck service for PII detection and redaction
// This is a simplified version that integrates with the GovernsAI precheck system

interface PrecheckResult {
  decision: 'allow' | 'redact' | 'block' | 'deny';
  redactedContent?: string;
  piiTypes: string[];
  reasons: string[];
}

class ContextPrecheckService {
  /**
   * Check content for PII and governance compliance
   * This is a simplified implementation - in production, this would integrate
   * with the actual GovernsAI precheck service
   */
  async check(input: {
    content: string;
    userId: string;
    orgId: string;
    tool: string;
    scope: string;
  }): Promise<PrecheckResult> {
    try {
      // For now, implement basic PII detection patterns
      const piiPatterns = [
        { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
        { type: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
        { type: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
        { type: 'credit_card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
      ];

      const detectedPii: string[] = [];
      let redactedContent = input.content;

      // Check for PII patterns
      for (const { type, pattern } of piiPatterns) {
        const matches = input.content.match(pattern);
        if (matches) {
          detectedPii.push(type);
          
          // Simple redaction (replace with [REDACTED])
          redactedContent = redactedContent.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
        }
      }

      // Check for sensitive keywords
      const sensitiveKeywords = [
        'password', 'secret', 'token', 'key', 'credential',
        'social security', 'ssn', 'credit card', 'bank account'
      ];

      const hasSensitiveKeywords = sensitiveKeywords.some(keyword => 
        input.content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasSensitiveKeywords) {
        detectedPii.push('sensitive_keywords');
      }

      // Determine decision based on PII detection
      let decision: 'allow' | 'redact' | 'block' | 'deny' = 'allow';
      const reasons: string[] = [];

      if (detectedPii.length > 0) {
        if (detectedPii.includes('ssn') || detectedPii.includes('credit_card')) {
          decision = 'block';
          reasons.push('High-risk PII detected');
        } else {
          decision = 'redact';
          reasons.push('PII detected and redacted');
        }
      }

      // Check content length (prevent extremely long content)
      if (input.content.length > 50000) {
        decision = 'block';
        reasons.push('Content too long');
      }

      // Check for potential security issues
      const suspiciousPatterns = [
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /<script/gi,
        /javascript:/gi,
      ];

      const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
        pattern.test(input.content)
      );

      if (hasSuspiciousContent) {
        decision = 'block';
        reasons.push('Potentially malicious content detected');
      }

      return {
        decision,
        redactedContent: decision === 'redact' ? redactedContent : undefined,
        piiTypes: detectedPii,
        reasons,
      };

    } catch (error) {
      console.error('Context precheck failed:', error);
      // Fail open: allow storage but log error
      return {
        decision: 'allow',
        piiTypes: [],
        reasons: ['precheck_failed'],
      };
    }
  }

  /**
   * Enhanced precheck that integrates with GovernsAI SDK
   * This would be used in production with actual GovernsAI integration
   */
  async checkWithGovernsAI(input: {
    content: string;
    userId: string;
    orgId: string;
    tool: string;
    scope: string;
  }): Promise<PrecheckResult> {
    // TODO: Implement actual GovernsAI SDK integration
    // This would use the GovernsAI client to perform real precheck
    // For now, fall back to basic precheck
    return this.check(input);
  }
}

export const contextPrecheck = new ContextPrecheckService();
