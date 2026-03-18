import type { GlobalIncomeEntitlement } from '../../core/types.js';
import type { ChainAdapter, AdapterConfig, TokenAmount } from '../types.js';

export interface SolanaAdapterConfig extends AdapterConfig {
  /** Solana program ID (placeholder for future on-chain integration) */
  programId?: string;
}

const DEFAULT_CONFIG: SolanaAdapterConfig = {
  tokenSymbol: 'USDC',
  tokenDecimals: 6,
  exchangeRate: 1,
};

export const solanaAdapter: ChainAdapter<SolanaAdapterConfig> = {
  chainId: 'solana',
  chainName: 'Solana',

  toTokenAmount(
    entitlement: GlobalIncomeEntitlement,
    config: SolanaAdapterConfig = DEFAULT_CONFIG,
  ): TokenAmount {
    const rate = config.exchangeRate ?? 1;
    const amount = entitlement.pppUsdPerMonth * rate;
    const rawAmount = BigInt(Math.round(amount * 10 ** config.tokenDecimals));
    const displayAmount = amount.toFixed(config.tokenDecimals);

    return {
      rawAmount,
      displayAmount,
      symbol: config.tokenSymbol,
      decimals: config.tokenDecimals,
    };
  },

  getMetadata() {
    return {
      chainId: 'solana',
      chainName: 'Solana',
      supportedTokens: ['USDC', 'USDT', 'SOL'],
    };
  },
};
