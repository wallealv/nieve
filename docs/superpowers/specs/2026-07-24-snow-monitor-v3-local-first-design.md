# Snow Monitor v3 — diseño local-first

Fecha: 2026-07-24
Estado: aprobado con la restricción de no usar Supabase por ahora
Rama: `feat/snow-monitor-v3`

## 1. Objetivo

Convertir Las Leñas Snow Monitor en una herramienta de decisión para responder rápidamente:

1. ¿Cuándo empieza, alcanza el pico y termina la próxima tormenta?
2. ¿A qué hora y en qué cota conviene esquiar?
3. ¿La nieve será seca, húmeda, venteada, mezclada con lluvia o propensa a hielo?
4. ¿Los modelos están convergiendo o retrocediendo respecto de corridas anteriores?
5. ¿Cómo están la RP 222, la operación de la montaña y la webcam oficial?
6. ¿Las Leñas ofrece mejores condiciones que otros centros cercanos?

La aplicación continuará siendo pública, sin login y usable aunque fallen fuentes secundarias.

## 2. Restricción local-first

Esta versión no utilizará Supabase ni otra base de datos remota.

Se guardarán en `localStorage` o IndexedDB del dispositivo:

- historial de corridas consultadas;
- preferencias de cota y visualización;
- umbrales de alertas;
- centros favoritos;
- última información válida de ruta y fuentes externas;
- estado de instalación PWA.

Consecuencias explícitas:

- el historial no se comparte entre dispositivos;
- borrar los datos del navegador elimina el historial;
- las notificaciones solo se evalúan cuando la PWA o la página se abre, actualiza o permanece activa;
- no habrá Web Push real con la aplicación cerrada;
- no habrá un timelapse remoto persistente de la webcam.

La arquitectura dejará interfaces preparadas para sustituir el almacenamiento local por un backend más adelante sin reescribir los componentes de presentación.

## 3. Fuentes y límites

### 3.1 Pronóstico

Fuente principal: Open-Meteo.

Modelos:

- ECMWF IFS;
- NOAA GFS;
- DWD ICON.

La aplicación utilizará:

- Weather Forecast API para la corrida operativa más reciente;
- Single Runs API para las corridas anteriores;
- variables horarias para las próximas 72 horas;
- datos diarios hasta 15 días;
- múltiples coordenadas por solicitud para Base, Media y Alta.

No se consumirán endpoints internos ni datos copiados de OpenSnow. Se podrá agregar un adaptador oficial si en el futuro existe una licencia o API key válida.

### 3.2 Nieve observada y operación

- Las Leñas oficial;
- Snow-Forecast;
- Skiresort.info;
- OnTheSnow.

Se conservarán las reglas actuales de prioridad, frescura y deduplicación de procedencia.

### 3.3 Ruta

Fuente principal: Gobierno de Mendoza / Dirección Provincial de Vialidad.

El parser buscará específicamente RP 222, Los Molles y Las Leñas y normalizará:

- transitable;
- transitable con precaución;
- suma precaución;
- portación o uso obligatorio de cadenas;
- máquinas trabajando;
- interrumpida o intransitable;
- hielo, nieve, barro o visibilidad reducida;
- fecha y URL del parte.

No se inferirá el estado de la ruta únicamente desde el tiempo pronosticado.

### 3.4 Webcam

Se mostrará la cámara oficial mediante enlace o integración autorizada. Si la fuente no permite `iframe`, CORS o captura directa, la interfaz mostrará una vista segura con estado, última comprobación y botón para abrir la cámara oficial.

No se almacenarán imágenes ni se estimarán centímetros a partir de la webcam.

## 4. Arquitectura

### 4.1 Endpoints

Se crearán endpoints independientes, cacheables y tolerantes a fallos:

- `GET /api/forecast`: resumen diario existente;
- `GET /api/hourly`: pronóstico horario multimodelo por cota para 72 horas;
- `GET /api/model-runs`: comparación de las últimas tres corridas por modelo;
- `GET /api/road`: estado normalizado de la RP 222;
- `GET /api/webcam`: disponibilidad y metadatos del acceso oficial;
- `GET /api/regional`: resumen comparable de centros seleccionados;
- `GET /api/regional-grid`: grilla reducida para el mapa animado.

Cada endpoint tendrá:

- timeout explícito;
- caché CDN apropiada;
- `stale-while-revalidate`;
- respuesta parcial cuando una fuente falla;
- advertencias por fuente;
- pruebas del contrato HTTP.

### 4.2 Dominio interno

Módulos independientes:

- `forecast/hourly`: normalización horaria;
- `forecast/phase`: lluvia, mezcla, nieve húmeda y nieve seca;
- `forecast/quality`: calidad estimada;
- `forecast/scores`: Powder, Pista y Freeride;
- `forecast/windows`: mejor ventana horaria y mejor día;
- `forecast/runs`: comparación de corridas;
- `road`: extracción y normalización de RP 222;
- `webcam`: comprobación segura del recurso oficial;
- `regional`: centros, ranking y grilla;
- `persistence`: IndexedDB/localStorage con versionado;
- `pwa`: manifest, service worker y actualización.

Los componentes React consumirán contratos tipados y no conocerán los detalles de scraping ni de Open-Meteo.

## 5. Pronóstico horario de 72 horas

Resolución visual por bloques de tres horas, conservando datos horarios internamente.

Variables por cota:

- nieve;
- lluvia y precipitación total;
- probabilidad de precipitación;
- temperatura y sensación térmica;
- humedad y punto de rocío;
- viento, dirección y ráfagas;
- visibilidad;
- nubosidad;
- radiación solar;
- cota de congelación;
- día/noche;
- profundidad de nieve modelada, etiquetada como modelada.

La interfaz indicará:

- comienzo del evento;
- período de mayor intensidad;
- final estimado;
- acumulación nocturna y diurna;
- transición de lluvia a nieve;
- riesgo de lluvia o mezcla en Base;
- horas de peor viento y visibilidad.

## 6. Fase y calidad de nieve

### 6.1 Fase

Clasificación conservadora:

- `rain`;
- `mixed`;
- `wet-snow`;
- `dry-snow`;
- `none`;
- `uncertain`.

Usará precipitación, nieve, temperatura, temperatura húmeda cuando esté disponible y relación entre la elevación de la cota y la línea de congelación. En casos limítrofes se mostrará `incierto` en lugar de afirmar una fase exacta.

### 6.2 Calidad

Etiquetas posibles:

- polvo seco;
- polvo moderadamente denso;
- nieve húmeda;
- nieve venteada;
- compactación probable;
- costra o hielo probable;
- primavera/corn posible;
- calidad incierta.

La calidad será una estimación explicable, no una observación. Cada etiqueta incluirá las razones principales.

## 7. Scores y recomendaciones

Se calcularán tres puntajes de 0 a 100.

### Powder Score

Factores:

- nieve nueva;
- proporción nocturna;
- temperatura;
- riesgo de lluvia o mezcla;
- viento y transporte de nieve;
- profundidad observada disponible;
- antigüedad de la nevada.

### Pista Score

Factores:

- visibilidad;
- viento y ráfagas;
- temperatura;
- lluvia;
- riesgo de hielo;
- radiación;
- operación oficial disponible.

### Freeride Score

Factores:

- nieve nueva;
- calidad estimada;
- viento;
- estado oficial de fuera de pista;
- riesgo oficial de avalancha;
- visibilidad.

Reglas de seguridad:

- si fuera de pista está cerrado, Freeride Score queda bloqueado y se muestra `No habilitado`;
- el score nunca reemplaza el parte oficial;
- un riesgo alto de avalancha no se suaviza con buena nieve.

La interfaz mostrará:

- mejor ventana para powder;
- mejor ventana para pista;
- mejor día general de los próximos siete;
- explicación de los factores que más suman y restan.

## 8. Evolución de modelos

Para ECMWF, GFS e ICON se intentarán cargar:

- corrida actual;
- corrida anterior;
- segunda corrida anterior.

Se comparará la acumulación por día, 72 horas y siete días.

Estados calculados:

- subiendo;
- bajando;
- estable;
- convergiendo;
- divergiendo;
- datos insuficientes.

La ausencia de una corrida archivada no hará fallar el endpoint completo.

## 9. Estado de RP 222

Tarjeta principal:

- estado normalizado;
- cadenas;
- máquinas;
- fenómenos informados;
- tramo afectado;
- hora y antigüedad;
- fuente oficial;
- botón para abrir el parte.

La app comparará el estado actual con el último guardado localmente y resaltará cambios al volver a abrirla.

## 10. Webcam

Panel:

- acceso oficial;
- disponibilidad comprobada;
- última comprobación;
- aviso si la integración directa está bloqueada;
- botón de apertura en una pestaña nueva.

El timelapse se considera fuera de alcance en la versión sin backend persistente. Podrá agregarse cuando exista almacenamiento autorizado.

## 11. Comparador regional

Centros iniciales:

- Las Leñas;
- Catedral;
- Chapelco;
- Cerro Castor;
- Valle Nevado;
- La Parva;
- El Colorado.

Cada centro tendrá configuración versionada:

- coordenadas representativas;
- cota base y superior;
- zona horaria;
- país;
- URL oficial.

Comparación:

- nieve en 72 horas;
- nieve en siete días;
- rango entre modelos;
- confianza;
- viento;
- fase en base;
- Powder Score estimado;
- ranking general.

Se advertirá que el ranking usa coordenadas y cotas representativas, no microclimas de cada pista.

## 12. Mapa regional

Mapa lazy-loaded con MapLibre y cartografía abierta.

Capas:

- centros de esquí;
- nieve prevista;
- lluvia/mezcla/nieve;
- acumulación en 6, 12, 24, 48 y 72 horas;
- animación por pasos temporales.

Para controlar uso y rendimiento:

- grilla reducida y predefinida;
- solicitudes batch;
- caché CDN;
- sin actualización continua;
- carga solo cuando el usuario abre el mapa.

No se replicarán capas ni mapas propietarios de OpenSnow.

## 13. PWA y alertas locales

Se agregará:

- `manifest.webmanifest`;
- iconos propios;
- service worker;
- caché del shell;
- pantalla offline con último pronóstico guardado;
- aviso de nueva versión;
- instalación en escritorio y móvil.

Alertas locales evaluadas al abrir o refrescar:

- nieve en 72 horas;
- nieve en siete días;
- confianza mínima;
- ráfagas;
- lluvia en Base;
- cambio de estado de RP 222;
- cambio de fuera de pista;
- subida o bajada fuerte del pronóstico.

La interfaz explicará que no son alertas push con la app cerrada.

## 14. Interfaz

Orden principal:

1. Próxima tormenta y mejor recomendación.
2. Estado de ruta y montaña.
3. Mejor ventana por actividad.
4. Línea horaria 72 h.
5. Fase y calidad por cota.
6. Resumen diario.
7. Evolución de modelos.
8. Webcam.
9. Comparador regional.
10. Mapa.
11. Historial, alertas y metodología.

Principios:

- vista móvil prioritaria;
- detalles técnicos plegables;
- colores acompañados por texto e iconos;
- tablas reemplazadas por tarjetas en móvil;
- no bloquear el contenido principal mientras cargan fuentes secundarias;
- componentes pesados cargados de forma diferida.

## 15. Persistencia local

Se introducirá una capa `StorageAdapter` con dos implementaciones:

- IndexedDB preferida;
- localStorage como fallback.

Datos versionados y con límites:

- máximo 90 días de snapshots compactos;
- máximo tres corridas por modelo por ciclo visible;
- limpieza automática por antigüedad;
- botón para exportar JSON;
- botón para borrar datos locales.

## 16. Error handling

- Nunca ocultar el pronóstico principal por el fallo de ruta, webcam o un modelo histórico.
- Mostrar el último dato válido con su antigüedad.
- Diferenciar `sin dato`, `fuente bloqueada`, `dato antiguo` y `error temporal`.
- No convertir la ausencia de información en `cerrado`, `abierto` o `0 cm`.
- Reintentos limitados con backoff solo para errores recuperables.

## 17. Seguridad y privacidad

- Sin secretos en frontend.
- Sin service role ni claves privadas.
- Sin cuentas ni datos personales.
- Sin tracking adicional.
- URLs externas validadas contra una allowlist.
- HTML externo tratado como texto no confiable y nunca insertado con `dangerouslySetInnerHTML`.
- Service worker limitado al dominio de la aplicación.

## 18. Pruebas

### Unitarias

- fase;
- calidad;
- scores;
- ventanas;
- tendencias;
- parsers de ruta;
- normalización de corridas;
- ranking regional;
- persistencia y migraciones locales.

### Componentes

- estados completos, parciales, antiguos y de error;
- móvil y escritorio;
- accesibilidad de controles;
- explicación de scores;
- modo offline.

### API

- métodos no permitidos;
- caché;
- timeout;
- respuesta parcial;
- contratos de cada endpoint.

### Finales

- lint;
- TypeScript estricto;
- Vitest;
- build;
- revisión de bundle;
- prueba real de endpoints desde Vercel después del único merge;
- comprobación de que la rama no genera previews.

## 19. Entrega por etapas dentro de la misma rama

1. Datos horarios, fase y calidad.
2. Scores, ventanas y mejor día.
3. Corridas anteriores y convergencia.
4. RP 222 y webcam.
5. Persistencia local y PWA.
6. Comparador regional.
7. Mapa regional.
8. Integración, accesibilidad, pruebas y documentación.

Todos los commits permanecen en la rama con previews deshabilitados. Se abrirá un PR cuando la integración esté lista. Solo se fusionará a `main` con CI completamente verde, generando un único deploy productivo salvo una hotfix imprescindible descubierta en la verificación real.

## 20. Fuera de alcance explícito

- Supabase o cualquier base remota;
- autenticación;
- sincronización entre dispositivos;
- Web Push con la app cerrada;
- timelapse persistente de webcam;
- datos o mapas propietarios obtenidos sin licencia;
- pronóstico propio de avalanchas;
- reservas, pases, hoteles o feed social.
