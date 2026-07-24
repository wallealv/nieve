import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { handleForecastRequest } from './api/forecast.js';

function forecastDevApi(): Plugin {
  return {
    name: 'las-lenas-forecast-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/forecast', async (request, response) => {
        const webResponse = await handleForecastRequest(
          new Request('http://localhost/api/forecast', {
            method: request.method ?? 'GET',
          }),
        );
        response.statusCode = webResponse.status;
        webResponse.headers.forEach((value, key) => response.setHeader(key, value));
        response.end(await webResponse.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), forecastDevApi()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    clearMocks: true,
  },
});
