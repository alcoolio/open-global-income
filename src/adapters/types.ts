import type { GlobalIncomeEntitlement } from '../core/types.js';

/** Represents a token amount on a specific chain */
export interface TokenAmount {
  /** Raw amount in smallest unit (e.g., lamports, wei) */
  rawAmount: bigint;
  /** Human-readable amount with decimals */
  displayAmount: string;
  /** Token symbol (e.g., 'USDC', 'DAI') */
  symbol: string;
  /** Number of decimal places */
  decimals: number;
}

/** Configuration shared across all chain adapters */
export interface AdapterConfig {
  /** Token symbol to convert to */
  tokenSymbol: string;
  /** Token decimal places */
  tokenDecimals: number;
  /** Exchange rate: 1 PPP-USD = X tokens (defaults to 1 for stablecoins) */
  exchangeRate?: number;
}

/** Generic chain adapter interface */
export interface ChainAdapter<TConfig extends AdapterConfig = AdapterConfig> {
  /** Unique identifier for this adapter */
  readonly chainId: string;
  /** Human-readable chain name */
  readonly chainName: string;

  /** Convert a GlobalIncomeEntitlement to a token amount */
  toTokenAmount(entitlement: GlobalIncomeEntitlement, config: TConfig): TokenAmount;

  /** Get adapter metadata */
  getMetadata(): {
    chainId: string;
    chainName: string;
    supportedTokens: string[];
  };
}
