import { describe, it, expect } from 'vitest';
import { buildRegionAdjustedCountry, toRegionalEntitlement } from './regions.js';
import { calculateEntitlement } from './rules.js';
import type { Country, Region, GlobalIncomeEntitlement } from './types.js';

const DATA_VERSION = 'test-snapshot';

const kenya: Country = {
  code: 'KE',
  name: 'Kenya',
  stats: {
    gdpPerCapitaUsd: 2099,
    gniPerCapitaUsd: 2010,
    pppConversionFactor: 49.37,
    giniIndex: 38.7,
    population: 54030000,
    incomeGroup: 'LMC',
  },
};

const nairobi: Region = {
  id: 'KE-NAI',
  countryCode: 'KE',
  regionCode: 'NAI',
  name: 'Nairobi',
  stats: {
    population: 4397073,
    costOfLivingIndex: 1.35,
    urbanRural: 'urban',
    povertyHeadcountRatio: 17.0,
    dataAsOf: '2019-01-01',
    dataSource: 'KNBS 2019 Census',
  },
};

const turkana: Region = {
  id: 'KE-TUR',
  countryCode: 'KE',
  regionCode: 'TUR',
  name: 'Turkana',
  stats: {
    population: 926976,
    costOfLivingIndex: 0.68,
    urbanRural: 'rural',
    povertyHeadcountRatio: 79.4,
    dataAsOf: '2019-01-01',
    dataSource: 'KNBS 2019 Census',
  },
};

const neutralRegion: Region = {
  id: 'KE-NEU',
  countryCode: 'KE',
  regionCode: 'NEU',
  name: 'Neutral',
  stats: {
    population: 1000000,
    costOfLivingIndex: 1.0,
    urbanRural: 'mixed',
    dataAsOf: '2019-01-01',
    dataSource: 'Test',
  },
};

describe('buildRegionAdjustedCountry', () => {
  it('multiplies pppConversionFactor by costOfLivingIndex', () => {
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    const expected = kenya.stats.pppConversionFactor * nairobi.stats.costOfLivingIndex;
    expect(adjusted.stats.pppConversionFactor).toBeCloseTo(expected, 4);
  });

  it('substitutes regional population', () => {
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    expect(adjusted.stats.population).toBe(nairobi.stats.population);
  });

  it('preserves all other national stats', () => {
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    expect(adjusted.stats.gdpPerCapitaUsd).toBe(kenya.stats.gdpPerCapitaUsd);
    expect(adjusted.stats.gniPerCapitaUsd).toBe(kenya.stats.gniPerCapitaUsd);
    expect(adjusted.stats.giniIndex).toBe(kenya.stats.giniIndex);
    expect(adjusted.stats.incomeGroup).toBe(kenya.stats.incomeGroup);
    expect(adjusted.code).toBe(kenya.code);
    expect(adjusted.name).toBe(kenya.name);
  });

  it('does not mutate the input Country', () => {
    const originalPpp = kenya.stats.pppConversionFactor;
    const originalPop = kenya.stats.population;
    buildRegionAdjustedCountry(kenya, nairobi);
    expect(kenya.stats.pppConversionFactor).toBe(originalPpp);
    expect(kenya.stats.population).toBe(originalPop);
  });

  it('does not mutate the input Region', () => {
    const originalIndex = nairobi.stats.costOfLivingIndex;
    buildRegionAdjustedCountry(kenya, nairobi);
    expect(nairobi.stats.costOfLivingIndex).toBe(originalIndex);
  });
});

describe('regional entitlement calculations', () => {
  it('COL > 1 produces higher localCurrencyPerMonth', () => {
    const national = calculateEntitlement(kenya, DATA_VERSION);
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    const regional = calculateEntitlement(adjusted, DATA_VERSION);
    expect(regional.localCurrencyPerMonth).toBeGreaterThan(national.localCurrencyPerMonth);
  });

  it('COL < 1 produces lower localCurrencyPerMonth', () => {
    const national = calculateEntitlement(kenya, DATA_VERSION);
    const adjusted = buildRegionAdjustedCountry(kenya, turkana);
    const regional = calculateEntitlement(adjusted, DATA_VERSION);
    expect(regional.localCurrencyPerMonth).toBeLessThan(national.localCurrencyPerMonth);
  });

  it('COL = 1.0 produces exactly the national localCurrencyPerMonth', () => {
    const national = calculateEntitlement(kenya, DATA_VERSION);
    const adjusted = buildRegionAdjustedCountry(kenya, neutralRegion);
    const regional = calculateEntitlement(adjusted, DATA_VERSION);
    expect(regional.localCurrencyPerMonth).toBe(national.localCurrencyPerMonth);
  });

  it('score is unchanged by regional adjustment', () => {
    const national = calculateEntitlement(kenya, DATA_VERSION);
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    const regional = calculateEntitlement(adjusted, DATA_VERSION);
    expect(regional.score).toBe(national.score);
  });

  it('pppUsdPerMonth is always 210 regardless of region', () => {
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    const regional = calculateEntitlement(adjusted, DATA_VERSION);
    expect(regional.pppUsdPerMonth).toBe(210);
  });
});

describe('toRegionalEntitlement', () => {
  it('attaches region metadata correctly', () => {
    const national = calculateEntitlement(kenya, DATA_VERSION);
    const adjusted = buildRegionAdjustedCountry(kenya, nairobi);
    const regional = calculateEntitlement(adjusted, DATA_VERSION);
    const result = toRegionalEntitlement(regional, national, nairobi);

    expect(result.regionId).toBe('KE-NAI');
    expect(result.regionName).toBe('Nairobi');
    expect(result.costOfLivingIndex).toBe(1.35);
    expect(result.nationalLocalCurrencyPerMonth).toBe(national.localCurrencyPerMonth);
    expect(result.localCurrencyPerMonth).toBe(regional.localCurrencyPerMonth);
  });
});
