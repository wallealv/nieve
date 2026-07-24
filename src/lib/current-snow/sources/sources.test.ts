import { describe, expect, test } from 'vitest';
import { parseLasLenas } from './lasLenas.js';
import { parseOnTheSnow } from './onTheSnow.js';
import { parseSkiResortInfo } from './skiResortInfo.js';
import { parseSnowForecast } from './snowForecast.js';

const fetchedAt = '2026-07-24T20:00:00Z';

describe('current snow source adapters', () => {
  test('parses official depth, 24-hour snow and visibility without turning dashes into zero', () => {
    const report = parseLasLenas(
      `<table>
        <tr><th>NIEVE</th><th>PISADA</th><th>PRECIPITADA ÚLTIMAS 24H</th><th>VISIBILIDAD</th></tr>
        <tr><td>BASE</td><td>-</td><td>3 cm</td><td>Reducida</td></tr>
        <tr><td>INTERMEDIA</td><td>25 cm</td><td>1 cm</td><td>Buena</td></tr>
        <tr><td>CUMBRE</td><td>40 cm</td><td>2 cm</td><td>Excelente</td></tr>
      </table>`,
      fetchedAt,
    );

    expect(report.observations).toHaveLength(3);
    expect(report.observations[0]).toMatchObject({
      zone: 'base',
      depthCm: null,
      newSnow24hCm: 3,
      visibility: 'Reducida',
      freshness: 'unknown',
    });
    expect(report.observations[1]).toMatchObject({ depthCm: 25, newSnow24hCm: 1 });
  });

  test('parses Snow-Forecast table separators and ignores forecast snowfall', () => {
    const report = parseSnowForecast(
      `<main>
        <h2>Las Leñas snow depths: updated 20 July 2026</h2>
        <p>Upper snow depth: | | 35 cm</p>
        <p>Lower snow depth: | | 20 cm</p>
        <p>Our model predicted that 43cm of snow fell over 48 hours.</p>
        <p>Piste snow condition: Packed powder and groomed snow</p>
        <p>Next snowfall: 19 cm</p>
      </main>`,
      fetchedAt,
    );

    expect(report.observations.map((item) => item.depthCm)).toEqual([20, 35]);
    expect(report.observations.every((item) => item.newSnow24hCm === null)).toBe(true);
    expect(report.observations[0]?.reportedAt).toBe('2026-07-20T12:00:00.000Z');
    expect(report.observations[0]?.freshness).toBe('stale');
  });

  test('parses Skiresort.info mountain and base values', () => {
    const report = parseSkiResortInfo(
      `<main>
        <p>Updated on: 23 Jul 2026</p>
        <h3>Snow depths</h3>
        <p>35 cm Mountain (3430 m)</p>
        <p>20 cm Base (2200 m)</p>
        <p>Snow quality: gripping</p>
        <p>Last snowfall: 22 Jul 2026</p>
      </main>`,
      fetchedAt,
    );

    expect(report.observations.map((item) => item.depthCm)).toEqual([20, 35]);
    expect(report.observations[0]?.freshness).toBe('aging');
    expect(report.provenanceGroup).toBe('skiresort-network');
  });

  test('converts OnTheSnow inches to centimeters', () => {
    const report = parseOnTheSnow(
      `<main>
        <p>Open Snow Report Last Updated: Jul 24</p>
        <h3>Base</h3><p>8"</p><p>Machine Made</p>
        <h3>Summit</h3><p>12"</p>
      </main>`,
      fetchedAt,
    );

    expect(report.observations.map((item) => item.depthCm)).toEqual([20.3, 30.5]);
    expect(report.observations[0]?.freshness).toBe('fresh');
    expect(report.provenanceGroup).toBe('onthesnow-network');
  });
});
