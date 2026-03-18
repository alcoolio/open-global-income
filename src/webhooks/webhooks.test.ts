import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerWebhook,
  removeWebhook,
  listWebhooks,
  signPayload,
  clearWebhooks,
} from './dispatcher.js';

beforeEach(() => {
  clearWebhooks();
});

describe('Webhook system', () => {
  it('registers a webhook subscription', () => {
    const webhook = registerWebhook('https://example.com/hook', ['user.created']);
    expect(webhook.id).toBeTruthy();
    expect(webhook.url).toBe('https://example.com/hook');
    expect(webhook.events).toEqual(['user.created']);
    expect(webhook.secret).toBeTruthy();
    expect(webhook.active).toBe(true);
  });

  it('lists active webhooks', () => {
    registerWebhook('https://a.com/hook', ['user.created']);
    registerWebhook('https://b.com/hook', ['entitlement.calculated']);
    expect(listWebhooks()).toHaveLength(2);
  });

  it('removes a webhook', () => {
    const webhook = registerWebhook('https://example.com/hook', ['user.created']);
    expect(removeWebhook(webhook.id)).toBe(true);
    expect(listWebhooks()).toHaveLength(0);
  });

  it('signs payloads with HMAC-SHA256', () => {
    const sig1 = signPayload('test-payload', 'secret');
    const sig2 = signPayload('test-payload', 'secret');
    const sig3 = signPayload('different', 'secret');
    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sig3);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('registers webhook with multiple events', () => {
    const webhook = registerWebhook('https://example.com/hook', [
      'user.created',
      'entitlement.calculated',
      'data.updated',
    ]);
    expect(webhook.events).toHaveLength(3);
  });
});
