import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

// Default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

// Custom API metrics
const httpRequestsTotal = new Counter({
  name: 'ogi_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'ogi_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const entitlementCalculations = new Counter({
  name: 'ogi_entitlement_calculations_total',
  help: 'Total entitlement calculations performed',
  labelNames: ['country_code'] as const,
  registers: [register],
});

const activeConnections = new Gauge({
  name: 'ogi_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

export { register, entitlementCalculations };

const metricsPlugin: FastifyPluginAsync = async (app) => {
  // Track request duration and count
  app.addHook('onRequest', async () => {
    activeConnections.inc();
  });

  app.addHook('onResponse', async (request, reply) => {
    activeConnections.dec();

    // Normalize route to avoid high cardinality
    const route = request.routeOptions?.url ?? request.url;

    httpRequestsTotal.inc({
      method: request.method,
      route,
      status_code: reply.statusCode.toString(),
    });

    if (reply.elapsedTime) {
      httpRequestDuration.observe(
        { method: request.method, route },
        reply.elapsedTime / 1000,
      );
    }
  });

  // Metrics endpoint
  app.get('/metrics', async (_request, reply) => {
    const metrics = await register.metrics();
    return reply.type(register.contentType).send(metrics);
  });
};

export const metricsMiddleware = fp(metricsPlugin, { name: 'metrics' });
