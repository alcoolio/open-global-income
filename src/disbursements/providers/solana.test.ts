import { describe, it, expect } from 'vitest';
import { solanaUsdcProvider } from './solana.js';
import type { Disbursement } from '../../core/types.js';

const mockDisbursement: Disbursement = {
  id: 'test-id-123',
  simulationId: null,
  channelId: 'channel-abc',
  countryCode: 'DE',
  recipientCount: 100,
  amountPerRecipient: '210.00',
  totalAmount: '21000.00',
  currency: 'USDC',
  status: 'approved',
  createdAt: '2026-03-18T00:00:00.000Z',
  approvedAt: '2026-03-18T01:00:00.000Z',
  completedAt: null,
  apiKeyId: null,
};

describe('solanaUsdcProvider', () => {
  it('has correct metadata', () => {
    expect(solanaUsdcProvider.providerId).toBe('solana');
    expect(solanaUsdcProvider.providerName).toBe('Solana USDC');
    expect(solanaUsdcProvider.supportedCurrencies).toContain('USDC');
  });

  describe('validateConfig', () => {
    it('accepts valid config with rpcUrl', async () => {
      const result = await solanaUsdcProvider.validateConfig({
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects missing rpcUrl', async () => {
      const result = await solanaUsdcProvider.validateConfig({});
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/rpcUrl/);
    });

    it('rejects empty rpcUrl', async () => {
      const result = await solanaUsdcProvider.validateConfig({ rpcUrl: '   ' });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/rpcUrl/);
    });

    it('rejects non-string rpcUrl', async () => {
      const result = await solanaUsdcProvider.validateConfig({ rpcUrl: 42 });
      expect(result.valid).toBe(false);
    });
  });

  describe('submit', () => {
    it('returns a submitted result with externalId', async () => {
      const result = await solanaUsdcProvider.submit(mockDisbursement);
      expect(result.status).toBe('submitted');
      expect(typeof result.externalId).toBe('string');
      expect(result.externalId.length).toBeGreaterThan(0);
    });

    it('includes transaction payload with USDC amount', async () => {
      const result = await solanaUsdcProvider.submit(mockDisbursement);
      const payload = result.payload.transactionPayload as Record<string, unknown>;
      expect(payload.type).toBe('solana_usdc_transfer');
      expect(payload.currency).toBe('USDC');
      expect(payload.recipientCount).toBe(100);
      expect(payload.disbursementId).toBe('test-id-123');
    });

    it('computes correct raw USDC amount (210 USDC = 210_000_000 base units)', async () => {
      const result = await solanaUsdcProvider.submit(mockDisbursement);
      const payload = result.payload.transactionPayload as Record<string, unknown>;
      const amountInfo = payload.amountPerRecipient as Record<string, unknown>;
      expect(amountInfo.rawAmount).toBe('210000000'); // 210 * 10^6
      expect(amountInfo.symbol).toBe('USDC');
    });

    it('each call produces a unique externalId', async () => {
      const r1 = await solanaUsdcProvider.submit(mockDisbursement);
      const r2 = await solanaUsdcProvider.submit(mockDisbursement);
      expect(r1.externalId).not.toBe(r2.externalId);
    });
  });

  describe('checkStatus', () => {
    it('returns confirmed status', async () => {
      const status = await solanaUsdcProvider.checkStatus('some-ext-id');
      expect(status.externalId).toBe('some-ext-id');
      expect(status.status).toBe('confirmed');
    });
  });
});
