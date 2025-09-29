export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  decision?: Decision;
  reasons?: string[];
}

export type Decision = "allow" | "redact" | "block" | "confirm";

export type Provider = "openai" | "ollama";

export interface PrecheckRequest {
  tool: string;
  scope: string;
  raw_text?: string;
  payload?: any;
  tags?: string[];
  corr_id?: string;
}

export interface PrecheckResponse {
  decision: Decision;
  content?: {
    messages?: Message[];
    [key: string]: any;
  };
  reasons?: string[];
  pii_findings?: any[];
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
  provider?: Provider;
}

export interface MCPRequest {
  tool: string;
  args: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  decision?: Decision;
  reasons?: string[];
}

export interface StreamEvent {
  type: "decision" | "content" | "error" | "done";
  data: any;
}
