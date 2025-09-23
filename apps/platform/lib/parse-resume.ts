import PDFParser from "pdf2json";
import mammoth from "mammoth";
import { OpenAI } from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
});

function parsePdf(buffer: Buffer): Promise<string> {
    console.log("📄 Starting PDF parsing...");
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error("❌ PDF parsing error:", errData.parserError);
            reject(new Error(`PDF parsing failed: ${errData.parserError}`));
        });
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            console.log("✅ PDF parsing completed successfully");
            try {
                const rawText = pdfData?.Pages?.flatMap((page: any) =>
                    page.Texts?.map((t: any) =>
                        decodeURIComponent(t.R[0].T)
                    ) || []
                ).join(" ") || "";
                console.log(`📝 Extracted text length: ${rawText.length} characters`);
                resolve(rawText);
            } catch (error) {
                reject(new Error("Failed to extract text from PDF"));
            }
        });

        try {
            pdfParser.parseBuffer(buffer);
        } catch (error) {
            reject(new Error("Failed to parse PDF buffer"));
        }
    });
}

async function parseDocx(buffer: Buffer): Promise<string> {
    console.log("📝 Processing DOCX file...");
    try {
        const result = await mammoth.extractRawText({ buffer });
        console.log(`📝 Extracted text length: ${result.value.length} characters`);
        return result.value;
    } catch (error) {
        console.error("❌ DOCX parsing error:", error);
        throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

const PARSER_PROMPT = `
You are an expert resume parser.

Given this resume text, extract structured JSON based on the following Prisma schema:

{
  "user": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "github": string | null,
    "linkedin": string | null
  },
  "experience": [
    {
      "company": string,
      "position": string,
      "startYear": string,
      "endYear": string,
      "achievements": string[],
      "responsibilities": string[]
    }
  ],
  "education": [
    {
      "degree": string,
      "field": string,
      "institution": string,
      "startYear": number,
      "endYear": number
    }
  ],
  "projects": [
    {
      "name": string,
      "summary": string,
      "technologies": string[],
      "responsibilities": string[]
    }
  ],
  "skills": [
    {
      "name": string,
      "skillType": string
    }
  ]
}

CRITICAL REQUIREMENTS:
1. The "technologies" field in projects MUST be an array of strings
2. Each technology should be a separate string in the array
3. For user fields (name, email, phone, github, linkedin), return null if the information is not found in the resume
4. DO NOT use placeholder text like "Not Provided", "N/A", or similar - use null instead
5. Only return valid JSON - no explanations or additional text
6. If you cannot find specific information, use null rather than making up data
7. Look carefully for contact information in headers, footers, and contact sections
8. Extract name from the resume header or title section
9. Look for email addresses in contact information or header sections
10. Find phone numbers in contact details or header sections
11. Search for GitHub profiles in links or contact sections
12. Look for LinkedIn profiles in links or contact sections

Only return a JSON object. Do not include any explanation.
`;

export async function parseResumeWithAI(rawText: string) {
    const prompt = `${PARSER_PROMPT}
Resume Text:
"""${rawText}"""

Do not include any additional things outside of the JSON object unless rephrasing the resume text.
OUTPUT MUST ONLY RETURN JSON NOTHING ELSE`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that extracts structured JSON from resumes. Always return valid JSON format.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const jsonString = response.choices[0].message.content;

        if (!jsonString) {
            console.error("❌ Empty response from AI");
            return null;
        }

        try {
            const parsed = JSON.parse(jsonString);

            console.log("AI response JSON:", parsed);

            // Basic validation of the parsed structure
            if (!parsed || typeof parsed !== 'object') {
                console.error("❌ Invalid JSON structure from AI");
                return null;
            }

            // Ensure all required fields exist
            const requiredFields = ['user', 'experience', 'education', 'projects', 'skills'];
            for (const field of requiredFields) {
                if (!parsed[field]) {
                    console.error(`❌ Missing required field: ${field}`);
                    return null;
                }
            }

            // Clean up placeholder text in user fields
            if (parsed.user) {
                const placeholderTexts = [
                    'Not Provided', 'N/A', 'NA', 'Not Available', 'Unknown', 'None',
                    'not provided', 'n/a', 'na', 'not available', 'unknown', 'none',
                    'Not provided', 'N/a', 'Na', 'Not available', 'Unknown', 'None'
                ];

                console.log("🔍 Original user data from AI:", parsed.user);

                Object.keys(parsed.user).forEach(key => {
                    const value = parsed.user[key];
                    if (value && (placeholderTexts.includes(value) || value.trim() === '')) {
                        console.log(`🔄 Converting placeholder "${value}" to null for field "${key}"`);
                        parsed.user[key] = null;
                    }
                });

                console.log("✅ Cleaned user data:", parsed.user);
            }

            return parsed;
        } catch (parseErr) {
            console.error("❌ Failed to parse AI response as JSON", parseErr);
            console.error("Raw response:", jsonString);
            return null;
        }
    } catch (apiErr) {
        console.error("❌ OpenAI API error:", apiErr);
        return null;
    }
}

export async function parseResumeFile(file: File): Promise<any> {
    try {
        // Validate file size
        if (file.size === 0) {
            throw new Error("File is empty");
        }

        // Validate file buffer
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
            throw new Error("File buffer is empty");
        }

        const buffer = Buffer.from(arrayBuffer);
        console.log(`📦 File buffer size: ${buffer.length} bytes`);

        let text = "";

        if (file.type === "application/pdf") {
            console.log("📄 Processing PDF file...");
            text = await parsePdf(buffer);
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.name?.endsWith(".docx")
        ) {
            console.log("📝 Processing DOCX file...");
            text = await parseDocx(buffer);
        } else if (
            file.type === "application/msword" ||
            file.name?.endsWith(".doc")
        ) {
            throw new Error("DOC files are not supported. Please convert to DOCX or PDF format.");
        } else {
            throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
        }

        // Validate extracted text
        if (!text || text.trim().length === 0) {
            throw new Error("No text could be extracted from the file. Please ensure the file contains readable text.");
        }

        console.log("🤖 Sending text to AI for parsing...");
        const resumeJson = await parseResumeWithAI(text);

        if (!resumeJson) {
            throw new Error("Failed to parse resume with AI. Please try again or check if the file contains valid resume content.");
        }

        console.log("✅ AI parsing completed successfully");
        return resumeJson;
    } catch (error) {
        console.error("❌ Resume parsing error:", error);
        throw error;
    }
} 