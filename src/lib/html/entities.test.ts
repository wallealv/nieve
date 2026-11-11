import { describe, expect, test } from 'vitest';
import { decodeHtmlEntities } from './entities.js';

describe('decodeHtmlEntities', () => {
  test('decodes the named entities the road feed sends', () => {
    expect(decodeHtmlEntities('Las Le&ntilde;as')).toBe('Las Leñas');
    expect(decodeHtmlEntities('veh&iacute;culos')).toBe('vehículos');
    expect(decodeHtmlEntities('&Aacute;rea &uuml;nica &iexcl;ojo! &iquest;s&iacute;?')).toBe('Área ünica ¡ojo! ¿sí?');
  });

  test('decodes decimal and hex numeric entities', () => {
    expect(decodeHtmlEntities('direcci&#243;n')).toBe('dirección');
    expect(decodeHtmlEntities('direcci&#xF3;n &#x1F600;')).toBe('dirección 😀');
  });

  test('keeps the previous replacements', () => {
    expect(decodeHtmlEntities('a&nbsp;b &ndash; c &mdash; d 5&deg;')).toBe('a b – c — d 5°');
    expect(decodeHtmlEntities('Nieve &amp; hielo &quot;ok&quot; &lt;b&gt; &apos;x&apos;')).toBe('Nieve & hielo "ok" <b> \'x\'');
  });

  test('decodes only once and leaves unknown or invalid entities untouched', () => {
    expect(decodeHtmlEntities('&amp;ntilde;')).toBe('&ntilde;');
    expect(decodeHtmlEntities('&unknownentity; &#99999999999; &#xD800; & co')).toBe('&unknownentity; &#99999999999; &#xD800; & co');
  });
});
