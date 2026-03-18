import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { getTestDb, closeDb } from '../../db/database.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  getTestDb();
  app = buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  closeDb();
});

// ── Channel endpoints ─────────────────────────────────────────────────────────

describe('GET /v1/disbursements/channels', () => {
  it('returns empty channels list initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/disbursements/channels' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.channels)).toBe(true);
    expect(Array.isArray(body.data.providers)).toBe(true);
    expect(body.data.providers.length).toBeGreaterThanOrEqual(3);
  });

  it('lists available providers including solana, evm, safaricom', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/disbursements/channels' });
    const { providers } = res.json().data;
    const ids = providers.map((p: { providerId: string }) => p.providerId);
    expect(ids).toContain('solana');
    expect(ids).toContain('evm');
    expect(ids).toContain('safaricom');
  });
});

describe('POST /v1/disbursements/channels', () => {
  it('creates a Solana USDC channel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        name: 'Solana USDC Global',
        type: 'crypto',
        provider: 'solana',
        config: { rpcUrl: 'https://api.mainnet-beta.solana.com' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.provider).toBe('solana');
    expect(body.data.active).toBe(true);
  });

  it('creates an M-Pesa channel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        name: 'M-Pesa Kenya',
        type: 'mobile_money',
        provider: 'safaricom',
        countryCode: 'KE',
        config: {
          appKey: 'testKey',
          appSecret: 'testSecret',
          shortcode: '600123',
          environment: 'sandbox',
        },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.provider).toBe('safaricom');
    expect(body.data.countryCode).toBe('KE');
  });

  it('rejects missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        type: 'crypto',
        provider: 'solana',
        config: { rpcUrl: 'https://rpc.example.com' },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_PARAMETER');
  });

  it('rejects unknown provider', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        name: 'Test',
        type: 'crypto',
        provider: 'unknown_provider',
        config: {},
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('UNKNOWN_PROVIDER');
  });

  it('rejects invalid provider config', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        name: 'Bad EVM Channel',
        type: 'crypto',
        provider: 'evm',
        config: { chainId: 'not-a-number' }, // missing tokenAddress, wrong chainId type
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_CONFIG');
  });

  it('rejects invalid channel type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        name: 'Test',
        type: 'invalid_type',
        provider: 'solana',
        config: {},
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PARAMETER');
  });
});

// ── Full lifecycle ─────────────────────────────────────────────────────────────

describe('Disbursement lifecycle (draft → approved → submitted → completed)', () => {
  let channelId: string;
  let disbursementId: string;

  it('creates a Solana channel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/channels',
      payload: {
        name: 'Lifecycle Test Channel',
        type: 'crypto',
        provider: 'solana',
        config: { rpcUrl: 'https://api.devnet.solana.com' },
      },
    });
    expect(res.statusCode).toBe(201);
    channelId = res.json().data.id;
  });

  it('POST /v1/disbursements — creates a draft disbursement', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements',
      payload: {
        channelId,
        countryCode: 'KE',
        recipientCount: 500,
        amountPerRecipient: '210.00',
        totalAmount: '105000.00',
        currency: 'USDC',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('draft');
    expect(body.data.recipientCount).toBe(500);
    disbursementId = body.data.id;
  });

  it('GET /v1/disbursements/:id — returns disbursement with log', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/disbursements/${disbursementId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.disbursement.id).toBe(disbursementId);
    expect(body.data.log.length).toBe(1);
    expect(body.data.log[0].event).toBe('created');
  });

  it('POST /v1/disbursements/:id/approve — approves the disbursement', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/disbursements/${disbursementId}/approve`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('approved');
    expect(body.data.approvedAt).toBeTruthy();
  });

  it('cannot approve again (status != draft)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/disbursements/${disbursementId}/approve`,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('INVALID_TRANSITION');
  });

  it('POST /v1/disbursements/:id/submit — submits to provider and completes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/disbursements/${disbursementId}/submit`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.disbursement.status).toBe('completed');
    expect(body.data.disbursement.completedAt).toBeTruthy();
    expect(body.data.result.externalId).toBeTruthy();
    expect(body.data.result.payload.transactionPayload).toBeTruthy();
  });

  it('GET /v1/disbursements/:id — log has created, submitted, confirmed entries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/disbursements/${disbursementId}`,
    });
    const { log } = res.json().data;
    const events = log.map((e: { event: string }) => e.event);
    expect(events).toContain('created');
    expect(events).toContain('submitted');
    expect(events).toContain('confirmed');
  });

  it('cannot submit again (status != approved)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/disbursements/${disbursementId}/submit`,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('INVALID_TRANSITION');
  });
});

// ── List endpoint ──────────────────────────────────────────────────────────────

describe('GET /v1/disbursements', () => {
  it('returns paginated list', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/disbursements' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.disbursements)).toBe(true);
    expect(body.data.pagination).toBeDefined();
  });

  it('filters by status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/disbursements?status=completed',
    });
    expect(res.statusCode).toBe(200);
    const { disbursements } = res.json().data;
    disbursements.forEach((d: { status: string }) => {
      expect(d.status).toBe('completed');
    });
  });

  it('rejects invalid status filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/disbursements?status=bogus',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PARAMETER');
  });
});

// ── Error cases ────────────────────────────────────────────────────────────────

describe('Error cases', () => {
  it('GET /v1/disbursements/:id — 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/disbursements/does-not-exist',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('POST /v1/disbursements — 404 for unknown channelId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements',
      payload: {
        channelId: 'no-such-channel',
        countryCode: 'DE',
        recipientCount: 10,
        amountPerRecipient: '100',
        totalAmount: '1000',
        currency: 'USDC',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /v1/disbursements — 400 for invalid recipientCount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements',
      payload: {
        channelId: 'any',
        countryCode: 'DE',
        recipientCount: -5,
        amountPerRecipient: '100',
        totalAmount: '1000',
        currency: 'USDC',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PARAMETER');
  });

  it('POST /v1/disbursements/:id/approve — 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/unknown-id/approve',
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /v1/disbursements/:id/submit — 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/disbursements/unknown-id/submit',
    });
    expect(res.statusCode).toBe(404);
  });
});
