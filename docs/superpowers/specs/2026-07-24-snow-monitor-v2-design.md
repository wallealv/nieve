# Diseño — Las Leñas Snow Monitor v2

Fecha: 2026-07-24

## Objetivo

Convertir el dashboard actual en una herramienta de decisión rápida que responda: cuánta nieve hay, cuándo llega la próxima tormenta, cuánto puede acumular por cota, qué tan confiable es la señal y cómo está operando la montaña.

## Alcance

Esta versión incluye siete mejoras coordinadas:

1. resumen inteligente de la próxima tormenta;
2. reducción de consultas meteorológicas de nueve a tres;
3. estado operativo de medios, pistas y riesgo de avalancha;
4. experiencia móvil mejorada;
5. carga diferida de secciones pesadas;
6. historial local de corridas y comparación con observaciones;
7. reglas de alerta configurables dentro de la app.

No incluye cuentas de usuario, sincronización entre dispositivos, notificaciones push de servidor ni una base de datos remota. Las alertas locales se evalúan al abrir o actualizar la app; cuando el navegador lo permite, pueden disparar una notificación local.

## Principios

- El dato observado y el pronóstico futuro permanecen separados.
- Las cifras oficiales tienen prioridad sobre fuentes externas.
- La app no inventa mediciones para la cota media.
- Una tormenta se detecta como un evento continuo, no como el primer día con nieve.
- Los acumulados siempre muestran valor central, rango entre modelos y confianza.
- La app sigue funcionando si falla un modelo o una fuente de observación.
- Las mejoras no deben exigir servicios pagos ni variables de entorno nuevas.

## 1. Resumen inteligente de tormenta

### Detección

Se agrupan días consecutivos con una mediana de nieve de al menos 1 cm en la cumbre. Se permite un único día intermedio con menos de 1 cm si está rodeado por días con nieve y el evento completo mantiene al menos 10 cm.

Para cada evento se calculan:

- inicio y fin estimados;
- duración;
- acumulación en base, media y cumbre;
- mínimo y máximo entre modelos por cota;
- día de mayor intensidad;
- confianza media y mínima del evento;
- viento y ráfaga máximos;
- cota de congelación mínima y máxima.

### Clasificación

- `leve`: menos de 10 cm en cumbre;
- `moderada`: 10–24,9 cm;
- `fuerte`: 25–49,9 cm;
- `muy fuerte`: 50 cm o más.

La tarjeta principal prioriza el evento con mayor acumulación dentro de los próximos siete días. Si no existe, muestra que no hay una nevada significativa prevista.

## 2. Tres consultas meteorológicas

Cada modelo recibirá una única solicitud con listas separadas por comas para latitud, longitud y elevación. Open-Meteo devuelve una estructura por ubicación cuando se solicitan varias coordenadas.

Flujo:

```text
ECMWF ─┐
GFS   ─┼─ una solicitud por modelo ─► tres ubicaciones normalizadas
ICON  ─┘
```

Se mantienen los tres modelos existentes. Cada solicitud tendrá:

- timeout de 12 segundos;
- un reintento con espera breve para errores 429, 500, 502, 503 y 504;
- validación de que la respuesta contiene exactamente tres ubicaciones;
- degradación parcial si una ubicación falta.

## 3. Operación de la montaña

El servicio de nieve actual consultará además:

- página de medios;
- página de pistas;
- página de fuera de pista.

Campos normalizados:

- medios abiertos, condicionales y totales;
- pistas abiertas y totales;
- riesgo de avalancha de 1 a 5;
- estado de fuera de pista;
- observación oficial cuando exista.

Como algunos estados se representan con imágenes, el parser aceptará texto visible, atributos `alt`, clases o nombres de archivo. Si no puede determinar un estado de manera confiable, devolverá `null` en lugar de asumir que está cerrado.

La interfaz mostrará una franja compacta con datos disponibles y omitirá métricas ausentes.

## 4. Experiencia móvil

- El resumen de tormenta y la nieve actual aparecen antes que los gráficos.
- El selector Base / Media / Cumbre queda pegajoso dentro de la pantalla al desplazarse por el pronóstico.
- La tabla de fuentes se transforma en tarjetas por fuente en pantallas pequeñas.
- Las secciones técnicas quedan plegadas por defecto.
- Botones y controles mantienen áreas táctiles mínimas de 44 px.

## 5. Rendimiento

Los componentes pesados se cargarán con `React.lazy` y `Suspense`:

- gráfico de nieve;
- perfil de montaña;
- gráfico de condiciones;
- tabla diaria;
- metodología y estados técnicos.

La portada inicial incluirá únicamente encabezado, tormenta, nieve actual, operación y resumen por cota.

También se configurará división manual de chunks para separar React, Recharts y la aplicación cuando sea útil, sin romper la caché de Vite.

## 6. Historial local y verificación

La app conservará en `localStorage` hasta 30 snapshots, uno por corrida meteorológica distinta. Cada snapshot almacenará:

- `updatedAt`;
- acumulado a 72 horas y 7 días por cota;
- acumulado de cada modelo por cota;
- evento principal detectado;
- profundidad observada por cota cuando esté disponible.

Se deduplican snapshots por `updatedAt`. Los registros de más de 45 días se eliminan.

La interfaz mostrará:

- cambio del acumulado a 7 días frente a la corrida anterior;
- tendencia de las últimas corridas;
- diferencia entre el pronóstico anterior para una fecha y la nieve nueva observada cuando existan datos compatibles.

La comparación observado versus previsto se presenta como orientación, no como validación científica, porque las fuentes observadas pueden medir zonas y métodos distintos.

## 7. Alertas configurables

Panel local con valores iniciales:

- 25 cm en 72 horas;
- 40 cm en 7 días;
- confianza mínima `Media`;
- cota seleccionable: base, media, cumbre o cualquiera.

Se guarda en `localStorage`. En cada actualización:

1. se evalúan las reglas;
2. se muestra un estado `Alerta activa` o `Sin umbral alcanzado`;
3. si el usuario habilitó notificaciones y la regla pasó de inactiva a activa, se usa la Web Notifications API;
4. no se repite la misma notificación para el mismo evento y corrida.

No se promete ejecución en segundo plano cuando la app está cerrada; eso requeriría persistencia remota y web push de servidor.

## Arquitectura y archivos

```text
src/lib/forecast/
  batchFetch.ts
  storm.ts
  history.ts
  alerts.ts

src/components/dashboard/
  StormSummary.tsx
  OperationsStrip.tsx
  ForecastHistory.tsx
  AlertSettings.tsx
  StickyLevelSelector.tsx

src/hooks/
  useForecastHistory.ts
  useAlertSettings.ts

src/lib/current-snow/
  operations.ts
```

Se modificarán los contratos existentes de pronóstico y nieve actual solo con campos opcionales o compatibles.

## Errores y degradación

- Si falla un modelo, el evento se recalcula con los disponibles y baja la confianza.
- Si falla una página operativa, se conservan nieve actual y pronóstico.
- Si `localStorage` está bloqueado, historia y alertas funcionan solo durante la sesión.
- Si el permiso de notificaciones es denegado, el panel sigue evaluando visualmente las reglas.
- Los parsers nunca convierten ausencia o guiones en cero.

## Pruebas

Se agregarán pruebas para:

- agrupación de tormentas y clasificación;
- acumulados y rangos por cota;
- respuestas multiubicación de Open-Meteo;
- reintentos de errores transitorios;
- parsers de medios, pistas y avalanchas;
- deduplicación y retención del historial;
- evaluación y deduplicación de alertas;
- render móvil de fuentes sin tabla horizontal;
- estados parciales y ausencia de datos.

La verificación final ejecutará lint, TypeScript estricto, Vitest, build Vite, preview de Vercel y pruebas HTTP de `/`, `/api/forecast` y `/api/current-snow`.

## Criterios de aceptación

- La portada identifica la tormenta más relevante de los próximos siete días.
- El backend realiza como máximo tres solicitudes principales a Open-Meteo por actualización normal.
- Un 429 temporal de ICON no elimina ECMWF ni GFS y admite reintento.
- La operación de Las Leñas aparece cuando el sitio oficial permite inferirla con seguridad.
- La vista móvil no exige desplazamiento horizontal para consultar las fuentes.
- Los gráficos dejan de formar parte del chunk inicial.
- El usuario puede ver tendencia de corridas y configurar umbrales locales.
- La aplicación sigue siendo utilizable sin historial, notificaciones o datos operativos.
