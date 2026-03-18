import { describe, it, expect } from 'vitest';
import { mpesaStubProvider } from './mpesa.js';
import type { Disbursement } from '../../core/types.js';

const mockDisbursement: Disbursement = {
  id: 'test-mpesa-789',
  simulationId: null,
  channelId: 'channel-mpesa',
  countryCode: 'KE',
  recipientCount: 200,
  amountPerRecipient: '5000',
  totalAmount: '1000000',
  currency: 'KES',
  status: 'approved',
  createdAt: '2026-03-18T00:00:00.000Z',
  approvedAt: '2026-03-18T01:00:00.000Z',
  completedAt: null,
  apiKeyId: null,
};

describe('mpesaStubProvider', () => {
  it('has correct metadata', () => {
    expect(mpesaStubProvider.providerId).toBe('safaricom');
    expect(mpesaStubProvider.providerName).toBe('M-Pesa (Stub)');
    expect(mpesaStubProvider.supportedCurrencies).toContain('KES');
  });

  describe('validateConfig', () => {
    const validConfig = {
      appKey: 'myAppKey',
      appSecret: 'myAppSecret',
      shortcode: '600123',
      environment: 'sandbox',
    };

    it('accepts valid sandbox config', async () => {
      const result = await mpesaStubProvider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
    });

    it('accepts production environment', async () => {
      const result = await mpesaStubProvider.validateConfig({
        ...validConfig,
        environment: 'production',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing appKey', async () => {
      const { appKey: _, ...rest } = validConfig;
      const result = await mpesaStubProvider.validateConfig(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/appKey/);
    });

    it('rejects missing appSecret', async () => {
      const { appSecret: _, ...rest } = validConfig;
      const result = await mpesaStubProvider.validateConfig(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/appSecret/);
    });

    it('rejects missing shortcode', async () => {
      const { shortcode: _, ...rest } = validConfig;
      const result = await mpesaStubProvider.validateConfig(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/shortcode/);
    });

    it('rejects invalid environment', async () => {
      const result = await mpesaStubProvider.validateConfig({
        ...validConfig,
        environment: 'staging',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/environment/);
    });

    it('rejects empty string fields', async () => {
      const result = await mpesaStubProvider.validateConfig({
        ...validConfig,
        appKey: '',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('submit', () => {
    it('returns a pending result with mock externalId', async () => {
      const result = await mpesaStubProvider.submit(mockDisbursement);
      expect(result.status).toBe('pending');
      expect(result.externalId).toMatch(/^mpesa-mock-/);
    });

    it('marks payload as mock', async () => {
      const result = await mpesaStubProvider.submit(mockDisbursement);
      expect(result.payload.mock).toBe(true);
    });

    it('each call produces a unique externalId', async () => {
      const r1 = await mpesaStubProvider.submit(mockDisbursement);
      const r2 = await mpesaStubProvider.submit(mockDisbursement);
      expect(r1.externalId).not.toBe(r2.externalId);
    });

    it('includes wouldSend details in payload', async () => {
      const result = await mpesaStubProvider.submit(mockDisbursement);
      const wouldSend = result.payload.wouldSend as Record<string, unknown>;
      expect(wouldSend.recipientCount).toBe(200);
      expect(wouldSend.currency).toBe('KES');
    });
  });

  describe('checkStatus', () => {
    it('returns pending status', async () => {
      const status = await mpesaStubProvider.checkStatus('mpesa-mock-abc');
      expect(status.externalId).toBe('mpesa-mock-abc');
      expect(status.status).toBe('pending');
      expect(status.details.mock).toBe(true);
    });
  });
});
