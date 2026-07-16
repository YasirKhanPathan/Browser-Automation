import crypto from "crypto";
import { prisma } from "../index";

export interface WebhookPayload {
  event: "completed" | "failed" | "changed";
  taskId: string;
  taskName: string;
  data: any;
  timestamp: string;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function fireWebhook(webhookId: string, payload: WebhookPayload): Promise<boolean> {
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!webhook || !webhook.enabled) return false;

  try {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "BrowserBot-Webhook/1.0",
      "X-Webhook-Event": payload.event,
      "X-Webhook-Task": payload.taskId,
    };

    if (webhook.secret) {
      headers["X-Webhook-Signature"] = `sha256=${signPayload(body, webhook.secret)}`;
    }

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    await prisma.webhook.update({
      where: { id: webhookId },
      data: { lastFired: new Date() },
    });

    console.log(`[Webhook] Fired to ${webhook.url}: ${response.status}`);
    return response.ok;
  } catch (error: any) {
    console.error(`[Webhook] Failed to fire to ${webhook.url}:`, error.message);
    return false;
  }
}

// Overload: fire directly with webhook data (avoids redundant DB query)
export async function fireWebhookDirect(webhook: { id: string; url: string; secret: string | null; events: string[]; enabled: boolean }, payload: WebhookPayload): Promise<boolean> {
  if (!webhook.enabled) return false;

  try {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "BrowserBot-Webhook/1.0",
      "X-Webhook-Event": payload.event,
      "X-Webhook-Task": payload.taskId,
    };

    if (webhook.secret) {
      headers["X-Webhook-Signature"] = `sha256=${signPayload(body, webhook.secret)}`;
    }

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastFired: new Date() },
    });

    console.log(`[Webhook] Fired to ${webhook.url}: ${response.status}`);
    return response.ok;
  } catch (error: any) {
    console.error(`[Webhook] Failed to fire to ${webhook.url}:`, error.message);
    return false;
  }
}

export async function fireWebhooksForTask(
  taskId: string,
  event: "completed" | "failed" | "changed",
  data: any
) {
  const webhooks = await prisma.webhook.findMany({
    where: { taskId, enabled: true },
  });

  const task = await prisma.task.findUnique({ where: { id: taskId } });

  const payload: WebhookPayload = {
    event,
    taskId,
    taskName: task?.name || "Unknown",
    data,
    timestamp: new Date().toISOString(),
  };

  // Fire all matching webhooks in parallel (with concurrency limit)
  const matching = webhooks.filter((w) => w.events.includes(event));
  const BATCH_SIZE = 5;
  for (let i = 0; i < matching.length; i += BATCH_SIZE) {
    const batch = matching.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((webhook) => fireWebhookDirect(webhook, payload))
    );
  }
}
