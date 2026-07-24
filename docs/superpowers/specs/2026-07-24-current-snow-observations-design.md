# Diseño — Nieve actual observada

Fecha: 2026-07-24

## Objetivo

Agregar al Las Leñas Snow Monitor una sección de **nieve actual** que muestre la profundidad reportada del manto y la nieve nueva observada, separándolas claramente del pronóstico futuro. La función combinará el parte oficial de Las Leñas con fuentes externas, conservará la trazabilidad de cada dato y seguirá funcionando cuando una fuente falle o esté desactualizada.

## Principios

1. **Las Leñas es la fuente prioritaria.** Cuando el parte oficial publica un espesor para una zona, ese valor se presenta como referencia oficial y no se reemplaza por un promedio externo.
2. **Las fuentes externas completan y contrastan.** Cuando el valor oficial está ausente, se puede calcular una referencia externa a partir de reportes recientes e independientes.
3. **No se cuentan copias como fuentes independientes.** Dos páginas que reutilizan el mismo parte o la misma red de datos no generan por sí solas un consenso.
4. **No se inventan cotas ni acumulaciones.** No se interpola la montaña media desde base y cumbre, no se convierte nieve pronosticada en nieve actual y no se suman nevadas históricas para estimar el espesor restante.
5. **Cada cifra debe ser trazable.** La interfaz mostrará fuente, fecha reportada, fecha de consulta y estado de frescura.
6. **Los fallos son parciales.** Una fuente caída o con HTML modificado no debe bloquear el pronóstico ni las demás observaciones.

## Fuentes

### Las Leñas oficial

URL principal: `https://laslenas.com/estado-pistas/condiciones-del-tiempo/`

Campos:

- nieve pisada en base, intermedia y cumbre;
- nieve precipitada en las últimas 24 horas por zona;
- visibilidad por zona;
- temperatura, viento y dirección en sectores de la montaña.

Páginas complementarias:

- pistas: `https://laslenas.com/estado-pistas/`;
- medios: `https://laslenas.com/estado-pistas/medios/`;
- fuera de pista y riesgo de avalancha: `https://laslenas.com/estado-pistas/fuera-de-pista/`.

Los guiones y celdas vacías se normalizan como `null`, nunca como cero.

### Snow-Forecast

URL: `https://www.snow-forecast.com/resorts/Las-Lenas/snow-report`

Campos:

- profundidad superior e inferior;
- fecha de actualización;
- nieve nueva o última nevada significativa;
- condición de pista;
- medios y kilómetros abiertos cuando estén disponibles.

Las cifras modeladas no se confundirán con observaciones. Solo los campos explícitamente presentados como profundidad o parte de nieve entran al bloque actual.

### Skiresort.info

URL: `https://www.skiresort.info/ski-resort/las-lenas/snow-report/`

Campos:

- profundidad en montaña y base;
- fecha de actualización;
- calidad de nieve;
- última nevada;
- medios y kilómetros abiertos.

### OnTheSnow

URL: `https://www.onthesnow.com/argentina/las-lenas/skireport`

Campos:

- profundidad en base y cumbre;
- fecha del último parte;
- nieve reciente;
- medios y pistas abiertas;
- calidad de nieve.

Las pulgadas se convierten a centímetros con `1 in = 2.54 cm` y se redondean a una décima antes de combinar.

## Arquitectura

La observación actual será un flujo separado del pronóstico para aislar frecuencia, caché y fallos:

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

Cada fuente tendrá un adaptador independiente que recibe HTML y devuelve un contrato normalizado. El agregador los ejecutará con `Promise.allSettled`.

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

## Contrato de datos

```ts
type ObservationZone = 'base' | 'mid' | 'summit';
type SourceKind = 'official' | 'external';
type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';
type TimestampKind = 'reported' | 'retrieved';

type ProvenanceGroup =
  | 'las-lenas-official'
  | 'skiresort-network'
  | 'onthesnow-network'
  | 'independent';

interface SnowObservation {
  sourceId: 'las-lenas' | 'snow-forecast' | 'skiresort-info' | 'onthesnow';
  sourceName: string;
  sourceKind: SourceKind;
  sourceUrl: string;
  provenanceGroup: ProvenanceGroup;
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
  independentSourceCount: number;
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

La cota media solo tendrá espesor si Las Leñas publica una medición explícita. No se interpolará.

## Frescura y timestamps

Se conservarán:

- `reportedAt`: fecha u hora atribuida por la fuente al parte;
- `fetchedAt`: momento en que la función descargó la página.

Cuando no haya fecha, `reportedAt` será `null`, `timestampKind` será `retrieved` y la interfaz dirá “consultado” en vez de “medido”.

Clasificación:

- `fresh`: hasta 24 horas desde `reportedAt`;
- `aging`: más de 24 y hasta 72 horas;
- `stale`: más de 72 horas;
- `unknown`: no hay timestamp reportado confiable.

Los datos `stale` se muestran en el detalle, pero no participan del combinado. Los datos `unknown` tampoco participan del consenso externo. Un dato oficial sin timestamp puede mostrarse como oficial recuperado en el día, pero se marcará como hora de medición desconocida.

## Independencia y duplicados

Antes de combinar, el servicio agrupará observaciones por `provenanceGroup`.

- Snow-Forecast y Skiresort.info pueden compartir o redistribuir el mismo parte; por defecto pertenecerán a `skiresort-network` hasta que la evidencia del contenido indique un origen independiente.
- Un reporte externo que declare origen directo del centro puede mostrarse, pero no se considera independiente del parte oficial para formar consenso.
- Valores idénticos con la misma fecha, zonas equivalentes y textos operativos coincidentes se marcarán como posibles duplicados.
- Dentro de un mismo grupo de procedencia se elegirá la observación más reciente y completa. Las demás seguirán visibles en el detalle, pero no aumentarán `independentSourceCount`.

## Combinación

### Profundidad

Para cada zona:

1. Si Las Leñas publica `depthCm`:
   - `referenceDepthCm = officialDepthCm`;
   - `referenceKind = official`;
   - las externas se muestran como contraste.
2. Si falta el oficial y hay al menos dos grupos de procedencia externos elegibles:
   - se toma un valor representativo por grupo;
   - se usa la mediana de esos valores;
   - `referenceKind = external-consensus`;
   - se muestran mínimo y máximo.
3. Si solo hay un grupo externo elegible:
   - se muestra su valor;
   - `referenceKind = single-external`;
   - se advierte que no existe consenso independiente.
4. Sin datos elegibles:
   - `referenceDepthCm = null`;
   - `referenceKind = unavailable`.

No habrá pesos ocultos. La prioridad oficial, la deduplicación por procedencia y la mediana son reglas visibles y reproducibles.

### Nieve nueva en 24 horas

- El dato oficial tiene prioridad.
- Solo se combinarán fuentes externas que indiquen explícitamente un período de 24 horas.
- “Última nevada”, “últimos días” o “48 horas” se muestran como contexto, pero no entran en `newSnow24hCm`.

### Operación de la estación

Medios, kilómetros y pistas abiertas no se promedian. Se usa el valor oficial cuando sea parseable. Las cifras externas quedan en el detalle.

## Obtención y parsing

- Las consultas se hacen desde la función serverless para evitar CORS y centralizar caché.
- El parser prioriza etiquetas visibles y encabezados sobre selectores profundamente anidados.
- Cada adaptador valida números, unidades, fechas y rangos plausibles.
- Valores negativos, vacíos o guiones se transforman en `null`.
- No se eluden autenticación, CAPTCHAs ni bloqueos. Una fuente bloqueada queda `failed`.
- Las URLs son constantes internas y cada fetch tiene timeout, límite de tamaño y cancelación.
- La frecuencia será baja y compartida mediante CDN.

## Caché

`/api/current-snow` enviará:

```http
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=10800
```

El frontend usará TanStack Query con `staleTime` y actualización automática de 60 minutos, actualización manual y conservación del último resultado válido.

## Interfaz

La sección se ubicará después del encabezado y antes del pronóstico.

### Resumen

- Título: **Nieve actual reportada**.
- Tarjetas para Base, Intermedia y Cumbre.
- Profundidad de referencia.
- Etiqueta: `Oficial`, `Consenso externo`, `Una red externa` o `Sin dato`.
- Nieve nueva de 24 horas cuando exista.
- Antigüedad del parte.
- Rango externo y cantidad de fuentes independientes.

### Detalle de fuentes

Un panel expandible mostrará por fuente:

- profundidad;
- nieve nueva y período;
- fecha reportada;
- frescura;
- calidad de nieve;
- procedencia compartida cuando corresponda;
- enlace a la fuente.

La interfaz explicará la diferencia entre profundidad actual y nieve pronosticada. Nunca usará “acumulado” sin aclarar si es manto reportado o precipitación futura.

### Estados

- Carga independiente del pronóstico.
- Error parcial por fuente.
- Sin dato oficial con referencia externa.
- Fuentes duplicadas sin consenso independiente.
- Todo desactualizado.
- Todas las fuentes caídas.

## Accesibilidad

- Encabezados y definiciones semánticas.
- La frescura no depende solo del color.
- Panel navegable por teclado.
- Enlaces con nombre de fuente.
- Texto alternativo completo para cifras.

## Pruebas

### Unitarias

- pulgadas a centímetros;
- guiones y celdas vacías;
- fechas en español e inglés;
- zonas por fuente;
- frescura;
- prioridad oficial;
- mediana y rango externos;
- deduplicación por grupo de procedencia;
- exclusión de vencidos;
- ausencia de interpolación en montaña media;
- separación de nieve de 24 horas y otros períodos.

### Adaptadores

Cada parser tendrá fixtures para respuesta normal, campos ausentes, cambios parciales de estructura, unidades métricas e imperiales, fechas ausentes y contenido no reconocido.

### API

- éxito con cuatro páginas;
- degradación con fuentes fallidas;
- duplicados que no inflan el consenso;
- error estructurado cuando todas fallan;
- caché;
- rechazo de métodos no GET.

### Interfaz

- dato oficial;
- consenso externo independiente;
- una sola red externa con advertencia;
- datos vencidos;
- pronóstico visible si falla nieve actual;
- detalle expandible.

## Observabilidad

Se registrarán fuente, duración, estado, cantidad de campos parseados y tipo de error. No se guardará HTML completo en logs.

## Seguridad y límites

- El endpoint no acepta URLs de usuarios, evitando SSRF.
- Se validan tamaño de respuesta y timeout.
- No se almacenan credenciales.
- No se presenta el combinado como medición instrumental ni como parte oficial.
- Se respetan bloqueos y condiciones de acceso de cada fuente.

## No objetivos

- sensores propios;
- estimación satelital;
- interpolación por altitud;
- historial persistente;
- reportes manuales de usuarios;
- alertas por profundidad;
- un riesgo de avalancha calculado por la app.

## Criterios de aceptación

1. La nieve actual está separada del pronóstico.
2. Las Leñas aparece primero como fuente oficial.
3. Base y cumbre pueden usar mediana externa cuando falta el oficial.
4. El consenso exige al menos dos grupos de procedencia independientes.
5. Intermedia nunca se estima.
6. Cada cifra incluye fuente y antigüedad.
7. Datos de más de 72 horas no participan del combinado.
8. Una fuente fallida no bloquea las demás ni el pronóstico.
9. Hay pruebas de parsing, deduplicación, combinación, API e interfaz.
10. Vercel continúa desplegando desde `wallealv/nieve` rama `main` después del merge.
