import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { getTestDb, closeDb } from '../../db/database.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  getTestDb();
  app = buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  closeDb();
});

describe('GET /v1/income/regions', () => {
  it('returns all regions', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/income/regions' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.count).toBeGreaterThan(0);
    expect(Array.isArray(body.data.regions)).toBe(true);
  });

  it('filters by country', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/income/regions?country=KE' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.regions.every((r: { countryCode: string }) => r.countryCode === 'KE')).toBe(true);
  });

  it('returns empty array for unknown country', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/income/regions?country=XX' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.count).toBe(0);
  });
});

describe('GET /v1/income/regions/:id', () => {
  it('returns region detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/income/regions/KE-NAI' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.region.name).toBe('Nairobi');
  });

  it('returns 404 for unknown region', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/income/regions/XX-XXX' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('REGION_NOT_FOUND');
  });
});

describe('GET /v1/income/calc/regional', () => {
  it('returns regional entitlement', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional?country=KE&region=KE-NAI',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.regionId).toBe('KE-NAI');
    expect(body.data.costOfLivingIndex).toBe(1.35);
    expect(body.data.pppUsdPerMonth).toBe(210);
  });

  it('Nairobi localCurrencyPerMonth > national', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional?country=KE&region=KE-NAI',
    });
    const body = res.json();
    expect(body.data.localCurrencyPerMonth).toBeGreaterThan(body.data.nationalLocalCurrencyPerMonth);
  });

  it('Turkana localCurrencyPerMonth < national', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional?country=KE&region=KE-TUR',
    });
    const body = res.json();
    expect(body.data.localCurrencyPerMonth).toBeLessThan(body.data.nationalLocalCurrencyPerMonth);
  });

  it('returns 400 when country is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_PARAMETER');
  });

  it('returns 400 when region is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional?country=KE',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_PARAMETER');
  });

  it('returns 404 for unknown country', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional?country=XX&region=KE-NAI',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('COUNTRY_NOT_FOUND');
  });

  it('returns 400 for country-region mismatch', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/income/calc/regional?country=NG&region=KE-NAI',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('REGION_COUNTRY_MISMATCH');
  });
});

describe('POST /v1/income/simulate/regional', () => {
  it('returns regional simulation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/income/simulate/regional',
      payload: {
        country: 'KE',
        regionId: 'KE-NAI',
        coverage: 0.5,
        targetGroup: 'all',
        durationMonths: 12,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.region.id).toBe('KE-NAI');
    expect(body.data.country.population).toBe(4397073);
  });

  it('returns 404 for unknown region', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/income/simulate/regional',
      payload: {
        country: 'KE',
        regionId: 'KE-ZZZ',
        coverage: 0.5,
        targetGroup: 'all',
        durationMonths: 12,
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('REGION_NOT_FOUND');
  });

  it('returns 400 for missing regionId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/income/simulate/regional',
      payload: {
        country: 'KE',
        coverage: 0.5,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_PARAMETER');
  });
});
