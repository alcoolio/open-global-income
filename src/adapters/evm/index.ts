import type { GlobalIncomeEntitlement } from '../../core/types.js';
import type { ChainAdapter, AdapterConfig, TokenAmount } from '../types.js';

export interface EvmAdapterConfig extends AdapterConfig {
  /** EVM chain ID (1 = Ethereum, 137 = Polygon, 42161 = Arbitrum, etc.) */
  chainId?: number;
  /** Contract address for the token (placeholder) */
  tokenAddress?: string;
}

const DEFAULT_CONFIG: EvmAdapterConfig = {
  tokenSymbol: 'USDC',
  tokenDecimals: 6,
  exchangeRate: 1,
  chainId: 1,
};

export const evmAdapter: ChainAdapter<EvmAdapterConfig> = {
  chainId: 'evm',
  chainName: 'Ethereum / EVM',

  toTokenAmount(
    entitlement: GlobalIncomeEntitlement,
    config: EvmAdapterConfig = DEFAULT_CONFIG,
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
      chainId: 'evm',
      chainName: 'Ethereum / EVM',
      supportedTokens: ['USDC', 'USDT', 'DAI', 'ETH'],
    };
  },
};

/** Pre-configured adapters for common EVM chains */
export const evmChains = {
  ethereum: { ...DEFAULT_CONFIG, chainId: 1 },
  polygon: { ...DEFAULT_CONFIG, chainId: 137 },
  arbitrum: { ...DEFAULT_CONFIG, chainId: 42161 },
  optimism: { ...DEFAULT_CONFIG, chainId: 10 },
  base: { ...DEFAULT_CONFIG, chainId: 8453 },
} as const;
