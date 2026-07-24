# Las Leñas Snow Monitor

Panel web responsive para consultar el pronóstico de nieve de Las Leñas por nivel de montaña. Combina corridas individuales de **ECMWF IFS**, **NOAA GFS** y **DWD ICON**, muestra la dispersión entre modelos y reduce explícitamente la confianza a medida que aumenta el horizonte.

## Qué muestra

- Base, montaña media y alta montaña como puntos meteorológicos independientes.
- Nieve estimada para 24 horas, 72 horas, 7 días y 15 días.
- Mediana multimodelo, mínimo y máximo por día.
- Valores individuales de ECMWF, GFS e ICON.
- Temperatura, viento, ráfagas y cota de congelación.
- Perfil vertical de la montaña.
- Estado de cada modelo y funcionamiento degradado si una fuente falla.
- Actualización automática cada tres horas y actualización manual.

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
            ▼
      GET /api/forecast
            │
            ▼
Vercel Function ──► Open-Meteo
                   ├─ ECMWF IFS
                   ├─ NOAA GFS
                   └─ DWD ICON
```

La función serverless realiza nueve consultas en paralelo —tres modelos por tres cotas—, normaliza las series horarias, agrega valores diarios y devuelve un único contrato. Usa `Promise.allSettled`, por lo que un fallo individual no bloquea toda la aplicación.

## Cotas configuradas

| Nivel | Elevación | Uso en la app |
| --- | ---: | --- |
| Base | 2.240 m | Condiciones cercanas al valle y accesos |
| Montaña media | 2.800 m | Referencia central del dominio esquiable |
| Alta montaña | 3.430 m | Sectores altos y señal de nieve más fría |

Las coordenadas son puntos representativos aproximados y se centralizan en `src/config/mountain.ts` para poder ajustarlas sin modificar la lógica.

## Desarrollo local

Requiere Node.js 22.12 o posterior.

```bash
npm install
npm run dev
```

Vite expone el frontend y, durante el desarrollo, monta la misma lógica de `/api/forecast` mediante un plugin local.

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
- degradación cuando falla un modelo;
- ausencia de ICON fuera de su horizonte;
- respuestas HTTP y caché de la función serverless;
- interacción principal del dashboard.

## Despliegue en Vercel

1. Importar este repositorio en Vercel.
2. Mantener el preset de Vite detectado automáticamente.
3. Ejecutar el despliegue sin variables de entorno.

El endpoint envía:

```http
Cache-Control: public, max-age=0, s-maxage=10800, stale-while-revalidate=1800
```

De esta forma, las corridas se reutilizan durante tres horas en el CDN y pueden servirse temporalmente mientras se actualizan.

## Fuentes y atribución

- Datos meteorológicos: [Open-Meteo](https://open-meteo.com/)
- Modelos: [ECMWF IFS](https://open-meteo.com/en/docs/ecmwf-api), [NOAA GFS](https://open-meteo.com/en/docs/gfs-api) y [DWD ICON](https://open-meteo.com/en/docs/dwd-api)
- Elevaciones de referencia: [Las Leñas](https://www.laslenas.com/)

Antes de un uso comercial, revisá las condiciones de licencia y atribución de Open-Meteo y de los proveedores de cada modelo.

## Limitaciones

- No reemplaza el parte oficial del centro de esquí ni los avisos de seguridad.
- No incorpora estado de medios, rutas, control de avalanchas ni nieve observada.
- No guarda historial de corridas en esta primera versión.
- El índice de confianza es una métrica interna de acuerdo, cobertura y horizonte; no es una probabilidad meteorológica oficial.
