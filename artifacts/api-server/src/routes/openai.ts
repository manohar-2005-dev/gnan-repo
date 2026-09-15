import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  GenerateOpenaiImageBody,
  GenerateOpenaiImageResponse,
} from "@workspace/api-zod";
import { eq, asc, and } from "drizzle-orm";
import { getGeminiModel, getFallbackResponse } from "../lib/gemini";
import { getSwiggyToken } from "../lib/swiggyOAuth";
import { callSwiggyMcpTool, listSwiggyMcpTools } from "../lib/swiggyMcpClient";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

const NUTRIFLOW_SYSTEM_PROMPT = `You are NutriFlow AI — a warm, knowledgeable AI wellness copilot with real Swiggy integration via MCP (Model Context Protocol).

You help users with:
- Healthy meal recommendations and nutrition guidance
- Personalized meal plans based on goals (muscle gain, weight loss, diabetes management, etc.)
- Swiggy Food ordering and healthy restaurant choices
- Swiggy Instamart grocery planning and healthy ingredient purchasing
- Swiggy Dineout healthy eating options
- Understanding nutrition labels, calories, macros, and micronutrients

Tone: Warm, encouraging, practical. Like a knowledgeable friend who is a nutritionist.

Response Format:
You MUST respond in valid JSON format.
Your JSON response must contain the following keys:
1. "text" (string, required): Your conversational response to the user. This is what the user sees first. Use warm, friendly language.
2. "recommendation" (object, optional): If the user asks for a meal recommendation, a suggestion, or a recipe, include this object with:
   - "mealTitle" (string)
   - "calories" (number)
   - "protein" (number)
   - "cuisine" (string)
   - "healthScore" (number)
   - "groceryItems" (array of strings)
   - "reason" (string, explanation of why this fits their profile)
3. "wellnessInsight" (string, optional): A short (1 sentence) wellness insight, tip, or encouraging message.
4. "swiggyResults" (object, optional): If live Swiggy data was fetched via MCP, include:
   - "server" ("food" | "im" | "dineout")
   - "summary" (string)
   - "data" (any, raw structured results from Swiggy)
5. "groceryPlan" (array of objects, optional): If the user requests a grocery list or meal prep grocery plan, return a list of items:
   - "name" (string)
   - "category" (string, e.g. Vegetables, Fruits, Proteins, Grains, Dairy, Pantry, Snacks, Beverages)
   - "quantity" (string)
   - "unit" (string)
   - "nutritionNote" (string)

Always remind users to consult a healthcare professional for medical nutrition therapy in the "text" field if relevant.
Do not wrap your response in markdown code blocks. Output raw JSON only.`;

function getPlainTextContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      let text = parsed.text || "";
      if (parsed.recommendation) {
        text += `\n[Recommendation: ${parsed.recommendation.mealTitle} - ${parsed.recommendation.calories} kcal, ${parsed.recommendation.protein}g protein]`;
      }
      return text;
    }
  } catch {
    // Not JSON
  }
  return content;
}

router.get("/openai/conversations", requireAuth, async (req, res): Promise<void> => {
  const convs = await db.select().from(conversations).where(eq(conversations.userId, req.user!.id));
  res.json(convs);
});

router.post("/openai/conversations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db.insert(conversations).values({ title: parsed.data.title, userId: req.user!.id }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
  );
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));

  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
  );
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(messages).where(eq(messages.conversationId, params.data.id));
  await db.delete(conversations).where(eq(conversations.id, params.data.id));
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
  );
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.user!.id;
  const userContent = body.data.content;
  const hasHistoryInBody = req.body.history && Array.isArray(req.body.history);

  // Check if user has connected Swiggy token
  const swiggyToken = await getSwiggyToken(userId);
  let mcpContextInfo = "";

  if (swiggyToken) {
    mcpContextInfo = "\n\n[USER IS AUTHENTICATED WITH SWIGGY MCP: You have permission to access real Swiggy Food, Instamart, and Dineout data when relevant to their prompt.]";

    // Auto-fetch Swiggy MCP data if prompt mentions swiggy, food, order, restaurant, grocery, instamart, dineout
    const lowerPrompt = userContent.toLowerCase();
    const isFoodQuery = lowerPrompt.includes("swiggy") || lowerPrompt.includes("food") || lowerPrompt.includes("restaurant") || lowerPrompt.includes("order") || lowerPrompt.includes("dish");
    const isGroceryQuery = lowerPrompt.includes("instamart") || lowerPrompt.includes("grocery") || lowerPrompt.includes("ingredient") || lowerPrompt.includes("buy");

    if (isFoodQuery) {
      try {
        const addresses = await callSwiggyMcpTool("food", "get_addresses", {}, swiggyToken.accessToken);
        mcpContextInfo += `\n[User Swiggy Delivery Addresses: ${JSON.stringify(addresses)}]`;
      } catch (err: any) {
        logger.warn({ err: err.message }, "Swiggy MCP auto-fetch address failed");
      }
    }
  } else {
    mcpContextInfo = "\n\n[USER HAS NOT CONNECTED SWIGGY YET: If they ask about Swiggy food ordering or Instamart, warmly encourage them to link their Swiggy account in Profile.]";
  }

  let contents = [];

  if (hasHistoryInBody) {
    contents = req.body.history.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" as const : "user" as const,
      parts: [{ text: m.role === "assistant" || m.role === "model" ? getPlainTextContent(m.content) : m.content }]
    }));
    
    contents.push({
      role: "user" as const,
      parts: [{ text: userContent + mcpContextInfo }]
    });
  } else {
    const [conv] = await db.select().from(conversations).where(
      and(eq(conversations.id, params.data.id), eq(conversations.userId, userId))
    );
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(messages).values({
      conversationId: params.data.id,
      role: "user",
      content: userContent,
    });

    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    contents = history.map((m, idx) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: (m.role === "assistant" ? getPlainTextContent(m.content) : m.content) + (idx === history.length - 1 ? mcpContextInfo : "") }]
    }));
  }

  // Set SSE headers BEFORE any streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";
  let usedFallback = false;

  try {
    const model = getGeminiModel(NUTRIFLOW_SYSTEM_PROMPT, false);
    const resultStream = await model.generateContentStream({ contents });

    for await (const chunk of resultStream.stream) {
      const content = chunk.text();
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  } catch (geminiError: any) {
    usedFallback = true;
    fullResponse = getFallbackResponse(userContent);

    const chunkSize = 30;
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      const content = fullResponse.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ content, fallback: true })}\n\n`);
      await new Promise(r => setTimeout(r, 20));
    }
  }

  try {
    if (!hasHistoryInBody) {
      await db.insert(messages).values({
        conversationId: params.data.id,
        role: "assistant",
        content: fullResponse,
      });
    }
  } catch (dbError) {
    logger.error({ err: dbError }, "Failed to save assistant message to DB");
  }

  res.write(`data: ${JSON.stringify({ done: true, fallback: usedFallback })}\n\n`);
  res.end();
});

router.post("/openai/generate-image", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateOpenaiImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const dummySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#ECFDF5" />
      <path d="M50 20 C20 40 20 80 50 80 C80 80 80 40 50 20 Z" fill="url(#g)" />
      <path d="M50 20 L50 80" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      <text x="50" y="90" font-family="sans-serif" font-size="6" fill="#065F46" text-anchor="middle" font-weight="bold">NutriFlow AI Image</text>
    </svg>
  `;
  const base64 = Buffer.from(dummySvg.trim()).toString("base64");
  res.json(GenerateOpenaiImageResponse.parse({ b64_json: base64 }));
});

export default router;
