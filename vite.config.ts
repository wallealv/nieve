import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { handleCurrentSnowRequest } from './api/current-snow.js';
import { handleForecastRequest } from './api/forecast.js';

function attachHandler(
  server: Parameters<NonNullable<Plugin['configureServer']>>[0],
  path: string,
  handler: (request: Request) => Promise<Response>,
) {
  server.middlewares.use(path, async (request, response) => {
    const webResponse = await handler(
      new Request(`http://localhost${path}`, {
        method: request.method ?? 'GET',
      }),
    );
    response.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(await webResponse.text());
  });
}

function serverlessDevApi(): Plugin {
  return {
    name: 'las-lenas-serverless-dev-api',
    configureServer(server) {
      attachHandler(server, '/api/forecast', handleForecastRequest);
      attachHandler(server, '/api/current-snow', handleCurrentSnowRequest);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverlessDevApi()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    clearMocks: true,
  },
});
