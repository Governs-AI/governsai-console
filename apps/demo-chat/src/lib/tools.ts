import { Tool } from './types';

// Define available tools for AI function calling
export const AVAILABLE_TOOLS: Tool[] = [
  // Weather Tools
  {
    type: "function",
    function: {
      name: "weather_current",
      description: "Get current weather conditions using latitude and longitude coordinates",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "Latitude coordinate (e.g., 37.7749 for San Francisco)"
          },
          longitude: {
            type: "number", 
            description: "Longitude coordinate (e.g., -122.4194 for San Francisco)"
          },
          location_name: {
            type: "string",
            description: "Human-readable location name (optional)"
          }
        },
        required: ["latitude", "longitude"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "weather_forecast",
      description: "Get weather forecast for multiple days using coordinates",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "Latitude coordinate"
          },
          longitude: {
            type: "number",
            description: "Longitude coordinate"
          },
          location_name: {
            type: "string",
            description: "Human-readable location name (optional)"
          },
          days: {
            type: "number",
            description: "Number of forecast days (1-7, default: 3)"
          }
        },
        required: ["latitude", "longitude"]
      }
    }
  },

  // Payment Tools
  {
    type: "function",
    function: {
      name: "payment_process",
      description: "Process a payment transaction (requires confirmation)",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "string",
            description: "Payment amount as string (e.g., '99.99')"
          },
          currency: {
            type: "string",
            description: "Currency code (default: 'USD')"
          },
          description: {
            type: "string",
            description: "Payment description"
          },
          method: {
            type: "string",
            description: "Payment method (default: 'credit_card')"
          }
        },
        required: ["amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "payment_refund",
      description: "Process a refund for a transaction",
      parameters: {
        type: "object",
        properties: {
          transaction_id: {
            type: "string",
            description: "Original transaction ID"
          },
          amount: {
            type: "string",
            description: "Refund amount as string"
          },
          reason: {
            type: "string",
            description: "Refund reason"
          }
        },
        required: ["transaction_id", "amount"]
      }
    }
  },

  // Database Tools
  {
    type: "function",
    function: {
      name: "db_query",
      description: "Execute database queries on mock tables (users, orders, products)",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "SQL query to execute"
          },
          table: {
            type: "string",
            description: "Table name (users, orders, products)"
          }
        },
        required: ["query"]
      }
    }
  },

  // File Operations
  {
    type: "function",
    function: {
      name: "file_read",
      description: "Read contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to read"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "file_write",
      description: "Write content to a file",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to write to"
          },
          content: {
            type: "string",
            description: "Content to write"
          },
          mode: {
            type: "string",
            description: "Write mode (default: 'w')"
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "file_list",
      description: "List files and directories",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path to list"
          }
        },
        required: ["path"]
      }
    }
  },

  // Web Tools
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information using Firecrawl API",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_scrape",
      description: "Scrape and extract content from webpages using Firecrawl API",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to scrape"
          },
          formats: {
            type: "array",
            items: { type: "string" },
            description: "Output formats (markdown, html)"
          }
        },
        required: ["url"]
      }
    }
  },

  // Email Tools
  {
    type: "function",
    function: {
      name: "email_send",
      description: "Send an email message (requires confirmation)",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject"
          },
          body: {
            type: "string",
            description: "Email body content"
          },
          from: {
            type: "string",
            description: "Sender email address (optional)"
          }
        },
        required: ["to", "subject", "body"]
      }
    }
  },

  // Calendar Tools
  {
    type: "function",
    function: {
      name: "calendar_create_event",
      description: "Create a calendar event",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title"
          },
          start_time: {
            type: "string",
            description: "Event start time (ISO string)"
          },
          end_time: {
            type: "string",
            description: "Event end time (ISO string)"
          },
          description: {
            type: "string",
            description: "Event description"
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "List of attendee email addresses"
          }
        },
        required: ["title"]
      }
    }
  },

  // Key-Value Store
  {
    type: "function",
    function: {
      name: "kv_get",
      description: "Get value from key-value store",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Key to retrieve"
          }
        },
        required: ["key"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "kv_set",
      description: "Set value in key-value store",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Key to set"
          },
          value: {
            type: "string",
            description: "Value to store"
          },
          ttl: {
            type: "number",
            description: "Time to live in seconds (default: 3600)"
          }
        },
        required: ["key", "value"]
      }
    }
  }
];

// Helper function to get tool by name
export function getToolByName(name: string): Tool | undefined {
  return AVAILABLE_TOOLS.find(tool => tool.function.name === name);
}

// Helper function to get all tool names
export function getAllToolNames(): string[] {
  return AVAILABLE_TOOLS.map(tool => tool.function.name);
}
