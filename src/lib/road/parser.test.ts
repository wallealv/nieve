import { describe, expect, test } from 'vitest';
import { parseRoadReport } from './parser.js';

const SOURCE = 'https://prensa.mendoza.gob.ar/estado-de-las-rutas-en-mendoza-2/';

describe('parseRoadReport', () => {
  test('extracts RP 222 status, chains, machinery and publication time', () => {
    const html = `
      <article>
        <time datetime="2026-07-23T08:30:00-03:00">23 julio 2026</time>
        <h1>Estado de las rutas en Mendoza</h1>
        <ul>
          <li>RP 52: Transitable con precaución.</li>
          <li><strong>RP 222 a Las Leñas:</strong> Transitable con portación obligatoria de cadenas hasta Las Leñas. Máquinas trabajando por nieve y hielo.</li>
          <li>RP 173: Transitable.</li>
        </ul>
      </article>
    `;
    const result = parseRoadReport(html, SOURCE, '2026-07-24T12:00:00Z');
    expect(result.status).toBe('chains-required');
    expect(result.chainsRequired).toBe(true);
    expect(result.machineryWorking).toBe(true);
    expect(result.hazards).toEqual(expect.arrayContaining(['nieve', 'hielo']));
    expect(result.reportedAt).toBe('2026-07-23T08:30:00-03:00');
    expect(result.statement).toMatch(/RP 222/i);
  });

  test('prioritizes closure over other words', () => {
    const html = '<p>Ruta Provincial 222, ingreso a Los Molles y Las Leñas: intransitable. Portación de cadenas.</p>';
    expect(parseRoadReport(html, SOURCE, '2026-07-24T12:00:00Z').status).toBe('closed');
  });

  test('returns caution for a transitable route with precautions', () => {
    const html = '<p>RP 222 (Los Molles – Las Leñas): transitable con suma precaución por máquinas viales.</p>';
    expect(parseRoadReport(html, SOURCE, '2026-07-24T12:00:00Z').status).toBe('caution');
  });

  test('does not treat unrelated route statements as RP 222 data', () => {
    const html = '<p>RP 52: Transitable. Portación obligatoria de cadenas.</p>';
    const result = parseRoadReport(html, SOURCE, '2026-07-24T12:00:00Z');
    expect(result.status).toBe('unknown');
    expect(result.statement).toBeNull();
  });
});
