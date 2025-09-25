import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from '@governs-ai/db';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "dev-secret-key-change-in-production";

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
    // Store usage event in the database
    await prisma.usageRecord.create({
      data: {
        userId: event.userId || "unknown",
        apiKeyId: event.apiKeyId || null,
        providerId: event.providerId || "unknown",
        model: event.model || "unknown",
        promptTokens: event.promptTokens || 0,
        completionTokens: event.completionTokens || 0,
        totalTokens: event.totalTokens || 0,
        cost: event.cost || 0,
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
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
    // Store policy event in the database
    await prisma.policy.create({
      data: {
        name: event.name || "Unknown Policy",
        description: event.description || "",
        toolAccessMatrix: event.toolAccessMatrix || {},
        orgId: event.orgId || "default-org",
        isActive: event.isActive !== false,
      },
    });
    console.log("[governs:webhook] Policy event stored successfully");
  } catch (error) {
    console.error("[governs:webhook] Error storing policy event:", error);
    throw error;
  }
}

export const config = {
  api: { bodyParser: false }, // ensure raw body in pages router; not needed in app router
};
