import { logger } from "./logger";

export type SwiggyMcpServer = "food" | "im" | "dineout";

const SERVER_URLS: Record<SwiggyMcpServer, string> = {
  food: "https://mcp.swiggy.com/food",
  im: "https://mcp.swiggy.com/im",
  dineout: "https://mcp.swiggy.com/dineout",
};

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface McpToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
}

/**
 * Execute a JSON-RPC 2.0 request against a Swiggy Streamable HTTP MCP server
 */
async function sendMcpJsonRpc(
  server: SwiggyMcpServer,
  accessToken: string,
  method: string,
  params?: any
): Promise<any> {
  const url = SERVER_URLS[server];
  if (!url) {
    throw new Error(`Unknown Swiggy MCP server: ${server}`);
  }

  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params: params || {},
  };

  logger.info({ server, method, url }, "Executing Swiggy MCP JSON-RPC call");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, errorBody, server, method }, "Swiggy MCP server returned error");
    throw new Error(`Swiggy MCP server (${server}) error ${response.status}: ${errorBody}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body received from MCP stream");
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
    }

    const lines = accumulated.split("\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr) {
          try {
            const parsed: any = JSON.parse(jsonStr);
            if (parsed.error) {
              throw new Error(`MCP Error: ${parsed.error.message || JSON.stringify(parsed.error)}`);
            }
            return parsed.result;
          } catch (err: any) {
            // continue parsing
          }
        }
      }
    }

    throw new Error("Could not parse JSON-RPC response from event-stream");
  } else {
    const json: any = await response.json();
    if (json.error) {
      throw new Error(`MCP Error (${json.error.code}): ${json.error.message}`);
    }
    return json.result;
  }
}

/**
 * List tools from a Swiggy MCP server
 */
export async function listSwiggyMcpTools(
  server: SwiggyMcpServer,
  accessToken: string
): Promise<McpTool[]> {
  try {
    const result = await sendMcpJsonRpc(server, accessToken, "tools/list");
    return result?.tools || [];
  } catch (err: any) {
    logger.error({ err: err.message, server }, "Failed to list Swiggy MCP tools");
    throw err;
  }
}

/**
 * Call a specific tool on a Swiggy MCP server
 */
export async function callSwiggyMcpTool(
  server: SwiggyMcpServer,
  toolName: string,
  toolArgs: Record<string, any>,
  accessToken: string
): Promise<McpToolCallResult> {
  try {
    logger.info({ server, toolName, toolArgs }, "Calling Swiggy MCP tool");
    const result = await sendMcpJsonRpc(server, accessToken, "tools/call", {
      name: toolName,
      arguments: toolArgs || {},
    });
    return result as McpToolCallResult;
  } catch (err: any) {
    logger.error({ err: err.message, server, toolName }, "Failed to call Swiggy MCP tool");
    throw err;
  }
}
