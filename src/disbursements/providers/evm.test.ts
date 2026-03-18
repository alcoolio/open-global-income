import { describe, it, expect } from 'vitest';
import { evmUsdcProvider } from './evm.js';
import type { Disbursement } from '../../core/types.js';

const mockDisbursement: Disbursement = {
  id: 'test-evm-456',
  simulationId: null,
  channelId: 'channel-evm',
  countryCode: 'NG',
  recipientCount: 50,
  amountPerRecipient: '105.50',
  totalAmount: '5275.00',
  currency: 'USDC',
  status: 'approved',
  createdAt: '2026-03-18T00:00:00.000Z',
  approvedAt: '2026-03-18T01:00:00.000Z',
  completedAt: null,
  apiKeyId: null,
};

describe('evmUsdcProvider', () => {
  it('has correct metadata', () => {
    expect(evmUsdcProvider.providerId).toBe('evm');
    expect(evmUsdcProvider.providerName).toBe('EVM USDC');
    expect(evmUsdcProvider.supportedCurrencies).toContain('USDC');
  });

  describe('validateConfig', () => {
    it('accepts valid config', async () => {
      const result = await evmUsdcProvider.validateConfig({
        chainId: 137,
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing chainId', async () => {
      const result = await evmUsdcProvider.validateConfig({
        tokenAddress: '0xabc',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/chainId/);
    });

    it('rejects non-integer chainId', async () => {
      const result = await evmUsdcProvider.validateConfig({
        chainId: 1.5,
        tokenAddress: '0xabc',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/chainId/);
    });

    it('rejects missing tokenAddress', async () => {
      const result = await evmUsdcProvider.validateConfig({ chainId: 1 });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/tokenAddress/);
    });

    it('rejects empty tokenAddress', async () => {
      const result = await evmUsdcProvider.validateConfig({
        chainId: 1,
        tokenAddress: '',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/tokenAddress/);
    });
  });

  describe('submit', () => {
    it('returns a submitted result with externalId', async () => {
      const result = await evmUsdcProvider.submit(mockDisbursement);
      expect(result.status).toBe('submitted');
      expect(typeof result.externalId).toBe('string');
    });

    it('includes EVM transaction payload', async () => {
      const result = await evmUsdcProvider.submit(mockDisbursement);
      const payload = result.payload.transactionPayload as Record<string, unknown>;
      expect(payload.type).toBe('evm_usdc_transfer');
      expect(payload.currency).toBe('USDC');
      expect(payload.recipientCount).toBe(50);
      expect(payload.disbursementId).toBe('test-evm-456');
    });

    it('includes correct USDC amounts', async () => {
      const result = await evmUsdcProvider.submit(mockDisbursement);
      const payload = result.payload.transactionPayload as Record<string, unknown>;
      const amountInfo = payload.amountPerRecipient as Record<string, unknown>;
      // 105.50 * 10^6 = 105_500_000
      expect(amountInfo.rawAmount).toBe('105500000');
      expect(amountInfo.symbol).toBe('USDC');
    });

    it('each call produces a unique externalId', async () => {
      const r1 = await evmUsdcProvider.submit(mockDisbursement);
      const r2 = await evmUsdcProvider.submit(mockDisbursement);
      expect(r1.externalId).not.toBe(r2.externalId);
    });
  });

  describe('checkStatus', () => {
    it('returns confirmed status', async () => {
      const status = await evmUsdcProvider.checkStatus('0xdeadbeef');
      expect(status.externalId).toBe('0xdeadbeef');
      expect(status.status).toBe('confirmed');
    });
  });
});
