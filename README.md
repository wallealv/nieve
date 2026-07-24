# Las Leñas Snow Monitor

Panel web responsive para consultar **nieve actual reportada**, operación oficial y pronóstico multimodelo por nivel de montaña. Combina **ECMWF IFS**, **NOAA GFS** y **DWD ICON**, detecta tormentas continuas y conserva un historial local de corridas.

## Qué muestra

### Resumen de la próxima tormenta

- Evento de nieve más importante dentro de los próximos siete días.
- Inicio, final, duración y día de mayor intensidad.
- Acumulación central y rango entre modelos para base, montaña media y alta montaña.
- Confianza del evento, viento, ráfagas y rango de cota de congelación.
- Clasificación moderada, fuerte o muy fuerte según el acumulado en alta montaña.

La detección agrupa días consecutivos con nieve y permite un único día intermedio débil cuando forma parte del mismo evento. No destaca automáticamente el primer centímetro aislado.

### Nieve actual reportada

- Profundidad actual del manto en base, intermedia y cumbre cuando una fuente publica la medición.
- Nieve nueva de las últimas 24 horas cuando el período está declarado explícitamente.
- Las Leñas oficial como fuente prioritaria.
- Snow-Forecast, Skiresort.info y OnTheSnow como contraste o referencia.
- Rango externo y mediana únicamente entre procedencias independientes.
- Fecha reportada, fecha de consulta, frescura y enlace a cada fuente.
- Funcionamiento degradado: una página caída no bloquea las demás ni el pronóstico.

**La profundidad actual y la nieve pronosticada son métricas distintas.** La profundidad describe el manto informado por una fuente; el pronóstico estima precipitación futura y no se suma automáticamente al manto existente.

### Operación oficial

Cuando la web de Las Leñas expone estados interpretables, la app muestra:

- medios abiertos, condicionales y totales;
- pistas abiertas y totales;
- estado de fuera de pista;
- riesgo de avalancha y observaciones oficiales.

Los parsers son conservadores: un estado ambiguo se devuelve como ausente, nunca como cerrado por defecto.

### Pronóstico

- Base, montaña media y alta montaña como puntos meteorológicos independientes.
- Nieve estimada para 24 horas, 72 horas, 7 días y 15 días.
- Mediana multimodelo, mínimo y máximo por día.
- Valores individuales de ECMWF, GFS e ICON.
- Temperatura, viento, ráfagas y cota de congelación.
- Perfil vertical de la montaña.
- Estado de cada modelo y funcionamiento degradado si una fuente falla.
- Actualización automática cada tres horas y actualización manual.

La API realiza una sola solicitud multiubicación por modelo: tres llamadas principales por actualización normal en lugar de nueve. Los errores 429 y 5xx reciben un reintento breve antes de degradar el modelo.

### Historial local

- Conserva hasta 30 corridas durante un máximo de 45 días.
- Muestra si el acumulado a siete días subió o bajó frente a la corrida anterior.
- Guarda acumulados por modelo y por cota.
- Compara de forma orientativa una previsión previa con la nieve nueva observada cuando las fechas coinciden.

El historial usa `localStorage`: existe únicamente en el navegador y dispositivo donde se abrió la app.

### Alertas locales

Valores iniciales:

- 25 cm en 72 horas;
- 40 cm en 7 días;
- confianza mínima Media;
- cualquier cota.

El usuario puede cambiar umbrales, confianza y cota. La app evalúa las reglas cuando se abre o actualiza y puede usar la Web Notifications API si el navegador concede permiso.

**No hay notificaciones de servidor con la app cerrada.** Eso requeriría persistencia remota, suscripciones web push y un proceso programado.

## Cómo se combina la nieve actual

1. Si Las Leñas publica profundidad para una zona, ese valor se muestra como **Dato oficial**.
2. Si falta el oficial y hay dos procedencias externas recientes, se muestra su mediana como **Consenso externo** y también el rango mínimo–máximo.
3. Si solo queda una procedencia externa, se muestra como referencia orientativa y se advierte que no existe consenso.
4. Los reportes externos de más de 72 horas no entran al combinado.
5. Snow-Forecast y Skiresort.info se consideran una misma red de procedencia para evitar contar dos veces un parte redistribuido.
6. La montaña intermedia nunca se estima a partir de base y cumbre.

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
            │           ├─ ECMWF: base + media + cumbre
            │           ├─ GFS: base + media + cumbre
            │           └─ ICON: base + media + cumbre
            │
            └── GET /api/current-snow
                    ├─ Las Leñas: tiempo, medios, pistas y fuera de pista
                    ├─ Snow-Forecast
                    ├─ Skiresort.info
                    └─ OnTheSnow
```

Los componentes gráficos se cargan de forma diferida. Vite separa React y las dependencias de gráficos para reducir el JavaScript inicial.

## Cotas configuradas

| Nivel | Elevación | Uso en la app |
| --- | ---: | --- |
| Base | 2.240 m | Valle, accesos y profundidad inferior |
| Montaña media | 2.800 m | Referencia central; profundidad solo si una fuente la publica |
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
- respuestas multiubicación y reintentos de Open-Meteo;
- degradación cuando falla un modelo meteorológico;
- agrupación y clasificación de tormentas;
- parsing de fuentes de nieve y estados operativos;
- frescura, deduplicación por procedencia y prioridad oficial;
- retención y deduplicación del historial local;
- evaluación de alertas por cota, confianza y ventana temporal;
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

## Despliegue en Vercel

El proyecto está preparado para Vite y Vercel Functions. No necesita variables de entorno. La rama de desarrollo `feat/snow-monitor-v2` tiene los previews automáticos deshabilitados para no consumir despliegues durante la implementación; el merge a `main` genera el despliegue de producción.

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
- El historial y las alertas no se sincronizan entre dispositivos.
- La comparación pronóstico–observación es orientativa porque las cotas y métodos pueden diferir.
- No reemplaza el parte oficial, el estado de caminos ni los avisos de seguridad y avalanchas.
- El índice de confianza meteorológico es una métrica interna de acuerdo, cobertura y horizonte; no es una probabilidad oficial.
