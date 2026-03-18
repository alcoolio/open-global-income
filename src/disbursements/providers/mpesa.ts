import { randomUUID } from 'node:crypto';
import type { Disbursement } from '../../core/types.js';
import type { DisbursementProvider, DisbursementResult, DisbursementProviderStatus } from '../types.js';

/**
 * M-Pesa stub provider.
 *
 * Real M-Pesa integration requires Safaricom API credentials, compliance
 * approvals, and a Kenya-registered business shortcode. This stub:
 * - Documents and validates the required config fields
 * - Logs what would be sent to Safaricom's B2C API
 * - Returns a mock transaction ID so the full pipeline can be tested
 *
 * Required config: appKey, appSecret, shortcode, environment
 */
export const mpesaStubProvider: DisbursementProvider = {
  providerId: 'safaricom',
  providerName: 'M-Pesa (Stub)',
  supportedCurrencies: ['KES'],

  async validateConfig(config: Record<string, unknown>) {
    const required = ['appKey', 'appSecret', 'shortcode', 'environment'] as const;
    for (const field of required) {
      if (typeof config[field] !== 'string' || !(config[field] as string).trim()) {
        return { valid: false, error: `'${field}' must be a non-empty string` };
      }
    }
    const env = config.environment as string;
    if (env !== 'sandbox' && env !== 'production') {
      return {
        valid: false,
        error: "'environment' must be 'sandbox' or 'production'",
      };
    }
    return { valid: true };
  },

  async submit(disbursement: Disbursement): Promise<DisbursementResult> {
    const externalId = `mpesa-mock-${randomUUID()}`;

    // Log what would be sent to Safaricom B2C API
    console.log('[M-Pesa stub] Would submit B2C payment:', {
      disbursementId: disbursement.id,
      countryCode: disbursement.countryCode,
      recipientCount: disbursement.recipientCount,
      amountPerRecipient: disbursement.amountPerRecipient,
      totalAmount: disbursement.totalAmount,
      currency: disbursement.currency,
      externalId,
    });

    return {
      externalId,
      status: 'pending',
      payload: {
        mock: true,
        note: 'M-Pesa stub — no real transaction submitted. Replace with live Safaricom B2C integration.',
        mockTransactionId: externalId,
        wouldSend: {
          recipientCount: disbursement.recipientCount,
          amountPerRecipient: disbursement.amountPerRecipient,
          totalAmount: disbursement.totalAmount,
          currency: disbursement.currency,
        },
      },
    };
  },

  async checkStatus(externalId: string): Promise<DisbursementProviderStatus> {
    return {
      externalId,
      status: 'pending',
      details: {
        mock: true,
        note: 'M-Pesa stub — status always returns pending. Real status checks require Safaricom API.',
      },
    };
  },
};
