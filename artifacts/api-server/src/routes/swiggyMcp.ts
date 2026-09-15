import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  startSwiggyOAuth,
  handleSwiggyOAuthCallback,
  getSwiggyToken,
  deleteSwiggyToken,
} from "../lib/swiggyOAuth";
import {
  listSwiggyMcpTools,
  callSwiggyMcpTool,
  type SwiggyMcpServer,
} from "../lib/swiggyMcpClient";
import { logger } from "../lib/logger";

const router = Router();

// 1. Initiate Swiggy OAuth 2.1 flow with PKCE
router.get("/swiggy/auth/start", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { authorizeUrl, state } = await startSwiggyOAuth(userId);
    res.json({ authorizeUrl, state });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error starting Swiggy OAuth flow");
    res.status(500).json({ error: "Failed to initiate Swiggy authentication", details: err.message });
  }
});

// 2. Handle Swiggy OAuth callback & token exchange
router.post("/swiggy/auth/callback", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.body || {};
  if (!code || !state) {
    res.status(400).json({ error: "Missing authorization code or state parameter" });
    return;
  }

  try {
    const result = await handleSwiggyOAuthCallback(code, state);
    logger.info({ userId: result.userId }, "Successfully connected Swiggy account");
    res.json({ status: "connected", userId: result.userId });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error exchanging Swiggy authorization code");
    res.status(400).json({ error: "Failed to exchange Swiggy authorization code", details: err.message });
  }
});

// GET query callback support (redirected from browser)
router.get("/swiggy/auth/callback", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = Array.isArray(req.query.code) ? (req.query.code[0] as string) : (req.query.code as string);
  const state = Array.isArray(req.query.state) ? (req.query.state[0] as string) : (req.query.state as string);

  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state query parameter" });
    return;
  }

  try {
    const result = await handleSwiggyOAuthCallback(code, state);
    logger.info({ userId: result.userId }, "Successfully connected Swiggy account via GET callback");
    res.json({ status: "connected", userId: result.userId });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error exchanging Swiggy authorization code");
    res.status(400).json({ error: "Failed to exchange Swiggy authorization code", details: err.message });
  }
});

// 3. Get Swiggy Connection Status
router.get("/swiggy/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const token = await getSwiggyToken(userId);

    if (!token) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      expiresAt: token.expiresAt,
      scope: token.scope,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error getting Swiggy connection status");
    res.status(500).json({ error: "Failed to check Swiggy status" });
  }
});

// 4. Disconnect Swiggy Account
router.post("/swiggy/disconnect", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await deleteSwiggyToken(userId);
    res.json({ status: "disconnected" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error disconnecting Swiggy account");
    res.status(500).json({ error: "Failed to disconnect Swiggy account" });
  }
});

// 5. Discover MCP Tools for a specific server (food, im, dineout)
router.get("/swiggy/tools/:server", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const server = (Array.isArray(req.params.server) ? req.params.server[0] : req.params.server) as SwiggyMcpServer;
  if (!["food", "im", "dineout"].includes(server)) {
    res.status(400).json({ error: "Invalid MCP server specified. Valid options: food, im, dineout" });
    return;
  }

  try {
    const userId = req.user!.id;
    const token = await getSwiggyToken(userId);

    if (!token) {
      res.status(401).json({ error: "Swiggy account not connected. Please connect your Swiggy account first." });
      return;
    }

    const tools = await listSwiggyMcpTools(server, token.accessToken);
    res.json({ server, tools });
  } catch (err: any) {
    logger.error({ err: err.message, server }, "Error discovering Swiggy MCP tools");
    res.status(500).json({ error: `Failed to discover tools for Swiggy ${server}`, details: err.message });
  }
});

// 6. Execute an MCP Tool on a specific server
router.post("/swiggy/tools/:server/:toolName", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const server = (Array.isArray(req.params.server) ? req.params.server[0] : req.params.server) as SwiggyMcpServer;
  const toolName = (Array.isArray(req.params.toolName) ? req.params.toolName[0] : req.params.toolName) as string;
  const toolArgs = req.body || {};

  if (!["food", "im", "dineout"].includes(server)) {
    res.status(400).json({ error: "Invalid MCP server specified. Valid options: food, im, dineout" });
    return;
  }

  try {
    const userId = req.user!.id;
    const token = await getSwiggyToken(userId);

    if (!token) {
      res.status(401).json({ error: "Swiggy account not connected. Please connect your Swiggy account first." });
      return;
    }

    const result = await callSwiggyMcpTool(server, toolName, toolArgs, token.accessToken);
    res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message, server, toolName }, "Error executing Swiggy MCP tool");
    res.status(500).json({ error: `Failed to execute tool ${toolName} on Swiggy ${server}`, details: err.message });
  }
});

export default router;
