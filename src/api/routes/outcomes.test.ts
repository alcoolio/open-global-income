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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createTestPilot(): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/pilots',
    payload: { name: 'Evidence Test Pilot', countryCode: 'KE' },
  });
  expect(res.statusCode).toBe(201);
  return res.json().data.id;
}

const validIndicators = {
  employmentRate: 0.62,
  averageMonthlyIncomeUsd: 380,
  foodSecurityScore: 3.8,
  childSchoolAttendanceRate: 0.91,
};

// ── POST /v1/pilots/:id/outcomes ─────────────────────────────────────────────

describe('POST /v1/pilots/:id/outcomes', () => {
  it('records an outcome measurement', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: validIndicators,
        sampleSize: 487,
        dataSource: 'NGO field survey — October 2026',
        isBaseline: false,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.pilotId).toBe(pilotId);
    expect(body.data.cohortType).toBe('recipient');
    expect(body.data.measurementDate).toBe('2026-10-01');
    expect(body.data.sampleSize).toBe(487);
    expect(body.data.isBaseline).toBe(false);
    expect(body.data.indicators.employmentRate).toBe(0.62);
  });

  it('records a baseline measurement', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-01-01',
        indicators: validIndicators,
        sampleSize: 500,
        dataSource: 'Baseline survey',
        isBaseline: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.isBaseline).toBe(true);
  });

  it('records a control cohort outcome', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'control',
        measurementDate: '2026-10-01',
        indicators: { employmentRate: 0.55 },
        sampleSize: 200,
        dataSource: 'Control group survey',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.cohortType).toBe('control');
  });

  it('returns 404 for missing pilot', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pilots/nonexistent/outcomes',
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: validIndicators,
        sampleSize: 100,
        dataSource: 'Test',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for invalid cohortType', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'invalid',
        measurementDate: '2026-10-01',
        indicators: validIndicators,
        sampleSize: 100,
        dataSource: 'Test',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PARAMETER');
  });

  it('returns 400 for invalid measurementDate format', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: 'not-a-date',
        indicators: validIndicators,
        sampleSize: 100,
        dataSource: 'Test',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid indicator value (out of range)', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: { employmentRate: 1.5 }, // > 1 is invalid
        sampleSize: 100,
        dataSource: 'Test',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when indicators is empty object', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: {},
        sampleSize: 100,
        dataSource: 'Test',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for non-integer sampleSize', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: validIndicators,
        sampleSize: 1.5,
        dataSource: 'Test',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when dataSource is missing', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: validIndicators,
        sampleSize: 100,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_PARAMETER');
  });
});

// ── GET /v1/pilots/:id/outcomes ───────────────────────────────────────────────

describe('GET /v1/pilots/:id/outcomes', () => {
  it('returns all outcomes for a pilot', async () => {
    const pilotId = await createTestPilot();

    await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-01-01',
        indicators: validIndicators,
        sampleSize: 500,
        dataSource: 'Baseline',
        isBaseline: true,
      },
    });

    const res = await app.inject({ method: 'GET', url: `/v1/pilots/${pilotId}/outcomes` });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].isBaseline).toBe(true);
  });

  it('returns 404 for missing pilot', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/pilots/nonexistent/outcomes' });
    expect(res.statusCode).toBe(404);
  });
});

// ── GET /v1/pilots/:id/outcomes/compare ──────────────────────────────────────

describe('GET /v1/pilots/:id/outcomes/compare', () => {
  it('returns comparison with baseline and follow-up', async () => {
    const pilotId = await createTestPilot();

    await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-01-01',
        indicators: { employmentRate: 0.5, averageMonthlyIncomeUsd: 200 },
        sampleSize: 500,
        dataSource: 'Baseline',
        isBaseline: true,
      },
    });

    await app.inject({
      method: 'POST',
      url: `/v1/pilots/${pilotId}/outcomes`,
      payload: {
        cohortType: 'recipient',
        measurementDate: '2026-10-01',
        indicators: { employmentRate: 0.65, averageMonthlyIncomeUsd: 350 },
        sampleSize: 480,
        dataSource: 'Follow-up survey',
        isBaseline: false,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/pilots/${pilotId}/outcomes/compare`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.pilotId).toBe(pilotId);
    expect(data.recipient.baseline).not.toBeNull();
    expect(data.recipient.latest).not.toBeNull();
    expect(data.recipient.delta).not.toBeNull();
    expect(data.recipient.delta.employmentRate.change).toBeCloseTo(0.15, 5);
    expect(data.recipient.delta.averageMonthlyIncomeUsd.change).toBeCloseTo(150, 5);
    expect(data.control).toBeNull();
  });

  it('returns null control when no control cohort recorded', async () => {
    const pilotId = await createTestPilot();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/pilots/${pilotId}/outcomes/compare`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.control).toBeNull();
  });

  it('returns 404 for missing pilot', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pilots/nonexistent/outcomes/compare',
    });
    expect(res.statusCode).toBe(404);
  });
});

// ── GET /v1/evidence/aggregate ───────────────────────────────────────────────

describe('GET /v1/evidence/aggregate', () => {
  it('returns aggregate without filters', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/evidence/aggregate' });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(typeof data.programCount).toBe('number');
    expect(typeof data.measurementCount).toBe('number');
    expect(data.meta.generatedAt).toBeDefined();
  });

  it('accepts country filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/evidence/aggregate?country=KE',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('returns 400 for out-of-range coverageMin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/evidence/aggregate?coverageMin=2',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PARAMETER');
  });

  it('returns 400 for invalid coverageMax', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/evidence/aggregate?coverageMax=-0.1',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── GET /v1/evidence/export ───────────────────────────────────────────────────

describe('GET /v1/evidence/export', () => {
  it('exports as CSV by default', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/evidence/export' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('indicator,median,p25,p75,sample_size');
  });

  it('exports as JSON when format=json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/evidence/export?format=json',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('returns 400 for invalid format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/evidence/export?format=parquet',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PARAMETER');
  });

  it('accepts country filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/evidence/export?country=KE',
    });
    expect(res.statusCode).toBe(200);
  });
});
