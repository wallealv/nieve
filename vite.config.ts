import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vitest/config';
import { handleClimatologyRequest } from './api/climatology.js';
import { handleCurrentSnowRequest } from './api/current-snow.js';
import { handleForecastRequest } from './api/forecast.js';
import { handleHourlyRequest } from './api/hourly.js';
import { handleModelRunsRequest } from './api/model-runs.js';
import { handleRegionalGridRequest } from './api/regional-grid.js';
import { handleRegionalRequest } from './api/regional.js';
import { handleRoadRequest } from './api/road.js';
import { handleWebcamRequest } from './api/webcam.js';

function attachHandler(
  server: ViteDevServer,
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
      attachHandler(server, '/api/hourly', handleHourlyRequest);
      attachHandler(server, '/api/model-runs', handleModelRunsRequest);
      attachHandler(server, '/api/road', handleRoadRequest);
      attachHandler(server, '/api/webcam', handleWebcamRequest);
      attachHandler(server, '/api/regional', handleRegionalRequest);
      attachHandler(server, '/api/regional-grid', handleRegionalGridRequest);
      attachHandler(server, '/api/climatology', handleClimatologyRequest);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverlessDevApi()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    clearMocks: true,
  },
});