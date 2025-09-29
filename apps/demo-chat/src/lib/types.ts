export interface Message {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  decision?: Decision;
  reasons?: string[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export type Decision = "allow" | "redact" | "block" | "confirm";

// Type guard function to check if a string is a valid Decision
export function isValidDecision(value: any): value is Decision {
  return typeof value === 'string' && 
         ['allow', 'redact', 'block', 'confirm'].includes(value);
}

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

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface StreamEvent {
  type: "decision" | "content" | "error" | "done" | "tool_call" | "tool_result";
  data: any;
}
