import { createHmac, randomUUID } from 'node:crypto';
import type { WebhookEvent, WebhookSubscription, WebhookPayload, WebhookDelivery } from './types.js';

/** In-memory webhook store (migrates to SQLite/PG in production) */
const subscriptions = new Map<string, WebhookSubscription>();
const deliveryLog: WebhookDelivery[] = [];

/** Register a new webhook subscription */
export function registerWebhook(
  url: string,
  events: WebhookEvent[],
  apiKeyId?: string,
): WebhookSubscription {
  const subscription: WebhookSubscription = {
    id: randomUUID(),
    url,
    events,
    secret: randomUUID().replace(/-/g, ''),
    active: true,
    createdAt: new Date().toISOString(),
    apiKeyId,
  };
  subscriptions.set(subscription.id, subscription);
  return subscription;
}

/** Remove a webhook subscription */
export function removeWebhook(id: string): boolean {
  return subscriptions.delete(id);
}

/** List all active webhooks */
export function listWebhooks(): WebhookSubscription[] {
  return Array.from(subscriptions.values()).filter((w) => w.active);
}

/** Get recent deliveries */
export function getDeliveryLog(limit = 50): WebhookDelivery[] {
  return deliveryLog.slice(-limit);
}

/** Sign a webhook payload with HMAC-SHA256 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch an event to all matching webhook subscriptions.
 * Non-blocking — failures are logged but don't affect the caller.
 */
export async function dispatchEvent(
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const matching = Array.from(subscriptions.values()).filter(
    (w) => w.active && w.events.includes(event),
  );

  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    id: randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    matching.map(async (webhook) => {
      const signature = signPayload(body, webhook.secret);
      const delivery: WebhookDelivery = {
        webhookId: webhook.id,
        event,
        url: webhook.url,
        statusCode: null,
        success: false,
        deliveredAt: new Date().toISOString(),
      };

      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Event': event,
            'X-Webhook-Id': payload.id,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
        delivery.statusCode = res.status;
        delivery.success = res.ok;
      } catch (err) {
        delivery.error = err instanceof Error ? err.message : String(err);
      }

      deliveryLog.push(delivery);
    }),
  );
}

/** Clear all subscriptions (for testing) */
export function clearWebhooks(): void {
  subscriptions.clear();
  deliveryLog.length = 0;
}
