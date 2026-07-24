# Las Leñas Snow Monitor

Panel web responsive para consultar **nieve actual reportada** y el pronóstico de nieve de Las Leñas por nivel de montaña. El pronóstico combina corridas individuales de **ECMWF IFS**, **NOAA GFS** y **DWD ICON**; la nieve actual consulta el parte oficial y reportes externos con reglas explícitas de frescura y procedencia.

## Qué muestra

### Nieve actual reportada

- Profundidad actual del manto en base, intermedia y cumbre cuando una fuente publica la medición.
- Nieve nueva de las últimas 24 horas cuando el período está declarado explícitamente.
- Las Leñas oficial como fuente prioritaria.
- Snow-Forecast, Skiresort.info y OnTheSnow como contraste o referencia cuando falta el dato oficial.
- Rango externo y mediana únicamente entre procedencias independientes.
- Fecha reportada, fecha de consulta, frescura y enlace a cada fuente.
- Funcionamiento degradado: una página caída no bloquea las demás ni el pronóstico.

**La profundidad actual y la nieve pronosticada son métricas distintas.** La profundidad describe el manto informado por una fuente; el pronóstico estima precipitación futura y no se suma automáticamente al manto existente.

### Pronóstico

- Base, montaña media y alta montaña como puntos meteorológicos independientes.
- Nieve estimada para 24 horas, 72 horas, 7 días y 15 días.
- Mediana multimodelo, mínimo y máximo por día.
- Valores individuales de ECMWF, GFS e ICON.
- Temperatura, viento, ráfagas y cota de congelación.
- Perfil vertical de la montaña.
- Estado de cada modelo y funcionamiento degradado si una fuente falla.
- Actualización automática cada tres horas y actualización manual.

## Cómo se combina la nieve actual

1. Si Las Leñas publica profundidad para una zona, ese valor se muestra como **Dato oficial**.
2. Si falta el oficial y hay dos procedencias externas recientes, se muestra su mediana como **Consenso externo** y también el rango mínimo–máximo.
3. Si solo queda una procedencia externa, se muestra como referencia orientativa y se advierte que no existe consenso.
4. Los reportes externos de más de 72 horas no entran al combinado.
5. Snow-Forecast y Skiresort.info se consideran una misma red de procedencia para evitar contar dos veces un parte redistribuido.
6. La montaña intermedia nunca se estima a partir de base y cumbre.

Frescura de reportes:

| Estado | Antigüedad reportada | Participa del combinado externo |
| --- | ---: | --- |
| Reciente | Hasta 24 h | Sí |
| 24–72 h | Más de 24 h y hasta 72 h | Sí |
| Antiguo | Más de 72 h | No |
| Hora desconocida | Sin timestamp confiable | No |

## Cómo interpretar los 15 días

| Horizonte | Modelos principales | Uso recomendado |
| --- | --- | --- |
| Días 0–7 | ECMWF + GFS + ICON | Pronóstico operativo |
| Días 8–10 | ECMWF + GFS | Tendencia extendida |
| Días 11–15 | ECMWF + GFS | Escenario orientativo de baja confianza |

Los centímetros de los días 11–15 no deben interpretarse como una predicción local precisa. En ese tramo importa más la persistencia de la señal entre corridas que el valor exacto.

## Arquitectura

```text
React + Vite + TanStack Query
            │
            ├── GET /api/forecast
            │       └── Open-Meteo
            │           ├─ ECMWF IFS
            │           ├─ NOAA GFS
            │           └─ DWD ICON
            │
            └── GET /api/current-snow
                    ├─ Las Leñas oficial
                    ├─ Snow-Forecast
                    ├─ Skiresort.info
                    └─ OnTheSnow
```

Ambos endpoints usan `Promise.allSettled`. Los parsers de nieve actual trabajan con etiquetas visibles, validan unidades y fechas y conservan el último resultado válido en el cliente cuando una actualización posterior falla.

## Cotas configuradas

| Nivel | Elevación | Uso en la app |
| --- | ---: | --- |
| Base | 2.240 m | Valle, accesos y profundidad inferior |
| Montaña media | 2.800 m | Referencia central; profundidad solo si el parte oficial la publica |
| Alta montaña | 3.430 m | Sectores altos y profundidad superior |

Las coordenadas son puntos representativos aproximados y se centralizan en `src/config/mountain.ts`.

## Desarrollo local

Requiere Node.js 22.12 o posterior.

```bash
npm install
npm run dev
```

Vite monta localmente la misma lógica de `/api/forecast` y `/api/current-snow`.

## Verificación

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Las pruebas cubren:

- mediana, rango y tratamiento de datos ausentes;
- clasificación de horizontes y confianza;
- normalización horaria a diaria;
- acumulaciones de 24 y 72 horas;
- degradación cuando falla un modelo meteorológico;
- parsing de las cuatro fuentes de nieve actual;
- frescura, deduplicación por procedencia y prioridad oficial;
- fallos parciales y totales del nuevo endpoint;
- estados normales, degradados y de error de la interfaz.

## Caché y actualización

`/api/forecast`:

```http
Cache-Control: public, max-age=0, s-maxage=10800, stale-while-revalidate=1800
```

`/api/current-snow`:

```http
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=10800
```

El pronóstico se reutiliza durante tres horas. Los reportes actuales se consultan como máximo aproximadamente una vez por hora por región de caché y pueden servirse temporalmente mientras se revalidan.

## Despliegue en Vercel

El proyecto está preparado para Vite y Vercel Functions. No necesita variables de entorno. Al estar vinculado a GitHub, cada cambio mergeado en `main` genera un nuevo despliegue de producción.

## Fuentes y atribución

- Parte oficial: [Las Leñas](https://laslenas.com/estado-pistas/condiciones-del-tiempo/)
- Reportes externos: [Snow-Forecast](https://www.snow-forecast.com/resorts/Las-Lenas/snow-report), [Skiresort.info](https://www.skiresort.info/ski-resort/las-lenas/snow-report/) y [OnTheSnow](https://www.onthesnow.com/argentina/las-lenas/skireport)
- Datos meteorológicos: [Open-Meteo](https://open-meteo.com/)
- Modelos: [ECMWF IFS](https://open-meteo.com/en/docs/ecmwf-api), [NOAA GFS](https://open-meteo.com/en/docs/gfs-api) y [DWD ICON](https://open-meteo.com/en/docs/dwd-api)

Antes de un uso comercial, revisá las condiciones de licencia, atribución y automatización de cada proveedor.

## Limitaciones

- Los reportes pueden diferir por hora, cota, compactación y método de medición.
- Una fuente puede cambiar su HTML o bloquear consultas automáticas; la app la marca como no disponible y continúa con las demás.
- La nieve nueva, la profundidad pisada y la profundidad fuera de pista no son equivalentes.
- No incorpora todavía historial propio de espesores ni validación manual con webcams.
- No reemplaza el parte oficial, el estado de medios ni los avisos de seguridad y avalanchas.
- El índice de confianza meteorológico es una métrica interna de acuerdo, cobertura y horizonte; no es una probabilidad oficial.
