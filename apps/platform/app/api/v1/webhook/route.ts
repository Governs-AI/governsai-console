import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from '@governs-ai/db';
const dbAny = prisma as any;
import { unifiedContext } from '@/lib/services/unified-context';

if (!process.env.WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET environment variable is required');
}
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(raw: string, header: string | null) {
  if (!header) return false;
  
  // header: v1,t=TIMESTAMP,s=HEX
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  
  // Check for v1 version and required parts
  if (!header.startsWith("v1,") || !parts["t"] || !parts["s"]) return false;

  const msg = `${parts["t"]}.${raw}`;
  const h = crypto.createHmac("sha256", WEBHOOK_SECRET).update(msg).digest("hex");
  
  // Ensure both signatures are the same length for timingSafeEqual
  const expectedBuffer = Buffer.from(h, 'hex');
  const providedBuffer = Buffer.from(parts["s"], 'hex');
  
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text(); // IMPORTANT: raw body
    const sig = req.headers.get("x-governs-signature");

    if (!verifySignature(raw, sig)) {
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }

    // Parse the webhook event
    const event = JSON.parse(raw);

    // Log the event for debugging
    console.log("[governs:webhook]", event);

    // Process different types of webhook events
    if (event.type === "decision") {
      await handleDecisionEvent(event);
    } else if (event.type === "usage") {
      await handleUsageEvent(event);
    } else if (event.type === "policy") {
      await handlePolicyEvent(event);
    } else if (event.type === "context.save") {
      const result = await handleContextSaveEvent(event);
      return NextResponse.json(result);
    } else {
      console.log("[governs:webhook] Unknown event type:", event.type);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[governs:webhook] Error processing webhook:", error);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

async function handleDecisionEvent(event: any) {
  try {
    // Store decision event in the database
    await prisma.decision.create({
      data: {
        orgId: event.orgId || "default-org",
        direction: event.direction || "unknown",
        decision: event.decision || "unknown",
        tool: event.tool || null,
        scope: event.scope || null,
        detectorSummary: event.detectorSummary || {},
        payloadHash: event.payloadHash || "",
        latencyMs: event.latencyMs || null,
        correlationId: event.correlationId || null,
        tags: event.tags || [],
        ts: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });
    console.log("[governs:webhook] Decision event stored successfully");
  } catch (error) {
    console.error("[governs:webhook] Error storing decision event:", error);
    throw error;
  }
}

async function handleUsageEvent(event: any) {
  try {
    // Store usage event in the database (align with schema)
    await prisma.usageRecord.create({
      data: {
        userId: event.userId || "unknown",
        orgId: event.orgId || "unknown",
        provider: event.provider || "unknown",
        model: event.model || "unknown",
        inputTokens: event.inputTokens ?? event.promptTokens ?? 0,
        outputTokens: event.outputTokens ?? event.completionTokens ?? 0,
        cost: event.cost ?? 0,
        costType: event.costType || 'external',
        tool: event.tool || null,
        correlationId: event.correlationId || null,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        metadata: event.metadata || {},
        apiKeyId: event.apiKeyId || null,
        providerId: event.providerId || null,
      },
    });
    console.log("[governs:webhook] Usage event stored successfully");
  } catch (error) {
    console.error("[governs:webhook] Error storing usage event:", error);
    throw error;
  }
}

async function handlePolicyEvent(event: any) {
  try {
    // Store policy event in the database (align with schema)
    await prisma.policy.create({
      data: {
        orgId: event.orgId || "default-org",
        userId: event.userId || null,
        name: event.name || "Unknown Policy",
        description: event.description || "",
        version: event.version || 'v1',
        defaults: event.defaults || {},
        toolAccess: event.toolAccess || {},
        denyTools: event.denyTools || [],
        allowTools: event.allowTools || [],
        networkScopes: event.networkScopes || [],
        networkTools: event.networkTools || [],
        onError: event.onError || 'block',
        isActive: event.isActive !== false,
        priority: typeof event.priority === 'number' ? event.priority : 0,
      },
    });
    console.log("[governs:webhook] Policy event stored successfully");
  } catch (error) {
    console.error("[governs:webhook] Error storing policy event:", error);
    throw error;
  }
}

async function handleContextSaveEvent(event: any) {
  try {
    const { data, apiKey } = event;

    // Resolve userId and orgId from apiKey
    const { userId, orgId } = await resolveApiKey(apiKey);

    if (!userId || !orgId) {
      console.error("[governs:webhook] Failed to resolve userId/orgId from apiKey");
      return { ok: false, error: "invalid_api_key" };
    }

    // Check precheck decision if provided
    const precheckRef = data.precheckRef;
    if (precheckRef && (precheckRef.decision === 'deny' || precheckRef.decision === 'block')) {
      console.log("[governs:webhook] Context save blocked by precheck:", precheckRef.reasons);
      return { ok: false, error: "blocked_by_precheck", reasons: precheckRef.reasons };
    }

    // Use redacted content if available, otherwise use original
    const contentToStore = precheckRef?.redactedContent || data.content;

    // Check for duplicate by correlationId (idempotency)
    if (data.correlationId) {
      const existing = await dbAny.contextMemory.findFirst({
        where: { correlationId: data.correlationId },
        select: { id: true },
      });
      if (existing) {
        console.log("[governs:webhook] Duplicate context.save ignored (correlationId):", data.correlationId);
        return { ok: true, contextId: existing.id, duplicate: true };
      }
    }

    // Store context using unified context service
    const contextId = await unifiedContext.storeContext({
      userId,
      orgId,
      content: contentToStore,
      contentType: data.contentType || 'user_message',
      agentId: data.agentId || 'unknown',
      agentName: data.agentName,
      conversationId: data.conversationId,
      correlationId: data.correlationId,
      metadata: {
        ...data.metadata,
        precheckRef: precheckRef || undefined,
      },
      precheckRef: precheckRef || undefined,
      skipPrecheck: true,
      scope: data.scope || 'user',
      visibility: data.visibility || 'private',
    });

    console.log("[governs:webhook] Context saved successfully:", contextId);
    return { ok: true, contextId };
  } catch (error: any) {
    console.error("[governs:webhook] Error storing context:", error);
    return { ok: false, error: error.message || "internal_error" };
  }
}

async function resolveApiKey(apiKey: string): Promise<{ userId: string; orgId: string }> {
  // Find API key in database (model name is APIKey → client property aPIKey)
  const apiKeyRecord = await prisma.aPIKey.findFirst({
    where: {
      key: apiKey,
      isActive: true,
    },
    select: {
      userId: true,
      orgId: true,
    },
  });

  if (!apiKeyRecord) {
    throw new Error("Invalid or inactive API key");
  }

  return {
    userId: apiKeyRecord.userId,
    orgId: apiKeyRecord.orgId,
  };
}

export const config = {
  api: { bodyParser: false }, // ensure raw body in pages router; not needed in app router
};
