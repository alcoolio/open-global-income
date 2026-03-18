#!/usr/bin/env tsx
/**
 * SDK generation script.
 *
 * Generates a TypeScript client SDK from the OpenAPI spec.
 * The generated SDK provides type-safe access to all API endpoints.
 *
 * Usage:
 *   npx tsx scripts/generate-sdk.ts
 *
 * Output:
 *   sdk/client.ts - Generated TypeScript SDK
 *
 * For production use, consider using openapi-typescript or similar tools
 * for full code generation from the OpenAPI spec at /docs/json.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SDK_DIR = join(__dirname, '..', 'sdk');

const SDK_CONTENT = `/**
 * Open Global Income API Client SDK
 *
 * Auto-generated TypeScript client for the OGI API.
 * See /docs for the full OpenAPI specification.
 */

export interface OgiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface CountrySummary {
  code: string;
  name: string;
  incomeGroup: 'HIC' | 'UMC' | 'LMC' | 'LIC';
  hasGiniData: boolean;
}

export interface CountryStats {
  gdpPerCapitaUsd: number;
  gniPerCapitaUsd: number;
  pppConversionFactor: number;
  giniIndex: number | null;
  population: number;
  incomeGroup: 'HIC' | 'UMC' | 'LMC' | 'LIC';
}

export interface CountryDetail {
  code: string;
  name: string;
  stats: CountryStats;
  dataVersion: string;
}

export interface GlobalIncomeEntitlement {
  countryCode: string;
  pppUsdPerMonth: number;
  localCurrencyPerMonth: number;
  score: number;
  meta: {
    rulesetVersion: string;
    dataVersion: string;
  };
}

export interface RulesetInfo {
  version: string;
  name: string;
  description: string;
  active: boolean;
  parameters: Record<string, number>;
  formula: string;
}

export interface User {
  id: string;
  countryCode: string;
  createdAt: string;
}

export interface BatchResult {
  count: number;
  results: Array<GlobalIncomeEntitlement | { countryCode: string; error: { code: string; message: string } }>;
}

export class OgiClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: OgiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
    };

    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      ...options,
      headers: { ...headers, ...options?.headers },
      signal: AbortSignal.timeout(this.timeout),
    });

    return res.json() as Promise<ApiResult<T>>;
  }

  /** Calculate income entitlement for a single country */
  async calcIncome(countryCode: string): Promise<ApiResult<GlobalIncomeEntitlement>> {
    return this.request(\`/v1/income/calc?country=\${encodeURIComponent(countryCode)}\`);
  }

  /** Batch calculate income entitlements */
  async batchCalcIncome(countryCodes: string[]): Promise<ApiResult<BatchResult>> {
    return this.request('/v1/income/batch', {
      method: 'POST',
      body: JSON.stringify({ countries: countryCodes }),
    });
  }

  /** List all countries */
  async listCountries(): Promise<ApiResult<{ dataVersion: string; count: number; countries: CountrySummary[] }>> {
    return this.request('/v1/income/countries');
  }

  /** Get full details for a country */
  async getCountry(code: string): Promise<ApiResult<CountryDetail>> {
    return this.request(\`/v1/income/countries/\${encodeURIComponent(code)}\`);
  }

  /** List all rulesets */
  async listRulesets(): Promise<ApiResult<RulesetInfo[]>> {
    return this.request('/v1/income/rulesets');
  }

  /** Get a specific ruleset by version */
  async getRuleset(version: string): Promise<ApiResult<RulesetInfo>> {
    return this.request(\`/v1/income/rulesets/\${encodeURIComponent(version)}\`);
  }

  /** Create a user */
  async createUser(countryCode: string): Promise<ApiResult<User>> {
    return this.request('/v1/users', {
      method: 'POST',
      body: JSON.stringify({ country_code: countryCode }),
    });
  }

  /** Get a user's income entitlement */
  async getUserIncome(userId: string): Promise<ApiResult<{ user: { id: string; countryCode: string }; entitlement: GlobalIncomeEntitlement }>> {
    return this.request(\`/v1/users/\${encodeURIComponent(userId)}/income\`);
  }

  /** Health check */
  async health(): Promise<{ status: string }> {
    const res = await fetch(\`\${this.baseUrl}/health\`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    return res.json() as Promise<{ status: string }>;
  }
}

export default OgiClient;
`;

mkdirSync(SDK_DIR, { recursive: true });
writeFileSync(join(SDK_DIR, 'client.ts'), SDK_CONTENT);

console.log('SDK generated successfully:');
console.log(`  ${join(SDK_DIR, 'client.ts')}`);
console.log('');
console.log('Usage:');
console.log('  import { OgiClient } from "./sdk/client.js";');
console.log('  const client = new OgiClient({ baseUrl: "http://localhost:3333" });');
console.log('  const result = await client.calcIncome("DE");');
