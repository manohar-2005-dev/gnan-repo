import crypto from "node:crypto";
import { db } from "@workspace/db";
import { swiggyTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const SWIGGY_OAUTH_BASE = "https://mcp.swiggy.com/auth";
const DEFAULT_REDIRECT_URI = process.env.SWIGGY_OAUTH_REDIRECT_URI || "http://localhost:5173/auth/callback/";

// In-memory store for pending PKCE verifiers keyed by state (short-lived)
const pendingOAuthStates = new Map<string, { codeVerifier: string; userId: number; createdAt: number }>();

// Cleanup stale states older than 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingOAuthStates.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      pendingOAuthStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

// Base64URL encoding without padding
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Generate PKCE pair
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

// Global cached dynamic client ID
let registeredClientId: string | null = null;

export async function getOrRegisterClientId(): Promise<string> {
  if (registeredClientId) {
    return registeredClientId;
  }

  try {
    const redirectUri = DEFAULT_REDIRECT_URI;
    logger.info({ redirectUri }, "Registering dynamic OAuth client with Swiggy...");

    const response = await fetch(`${SWIGGY_OAUTH_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "NutriFlow AI",
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, "Swiggy Dynamic Client Registration failed");
      throw new Error(`Swiggy client registration failed (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    registeredClientId = data.client_id;
    logger.info({ clientId: registeredClientId }, "Successfully registered Swiggy OAuth client");
    return registeredClientId!;
  } catch (err: any) {
    logger.error({ err: err.message }, "Error during Swiggy client registration");
    throw err;
  }
}

// Initiate OAuth flow
export async function startSwiggyOAuth(userId: number): Promise<{ authorizeUrl: string; state: string }> {
  const clientId = await getOrRegisterClientId();
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = base64UrlEncode(crypto.randomBytes(16));

  pendingOAuthStates.set(state, {
    codeVerifier,
    userId,
    createdAt: Date.now(),
  });

  const redirectUri = DEFAULT_REDIRECT_URI;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "mcp:tools",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state,
  });

  const authorizeUrl = `${SWIGGY_OAUTH_BASE}/authorize?${params.toString()}`;
  return { authorizeUrl, state };
}

// Handle OAuth callback code exchange
export async function handleSwiggyOAuthCallback(code: string, state: string): Promise<{ userId: number; token: any }> {
  const pending = pendingOAuthStates.get(state);
  if (!pending) {
    throw new Error("Invalid or expired OAuth state parameter");
  }

  pendingOAuthStates.delete(state);
  const clientId = await getOrRegisterClientId();
  const redirectUri = DEFAULT_REDIRECT_URI;

  logger.info({ state, userId: pending.userId }, "Exchanging Swiggy auth code for token...");

  const response = await fetch(`${SWIGGY_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: code,
      code_verifier: pending.codeVerifier,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "Swiggy token exchange failed");
    throw new Error(`Swiggy token exchange failed (${response.status}): ${errorText}`);
  }

  const tokenData: any = await response.json();
  const accessToken = tokenData.access_token;
  const tokenType = tokenData.token_type || "Bearer";
  const scope = tokenData.scope || "mcp:tools";
  const expiresIn = tokenData.expires_in || (5 * 24 * 60 * 60); // Default 5 days per docs
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Store in database
  await saveSwiggyToken(pending.userId, accessToken, tokenType, scope, expiresAt, clientId);

  return { userId: pending.userId, token: tokenData };
}

// DB Helpers
export async function saveSwiggyToken(
  userId: number,
  accessToken: string,
  tokenType: string,
  scope: string,
  expiresAt: Date,
  swiggyClientId: string
) {
  try {
    const existing = await db.select().from(swiggyTokensTable).where(eq(swiggyTokensTable.userId, userId)).limit(1);

    if (existing.length > 0) {
      await db.update(swiggyTokensTable)
        .set({
          accessToken,
          tokenType,
          scope,
          expiresAt,
          swiggyClientId,
          updatedAt: new Date(),
        })
        .where(eq(swiggyTokensTable.userId, userId));
    } else {
      await db.insert(swiggyTokensTable).values({
        userId,
        accessToken,
        tokenType,
        scope,
        expiresAt,
        swiggyClientId,
      });
    }
  } catch (err: any) {
    logger.error({ err: err.message, userId }, "Failed to save Swiggy token to database");
    throw err;
  }
}

export async function getSwiggyToken(userId: number) {
  try {
    const tokens = await db.select().from(swiggyTokensTable).where(eq(swiggyTokensTable.userId, userId)).limit(1);
    if (tokens.length === 0) return null;
    const token = tokens[0];

    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) {
      logger.info({ userId }, "Swiggy token expired");
      return null;
    }

    return token;
  } catch (err: any) {
    logger.error({ err: err.message, userId }, "Failed to fetch Swiggy token from database");
    return null;
  }
}

export async function deleteSwiggyToken(userId: number) {
  try {
    const token = await getSwiggyToken(userId);
    if (token) {
      try {
        await fetch(`${SWIGGY_OAUTH_BASE}/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
        });
      } catch (logoutErr: any) {
        logger.warn({ err: logoutErr.message }, "Swiggy OAuth logout request failed (proceeding with local deletion)");
      }
    }

    await db.delete(swiggyTokensTable).where(eq(swiggyTokensTable.userId, userId));
    logger.info({ userId }, "Deleted Swiggy token for user");
  } catch (err: any) {
    logger.error({ err: err.message, userId }, "Failed to delete Swiggy token from database");
    throw err;
  }
}
