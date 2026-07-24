# Las Leñas Snow Monitor

Panel web responsive y PWA para decidir **cuándo subir, en qué cota esquiar y qué calidad de nieve esperar** en Las Leñas. Combina nieve actual reportada, operación oficial, estado de la RP 222 y pronóstico multimodelo de **ECMWF IFS, NOAA GFS y DWD ICON**.

La v3 funciona sin login y sin Supabase. Historial, preferencias, favoritos y alertas se guardan únicamente en el dispositivo.

## Funciones principales

### Próxima tormenta

- Detecta el evento de nieve más importante de los próximos siete días.
- Muestra inicio, final, duración y pico estimado.
- Separa Base, Montaña media y Alta montaña.
- Presenta mediana multimodelo, rango y confianza.
- Incluye viento, ráfagas y cota de congelación.

### Pronóstico horario de 72 horas

- Datos horarios internos y visualización en bloques de tres horas.
- Nieve, lluvia, precipitación y probabilidad.
- Temperatura, sensación térmica, humedad y punto de rocío.
- Viento, dirección, ráfagas, visibilidad y nubosidad.
- Radiación, cota de congelación y día/noche.
- Consenso tolerante a la caída de uno de los modelos.

### Fase y calidad estimada

La app clasifica conservadoramente cada ventana como:

- lluvia;
- mezcla;
- nieve húmeda;
- nieve seca;
- sin precipitación;
- incierta.

También estima polvo seco, polvo denso, nieve húmeda, nieve venteada, compactación, costra/hielo o corn posible. Estas etiquetas son inferencias meteorológicas explicables, no observaciones del terreno.

### Scores y mejores ventanas

Calcula puntajes de 0 a 100 para:

- **Powder:** nieve nueva, proporción nocturna, temperatura, lluvia, viento y profundidad observada.
- **Pista:** visibilidad, ráfagas, temperatura, lluvia, hielo, radiación y operación.
- **Freeride:** nieve nueva, calidad, viento, visibilidad, riesgo de avalancha y estado oficial de fuera de pista.

Si fuera de pista está cerrado oficialmente, el Freeride Score queda bloqueado. Los scores nunca reemplazan el parte oficial ni las decisiones de seguridad.

### Nieve actual reportada

- Las Leñas oficial como fuente prioritaria.
- Snow-Forecast, Skiresort.info y OnTheSnow como contraste.
- Profundidad por Base, Media y Cumbre cuando existe una medición explícita.
- Nieve nueva de 24 horas únicamente cuando el período está declarado.
- Fecha reportada, fecha de consulta y frescura.
- Consenso externo solo entre procedencias independientes y recientes.
- Una fuente caída no bloquea las demás ni el pronóstico.

La profundidad actual y la nieve futura son métricas diferentes. La app no suma automáticamente precipitación pronosticada al manto reportado.

### Operación y acceso

- Medios y pistas abiertos cuando Las Leñas publica datos interpretables.
- Riesgo oficial de avalancha.
- Estado oficial de fuera de pista y cambios desde la consulta anterior.
- Estado de la RP 222, cadenas, maquinaria y riesgos mencionados.
- Resaltado de cambios viales guardando el último estado localmente.
- Acceso seguro a la webcam oficial, aun cuando no pueda embeberse.

### Evolución de modelos

Compara la corrida actual y hasta dos corridas anteriores por modelo. Informa si el pronóstico está:

- subiendo;
- bajando;
- estable;
- convergiendo;
- divergiendo;
- con datos insuficientes.

La ausencia de una corrida archivada no hace fallar el endpoint completo.

### Referencia histórica modelada

Compara el pronóstico de siete días con una muestra histórica de la misma semana del año usando Open-Meteo Historical Weather API / ERA5.

Muestra promedio, mediana, mínimo, máximo y cantidad de temporadas. Es una referencia modelada de nieve nueva; no es espesor observado ni una garantía del microclima de Las Leñas.

### Comparador regional

Compara siete centros mediante coordenadas representativas de base y cumbre:

- Las Leñas;
- Catedral;
- Chapelco;
- Cerro Castor;
- Valle Nevado;
- La Parva;
- El Colorado.

El ranking considera nieve en 72 horas y siete días, confianza, viento y riesgo de lluvia en base. Cada posición explica qué factores suman y cuáles penalizan. Los favoritos se guardan localmente.

### Mapa regional lazy

- No solicita datos hasta que el usuario abre el mapa.
- Usa 14 puntos preconfigurados de base/cumbre.
- Permite cambiar entre 6, 12, 24, 48 y 72 horas.
- Usa ECMWF como guía visual orientativa.
- Se renderiza como SVG liviano, sin motor cartográfico pesado.

### Alertas locales

Se evalúan al abrir o actualizar la app:

- nieve en 72 horas;
- nieve en siete días;
- confianza mínima;
- ráfagas;
- lluvia en Base;
- cambio de RP 222;
- cambio de fuera de pista;
- variación fuerte entre corridas.

Pueden usar Web Notifications si el navegador concede permiso. **No son Web Push con la aplicación cerrada.**

### PWA y modo offline

- Manifest e iconos propios.
- Instalación en escritorio, Android y pantalla de inicio de iPhone.
- Service worker con caché del shell.
- `stale-while-revalidate` para respuestas JSON.
- Último dato válido disponible sin conexión cuando ya fue consultado.
- Aviso cuando existe una versión nueva para recargar.

## Persistencia local

Se usa un adaptador versionado sobre `localStorage` e IndexedDB para:

- historial de hasta 30 snapshots;
- configuración de alertas;
- cota y período elegidos;
- centros favoritos;
- último estado de ruta y fuera de pista;
- deduplicación de notificaciones.

La sección de datos locales permite exportar o borrar solo la información perteneciente a Snow Monitor. Los datos no se sincronizan entre dispositivos.

## Arquitectura

```text
React + Vite + TanStack Query
            │
            ├── /api/forecast       pronóstico diario por cota
            ├── /api/current-snow   nieve observada y operación
            ├── /api/hourly         consenso horario 72 h
            ├── /api/model-runs     corridas anteriores
            ├── /api/road           RP 222
            ├── /api/webcam         disponibilidad de webcam
            ├── /api/regional       comparador de centros
            ├── /api/regional-grid  puntos del mapa lazy
            └── /api/climatology    referencia histórica ERA5
```

Los endpoints tienen caché CDN independiente, errores estructurados y funcionamiento degradado. Los componentes React consumen contratos tipados y no conocen los detalles de scraping ni de Open-Meteo.

## Cotas de Las Leñas

| Nivel | Elevación | Uso |
| --- | ---: | --- |
| Base | 2.240 m | Valle, acceso y profundidad inferior |
| Montaña media | 2.800 m | Referencia meteorológica central |
| Alta montaña | 3.430 m | Sectores altos y profundidad superior |

Las coordenadas son puntos representativos aproximados, centralizados en `src/config/mountain.ts`.

## Desarrollo local

Requiere Node.js 22.12 o posterior.

```bash
npm install
npm run dev
```

Vite monta localmente los mismos nueve endpoints que Vercel Functions.

## Verificación

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

La suite cubre normalización multimodelo, fase, calidad, scores, ventanas, corridas, parsers, frescura, deduplicación, RP 222, webcam, persistencia, alertas, comparador regional, mapa lazy, climatología y estados degradados de interfaz.

## Caché CDN

| Endpoint | `s-maxage` |
| --- | ---: |
| `/api/forecast` | 3 h |
| `/api/current-snow` | 1 h |
| `/api/hourly` | 1 h |
| `/api/model-runs` | 3 h |
| `/api/road` | 30 min |
| `/api/webcam` | 1 h |
| `/api/regional` | 3 h |
| `/api/regional-grid` | 3 h |
| `/api/climatology` | 24 h |

Todos usan `stale-while-revalidate` cuando corresponde.

## Despliegue

El proyecto está configurado para Vite y Vercel Functions y no requiere variables de entorno. Los previews de `feat/snow-monitor-v3` están deshabilitados; el merge a `main` genera el despliegue de producción.

## Fuentes

- Las Leñas: parte de nieve, operación y webcam.
- Gobierno de Mendoza / Dirección Provincial de Vialidad: RP 222.
- Snow-Forecast, Skiresort.info y OnTheSnow: reportes externos.
- Open-Meteo: ECMWF, GFS, ICON, Single Runs e Historical Weather API / ERA5.

Antes de un uso comercial deben revisarse las condiciones de licencia, atribución y automatización de cada proveedor.

## Limitaciones

- Los reportes pueden diferir por hora, cota, compactación y método de medición.
- Los parsers externos pueden dejar de funcionar si una fuente cambia su HTML o bloquea automatización.
- Las coordenadas regionales no representan cada pista ni todos los microclimas.
- La calidad y los scores son estimaciones, no observaciones ni recomendaciones de seguridad.
- El historial y las alertas no se sincronizan entre dispositivos.
- Sin backend persistente no existe timelapse remoto ni Web Push real con la app cerrada.
- La app no reemplaza el parte oficial, Vialidad ni los avisos de avalanchas.