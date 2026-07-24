# Diseño — Nieve actual observada

Fecha: 2026-07-24

## Objetivo

Agregar al Las Leñas Snow Monitor una sección de **nieve actual** que muestre la profundidad reportada del manto y la nieve nueva observada, separándolas claramente del pronóstico futuro. La función debe combinar el parte oficial de Las Leñas con fuentes externas, conservar la trazabilidad de cada dato y degradarse con seguridad cuando una fuente falle o esté desactualizada.

## Principios

1. **Las Leñas es la fuente prioritaria.** Cuando el parte oficial publica un espesor para una zona, ese valor se presenta como referencia oficial y no se reemplaza por un promedio externo.
2. **Las fuentes externas completan y contrastan.** Cuando el valor oficial está ausente, se puede calcular una referencia externa a partir de reportes recientes.
3. **No se inventan cotas ni acumulaciones.** No se interpola la montaña media desde base y cumbre, no se convierte nieve pronosticada en nieve actual y no se suman nevadas históricas para estimar el espesor restante.
4. **Cada cifra debe ser trazable.** La interfaz mostrará la fuente, la fecha reportada, la fecha de consulta y el estado de frescura.
5. **Los fallos son parciales.** Una fuente caída o con HTML modificado no debe bloquear el pronóstico ni las demás observaciones.

## Fuentes

### 1. Las Leñas oficial

URL principal: `https://laslenas.com/estado-pistas/condiciones-del-tiempo/`

Campos disponibles:

- nieve pisada en base, intermedia y cumbre;
- nieve precipitada en las últimas 24 horas por zona;
- visibilidad por zona;
- temperatura, viento y dirección en sectores de la montaña.

Páginas complementarias:

- pistas: `https://laslenas.com/estado-pistas/`;
- medios: `https://laslenas.com/estado-pistas/medios/`;
- fuera de pista y riesgo de avalancha: `https://laslenas.com/estado-pistas/fuera-de-pista/`.

La fuente oficial puede publicar guiones o celdas vacías. Esos casos se normalizan como `null`, nunca como cero.

### 2. Snow-Forecast

URL: `https://www.snow-forecast.com/resorts/Las-Lenas/snow-report`

Campos previstos:

- profundidad superior;
- profundidad inferior;
- fecha de actualización;
- nieve nueva o última nevada significativa;
- condición de pista;
- medios y kilómetros abiertos cuando estén disponibles.

Las cifras modeladas por Snow-Forecast no se confundirán con observaciones. Solo los campos explícitamente presentados como snow depth o snow report entran al bloque de nieve actual.

### 3. Skiresort.info

URL: `https://www.skiresort.info/ski-resort/las-lenas/snow-report/`

Campos previstos:

- profundidad en montaña;
- profundidad en base;
- fecha de actualización;
- calidad de nieve;
- última nevada;
- medios y kilómetros abiertos.

### 4. OnTheSnow

URL: `https://www.onthesnow.com/argentina/las-lenas/skireport`

Campos previstos:

- profundidad en base;
- profundidad en cumbre;
- fecha del último parte;
- nieve reciente;
- medios y pistas abiertas;
- calidad de nieve.

Las unidades en pulgadas se convierten a centímetros con `1 in = 2.54 cm` y se redondean a una décima antes de la combinación.

## Arquitectura

La observación actual se implementará como un flujo separado del pronóstico numérico para aislar frecuencia, caché y fallos:

```text
React + TanStack Query
        │
        ├── GET /api/forecast       → Open-Meteo y modelos
        │
        └── GET /api/current-snow   → adaptadores de reportes
                                      ├── Las Leñas
                                      ├── Snow-Forecast
                                      ├── Skiresort.info
                                      └── OnTheSnow
```

Cada fuente tendrá un adaptador independiente que recibe HTML y devuelve un contrato normalizado. El agregador ejecutará los adaptadores con `Promise.allSettled`.

### Archivos previstos

```text
api/current-snow.ts
src/lib/current-snow/
  types.ts
  freshness.ts
  combine.ts
  service.ts
  sources/
    lasLenas.ts
    snowForecast.ts
    skiResortInfo.ts
    onTheSnow.ts
src/hooks/useCurrentSnow.ts
src/components/dashboard/CurrentSnowPanel.tsx
src/components/dashboard/CurrentSnowSources.tsx
```

Los nombres pueden ajustarse durante el plan de implementación si el patrón existente del repositorio requiere otra ubicación, pero se mantendrán las fronteras entre parsing, combinación, API y presentación.

## Contrato de datos

```ts
type ObservationZone = 'base' | 'mid' | 'summit';
type SourceKind = 'official' | 'external';
type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';
type TimestampKind = 'reported' | 'retrieved';

interface SnowObservation {
  sourceId: 'las-lenas' | 'snow-forecast' | 'skiresort-info' | 'onthesnow';
  sourceName: string;
  sourceKind: SourceKind;
  sourceUrl: string;
  zone: ObservationZone;
  elevationM: number | null;
  depthCm: number | null;
  newSnow24hCm: number | null;
  visibility: string | null;
  snowQuality: string | null;
  reportedAt: string | null;
  fetchedAt: string;
  timestampKind: TimestampKind;
  freshness: Freshness;
}

interface CurrentSnowZoneSummary {
  zone: ObservationZone;
  officialDepthCm: number | null;
  referenceDepthCm: number | null;
  referenceKind: 'official' | 'external-consensus' | 'single-external' | 'unavailable';
  externalMinCm: number | null;
  externalMaxCm: number | null;
  newSnow24hCm: number | null;
  observations: SnowObservation[];
}

interface CurrentSnowResponse {
  resort: 'Las Leñas';
  generatedAt: string;
  zones: CurrentSnowZoneSummary[];
  operations: {
    liftsOpen: number | null;
    liftsTotal: number | null;
    slopesOpenKm: number | null;
    slopesTotalKm: number | null;
    avalancheRisk: number | null;
  };
  sourceStatuses: Array<{
    sourceId: string;
    status: 'ok' | 'partial' | 'failed';
    fetchedAt: string;
    message: string | null;
  }>;
  warnings: string[];
}
```

## Normalización por zona

| Fuente | Base | Media | Cumbre |
| --- | --- | --- | --- |
| Las Leñas | Base | Intermedia | Cumbre |
| Snow-Forecast | Lower | No disponible | Upper |
| Skiresort.info | Base | No disponible | Mountain |
| OnTheSnow | Base | No disponible | Summit |

La cota media solo tendrá un valor de espesor si Las Leñas publica una medición explícita. No se interpolará entre base y cumbre.

## Frescura y timestamps

Se conservarán dos momentos distintos:

- `reportedAt`: fecha u hora que la propia fuente atribuye al parte;
- `fetchedAt`: momento en que nuestra función descargó la página.

Cuando una fuente no publique fecha, `reportedAt` será `null`, `timestampKind` será `retrieved` y la interfaz dirá “consultado” en vez de “medido”.

Clasificación:

- `fresh`: hasta 24 horas desde `reportedAt`;
- `aging`: más de 24 y hasta 72 horas;
- `stale`: más de 72 horas;
- `unknown`: no hay timestamp reportado confiable.

Las observaciones `stale` se muestran en el detalle de fuentes, pero no participan del valor combinado. Las observaciones `unknown` pueden mostrarse como dato individual, pero tampoco participan del consenso salvo que sean oficiales y la página tenga indicadores claros de actualización del día.

## Combinación

### Profundidad de nieve

Para cada zona:

1. Si Las Leñas publica `depthCm`, entonces:
   - `referenceDepthCm = officialDepthCm`;
   - `referenceKind = official`;
   - las externas se muestran como contraste y rango.
2. Si el oficial está ausente y existen al menos dos fuentes externas `fresh` o `aging`:
   - se usa la mediana;
   - `referenceKind = external-consensus`;
   - se muestran mínimo y máximo.
3. Si solo hay una fuente externa elegible:
   - se muestra su valor;
   - `referenceKind = single-external`;
   - la interfaz advierte que no hay consenso.
4. Si no hay datos elegibles:
   - `referenceDepthCm = null`;
   - `referenceKind = unavailable`.

No se aplicarán pesos numéricos ocultos. La prioridad oficial y la mediana externa son reglas visibles y reproducibles.

### Nieve nueva en 24 horas

- La medición oficial de Las Leñas tiene prioridad.
- Solo se combinarán fuentes externas que indiquen explícitamente un período de 24 horas.
- Un valor descrito como “última nevada”, “últimos días” o “48 horas” se muestra como contexto, pero no entra en `newSnow24hCm`.

### Operación de la estación

Los medios, kilómetros y pistas abiertas no se promediarán. Se mostrará el valor oficial cuando sea parseable. Las cifras externas quedarán en el detalle de cada fuente para revelar posibles diferencias de actualización.

## Obtención y parsing

- Las consultas se harán desde la función serverless, no desde el navegador, para evitar CORS y centralizar el caché.
- Se usará un parser HTML tolerante a cambios menores de estructura, priorizando etiquetas visibles y encabezados sobre selectores CSS profundamente anidados.
- Cada adaptador validará números, unidades, fechas y rangos plausibles.
- Un valor negativo, una celda vacía o un guion se transforman en `null`.
- No se eludirán protecciones, autenticación, CAPTCHAs ni bloqueos. Si una fuente impide el acceso automatizado, su estado será `failed` y el sistema continuará con las demás.
- La frecuencia será baja y compartida mediante CDN para respetar las fuentes.

## Caché

`/api/current-snow` enviará inicialmente:

```http
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=10800
```

Esto limita cada origen a aproximadamente una consulta por hora por región de caché y permite servir el último parte durante tres horas mientras se revalida.

El frontend usará TanStack Query con:

- `staleTime`: 60 minutos;
- actualización automática: 60 minutos;
- actualización manual mediante el control existente;
- conservación del último resultado válido ante un error posterior.

## Interfaz

La sección se ubicará después del encabezado y antes del resumen del pronóstico.

### Resumen principal

- Título: **Nieve actual reportada**.
- Tres tarjetas: Base, Intermedia y Cumbre.
- Valor grande de profundidad de referencia.
- Etiqueta de origen: `Oficial`, `Consenso externo`, `Una fuente` o `Sin dato`.
- Nieve nueva de 24 horas cuando exista.
- Hora o antigüedad del parte.
- Rango externo cuando haya más de una fuente elegible.

### Detalle de fuentes

Un panel expandible mostrará una fila por fuente con:

- profundidad;
- nieve nueva y su período;
- fecha reportada;
- frescura;
- calidad de nieve;
- enlace a la fuente.

La diferencia entre **profundidad actual** y **nieve pronosticada** tendrá una explicación visible. El texto nunca usará “acumulado” sin aclarar si se trata de manto reportado o precipitación futura.

### Estados

- Carga independiente del pronóstico para que la página siga siendo útil mientras se consultan reportes.
- Error parcial con chips por fuente.
- Sin dato oficial con referencia externa disponible.
- Todo desactualizado.
- Todas las fuentes caídas.

## Accesibilidad

- Las tarjetas usarán encabezados y definiciones semánticas.
- El estado de frescura no dependerá solo del color.
- El detalle de fuentes será navegable por teclado.
- Los enlaces externos indicarán el nombre de la fuente.
- Los números tendrán texto alternativo completo, por ejemplo “35 centímetros de profundidad reportada en cumbre”.

## Pruebas

### Unitarias

- conversión pulgadas a centímetros;
- parsing de guiones y celdas vacías;
- parsing de fechas en español e inglés;
- asignación de zonas por fuente;
- clasificación de frescura;
- prioridad del dato oficial;
- mediana y rango de fuentes externas;
- exclusión de datos vencidos;
- ausencia de interpolación para montaña media;
- nieve de 24 horas separada de períodos distintos.

### Adaptadores

Cada parser tendrá fixtures HTML mínimos y pruebas para:

- respuesta normal;
- campos ausentes;
- estructura parcialmente modificada;
- unidades métricas e imperiales;
- fechas ausentes;
- contenido no reconocido.

### API

- `GET` exitoso con cuatro fuentes;
- respuesta degradada con una o más fuentes fallidas;
- error estructurado cuando todas fallan;
- cabeceras de caché;
- rechazo de métodos distintos de `GET`.

### Interfaz

- muestra dato oficial cuando existe;
- muestra consenso externo cuando falta el oficial;
- muestra una sola fuente con advertencia;
- marca datos vencidos;
- mantiene el pronóstico visible aunque falle la nieve actual;
- abre y cierra el detalle de fuentes.

## Observabilidad

La función registrará únicamente metadatos operativos:

- fuente;
- duración;
- estado;
- cantidad de campos parseados;
- tipo de error.

No se guardará el HTML completo en logs. Los errores de parsing incluirán suficiente contexto para detectar que una fuente cambió su estructura sin exponer contenido innecesario.

## Seguridad y límites

- Las URLs serán constantes internas; el endpoint no aceptará URLs suministradas por usuarios, evitando SSRF.
- Se validarán tamaños de respuesta y tiempos máximos por fuente.
- Se usarán timeouts y cancelación de fetch.
- La función no almacenará credenciales.
- No se presentará el valor combinado como medición instrumental ni como parte oficial.

## No objetivos

Esta versión no incluirá:

- sensores propios;
- imágenes satelitales para estimar profundidad;
- interpolación de espesor por altitud;
- historial persistente en una base de datos;
- contribuciones manuales de usuarios;
- alertas por cambios de profundidad;
- predicción de riesgo de avalancha distinta del índice oficial publicado.

## Criterios de aceptación

1. La página muestra una sección de nieve actual separada del pronóstico.
2. Las Leñas aparece primero y se identifica como fuente oficial.
3. Base y cumbre pueden usar una mediana externa cuando falta el valor oficial.
4. Intermedia nunca se estima desde otras cotas.
5. Cada cifra incluye fuente y antigüedad.
6. Los reportes de más de 72 horas no participan del consenso.
7. Una fuente fallida no bloquea las demás ni el pronóstico.
8. La API y la interfaz tienen pruebas de estados normales, parciales y vacíos.
9. El despliegue de Vercel continúa vinculado a `wallealv/nieve` y se activa desde `main` después del merge.
