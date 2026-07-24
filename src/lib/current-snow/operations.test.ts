import { describe, expect, test } from 'vitest';
import { parseOffPiste, parseOperationalRows } from './operations.js';

describe('official operations parsers', () => {
  test('counts open, conditional and closed rows using text and image attributes', () => {
    const html = `
      <table>
        <tr><th>Medio</th><th>Estado</th></tr>
        <tr><td>Marte</td><td><img alt="Abierto" src="open.svg"></td></tr>
        <tr><td>Venus</td><td class="estado-condicional">Condicional</td></tr>
        <tr><td>Neptuno</td><td><img alt="Cerrado" src="closed.svg"></td></tr>
      </table>
    `;

    expect(parseOperationalRows(html)).toEqual({
      open: 1,
      conditional: 1,
      total: 3,
    });
  });

  test('returns nulls rather than assuming state from ambiguous rows', () => {
    const html = '<table><tr><td>Marte</td><td>Sin información</td></tr></table>';

    expect(parseOperationalRows(html)).toEqual({
      open: null,
      conditional: null,
      total: null,
    });
  });

  test('parses avalanche risk, off-piste status and official note', () => {
    const html = `
      <section>
        <p>Estado Condicional</p>
        <p>Riesgo de avalancha 3</p>
        <p>Observaciones Ingresar únicamente con guía habilitado.</p>
        <p>Índice actualizado</p>
      </section>
    `;

    expect(parseOffPiste(html)).toEqual({
      avalancheRisk: 3,
      offPisteStatus: 'Condicional',
      officialNote: 'ingresar unicamente con guia habilitado.',
    });
  });

  test('does not turn the avalanche table heading into an official observation', () => {
    const html = `
      <section>
        <p>Estado Cerrado</p>
        <p>Riesgo de avalancha 3</p>
        <p>Observaciones</p>
        <p>Índice</p>
        <p>Estabilidad</p>
        <p>Probabilidad</p>
      </section>
    `;

    expect(parseOffPiste(html)).toEqual({
      avalancheRisk: 3,
      offPisteStatus: 'Cerrado',
      officialNote: null,
    });
  });
});
