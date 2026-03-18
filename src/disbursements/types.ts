import type { Disbursement } from '../core/types.js';

/** Result returned by a provider after submitting a disbursement */
export interface DisbursementResult {
  /** Provider-assigned external ID for tracking (tx hash, request ID, etc.) */
  externalId: string;
  /** Immediate submission status */
  status: 'pending' | 'submitted';
  /** Provider-specific payload (unsigned tx data, mock receipt, calldata, etc.) */
  payload: Record<string, unknown>;
}

/** Status of a submitted disbursement as reported by the provider */
export interface DisbursementProviderStatus {
  externalId: string;
  status: 'pending' | 'confirmed' | 'failed';
  details: Record<string, unknown>;
}

/**
 * Interface all disbursement providers must implement.
 * The platform is non-custodial — providers prepare and report, never hold funds.
 */
export interface DisbursementProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly supportedCurrencies: string[];

  /** Validate that the channel config is correct before registering */
  validateConfig(config: Record<string, unknown>): Promise<{ valid: boolean; error?: string }>;

  /** Submit a disbursement for processing */
  submit(disbursement: Disbursement): Promise<DisbursementResult>;

  /** Check the status of a previously submitted disbursement */
  checkStatus(externalId: string): Promise<DisbursementProviderStatus>;
}
