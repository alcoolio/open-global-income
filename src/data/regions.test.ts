import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllRegions,
  getRegionById,
  getRegionsByCountry,
  getRegionsDataVersion,
  resetRegionsCache,
  getCountryByCode,
} from './loader.js';

beforeEach(() => {
  resetRegionsCache();
});

describe('region loader', () => {
  it('getAllRegions returns seeded regions', () => {
    const regions = getAllRegions();
    expect(regions.length).toBeGreaterThan(0);
  });

  it('getRegionsByCountry returns Kenya regions', () => {
    const regions = getRegionsByCountry('KE');
    expect(regions.length).toBe(47);
    expect(regions.every((r) => r.countryCode === 'KE')).toBe(true);
  });

  it('getRegionsByCountry is case-insensitive', () => {
    const regions = getRegionsByCountry('ke');
    expect(regions.length).toBe(47);
  });

  it('getRegionsByCountry returns empty for unknown country', () => {
    const regions = getRegionsByCountry('XX');
    expect(regions).toEqual([]);
  });

  it('getRegionById finds by id', () => {
    const region = getRegionById('KE-NAI');
    expect(region).toBeDefined();
    expect(region!.name).toBe('Nairobi');
    expect(region!.countryCode).toBe('KE');
  });

  it('getRegionById is case-insensitive', () => {
    const region = getRegionById('ke-nai');
    expect(region).toBeDefined();
    expect(region!.id).toBe('KE-NAI');
  });

  it('getRegionById returns undefined for unknown id', () => {
    expect(getRegionById('XX-XXX')).toBeUndefined();
  });

  it('getRegionsDataVersion returns a version string', () => {
    const version = getRegionsDataVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('all regions have valid costOfLivingIndex', () => {
    const regions = getAllRegions();
    for (const r of regions) {
      expect(r.stats.costOfLivingIndex).toBeGreaterThan(0);
      expect(r.stats.costOfLivingIndex).toBeLessThan(3.0);
    }
  });

  it('all regions have positive population', () => {
    const regions = getAllRegions();
    for (const r of regions) {
      expect(r.stats.population).toBeGreaterThan(0);
    }
  });

  it('all region countryCode values exist in countries.json', () => {
    const regions = getAllRegions();
    const countryCodes = new Set(regions.map((r) => r.countryCode));
    for (const code of countryCodes) {
      expect(getCountryByCode(code)).toBeDefined();
    }
  });

  it('resetRegionsCache clears the cache', () => {
    getAllRegions(); // load
    resetRegionsCache();
    // Should reload without error
    const regions = getAllRegions();
    expect(regions.length).toBeGreaterThan(0);
  });
});
