import { buildServer } from './api/server.js';
import { printLogo } from './logo.js';

const port = parseInt(process.env.PORT ?? '3333', 10);
const host = process.env.HOST ?? '0.0.0.0';

const app = buildServer();

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  printLogo(`Listening on ${address}  ·  docs: ${address}/docs`);
});
