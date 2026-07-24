# Diseño: panel de nieve de Las Leñas

Fecha: 2026-07-23
Estado: aprobado para planificación
Repositorio: `wallealv/nieve`

## 1. Objetivo

Construir una aplicación web visual, clara y responsive para consultar el pronóstico de nieve de Las Leñas por distintas cotas de la montaña. La aplicación debe combinar modelos meteorológicos, mostrar sus diferencias, estimar acumulaciones y expresar explícitamente cuánto puede confiar el usuario en cada tramo del pronóstico.

La primera versión estará orientada a decisiones prácticas de viaje y snowboard: cuándo puede nevar, cuánto podría acumular en cada nivel, si habrá viento problemático y cuánto acuerdo existe entre los modelos.

## 2. Alcance de la primera versión

La aplicación incluirá:

- Pronóstico de hasta 15 días.
- Tres cotas configurables de Las Leñas:
  - Base: aproximadamente 2.240 m.
  - Montaña media: aproximadamente 2.800 m.
  - Alta montaña: aproximadamente 3.400 m.
- Acumulación estimada de nieve por día y por cota.
- Totales para 24 horas, 72 horas, 7 días y 15 días.
- Comparación entre modelos meteorológicos.
- Consenso y rango mínimo-máximo entre modelos.
- Nivel de confianza por día y por período.
- Temperatura, viento, ráfagas y cota de congelación.
- Indicador visual de intensidad de nevada.
- Actualización automática cada tres horas.
- Actualización manual mediante botón.
- Estado de cada fuente y degradación controlada si falla un modelo.
- Diseño responsive para escritorio y celular.

No se incluirán inicialmente:

- Autenticación.
- Base de datos o historial permanente.
- Alertas push, WhatsApp o Telegram.
- Integración con partes oficiales del centro de esquí.
- Predicción propia mediante machine learning.
- Mapas meteorológicos complejos.

Estas funciones podrán incorporarse después sin alterar la arquitectura principal.

## 3. Horizonte y tratamiento de incertidumbre

Los modelos no tienen el mismo horizonte temporal:

- ICON: aproximadamente 7,5 días.
- ECMWF IFS: hasta 15 días.
- GFS: hasta 16 días.

La interfaz dividirá el pronóstico en tres zonas de confianza:

### Días 0–7: pronóstico operativo

Se usarán ECMWF, GFS e ICON. Es el tramo con mejor cobertura multimodelo. Se mostrarán acumulación estimada, rango entre modelos y confianza calculada por acuerdo.

### Días 8–10: tendencia extendida

Se usarán ECMWF y GFS. ICON ya no estará disponible. La interfaz mostrará una advertencia visible de menor confianza y evitará presentar valores como una certeza.

### Días 11–15: escenario orientativo

Se usarán ECMWF y GFS. Los valores se mostrarán con menor prominencia visual, bandas de incertidumbre amplias y la etiqueta `Tendencia de baja confianza`.

No se utilizará un horizonte mayor a 15 días en la vista principal. Para períodos superiores, la herramienta correcta sería un producto subestacional o estacional, útil para anomalías generales pero no para pronosticar centímetros de nieve en una montaña concreta.

## 4. Arquitectura

### 4.1 Frontend

- React.
- Vite.
- TypeScript estricto.
- Tailwind CSS.
- Componentes visuales inspirados en shadcn/ui, incorporados localmente para evitar dependencia innecesaria del CLI.
- TanStack Query para caché del cliente, estados de carga y refresco automático.
- Recharts para gráficos.
- Lucide React para iconografía.

### 4.2 Backend serverless

Se implementará una función compatible con Vercel en:

`/api/forecast`

Responsabilidades:

1. Consultar Open-Meteo para cada modelo.
2. Consultar puntos representativos de cada cota.
3. Validar y normalizar respuestas.
4. Transformar las unidades.
5. Calcular acumulaciones y métricas de consenso.
6. Devolver un contrato único al frontend.
7. Aplicar caché HTTP.
8. Continuar operando si una fuente individual falla.

La función no almacenará datos en la primera versión.

### 4.3 Despliegue

- Frontend y función serverless en un único proyecto de Vercel.
- `vercel.json` solo si se necesita configuración explícita.
- Variables de entorno únicamente si una futura fuente requiere credenciales.
- Open-Meteo se consumirá sin secretos en la primera versión.

## 5. Fuentes meteorológicas

Se usarán modelos individuales para evitar que una selección automática o `seamless` esconda las diferencias entre fuentes:

- ECMWF IFS.
- NOAA GFS.
- DWD ICON Global.

Se solicitarán, según disponibilidad del modelo:

- Snowfall.
- Precipitation.
- Temperature 2 m.
- Freezing level height.
- Wind speed.
- Wind gusts.
- Weather code.

La nieve informada directamente por el modelo tendrá prioridad. Cuando una variable no esté disponible de forma consistente, se aplicará una estimación explícita y testeada basada en precipitación, temperatura y cota de congelación. La respuesta de la API distinguirá valores directos de valores estimados.

## 6. Representación de la montaña

Cada nivel será un punto meteorológico independiente con latitud, longitud y elevación configurables. No se tomará una única coordenada y se multiplicará la nieve mediante un factor arbitrario.

Configuración inicial:

```ts
interface MountainLevelConfig {
  id: 'base' | 'mid' | 'summit';
  name: string;
  elevationM: number;
  latitude: number;
  longitude: number;
}
```

Las coordenadas exactas se mantendrán en un archivo de configuración central para poder corregirlas sin tocar los cálculos o componentes.

## 7. Contrato de datos

La función `/api/forecast` devolverá una estructura similar a:

```ts
interface ForecastResponse {
  resort: {
    name: string;
    timezone: string;
    updatedAt: string;
  };
  horizons: {
    operationalThroughDay: number;
    extendedThroughDay: number;
    maximumDay: number;
  };
  models: ModelStatus[];
  levels: LevelForecast[];
  dailyConsensus: DailyConsensus[];
  warnings: string[];
}
```

Cada día y nivel incluirá:

- Fecha.
- Nieve media estimada.
- Mínimo y máximo entre modelos.
- Valores individuales por modelo.
- Temperatura mínima y máxima.
- Viento máximo.
- Ráfaga máxima.
- Cota de congelación.
- Confianza.
- Cantidad de modelos disponibles.
- Categoría temporal: operativo, extendido u orientativo.

## 8. Cálculo de consenso

Para cada fecha y cota:

1. Obtener los centímetros previstos por cada modelo disponible.
2. Calcular mediana como valor principal, para reducir el impacto de un modelo extremo.
3. Calcular mínimo y máximo.
4. Calcular dispersión relativa.
5. Aplicar una penalización por horizonte temporal.
6. Aplicar una penalización cuando haya menos modelos disponibles.

La confianza será una puntuación de 0 a 100 y también una etiqueta:

- Alta: 75–100.
- Media: 50–74.
- Baja: 25–49.
- Muy baja: 0–24.

La puntuación no representará una probabilidad científica exacta. La interfaz lo explicará como un índice interno de acuerdo y horizonte.

## 9. Cálculo de nieve por cota

Cuando el modelo entregue `snowfall`, se utilizará ese valor ajustado al punto y elevación solicitados.

Cuando sea necesario estimar:

- Precipitación por debajo de la cota de congelación se considerará principalmente lluvia.
- Se aplicará una transición gradual de fase cerca de la cota de congelación.
- La relación nieve-agua variará con la temperatura, dentro de límites conservadores.
- No se extrapolarán acumulaciones negativas ni físicamente absurdas.

Las funciones serán puras y estarán separadas del código de red.

## 10. Experiencia visual

### 10.1 Dirección estética

- Interfaz oscura, moderna y de montaña.
- Fondo profundo con gradientes suaves y textura atmosférica liviana.
- Tarjetas translúcidas con contraste suficiente.
- Tipografía limpia y números grandes para acumulaciones.
- Uso medido de azul hielo, blanco y acentos cálidos para alertas.
- Animaciones discretas, sin afectar rendimiento ni legibilidad.

### 10.2 Encabezado

Mostrará:

- `Las Leñas Snow Monitor`.
- Estado general de la próxima nevada.
- Hora de la última actualización.
- Próxima actualización automática.
- Botón `Actualizar`.

### 10.3 Resumen principal

Tarjetas por cota con:

- Nieve 24 h.
- Nieve 72 h.
- Nieve 7 días.
- Nieve 15 días.
- Confianza.
- Viento máximo.

### 10.4 Gráfico principal

Gráfico combinado:

- Eje X: próximos 15 días.
- Barras: acumulación diaria de nieve.
- Línea: acumulación progresiva.
- Banda: mínimo-máximo entre modelos.
- Selector de cota.
- Separadores visuales entre días 0–7, 8–10 y 11–15.

### 10.5 Comparación de modelos

Una tabla o gráfico secundario mostrará ECMWF, GFS e ICON por fecha. Los datos inexistentes después del horizonte de ICON aparecerán como `No disponible`, nunca como cero.

### 10.6 Perfil vertical de montaña

Se incluirá una visualización vertical de la montaña con las tres cotas y la acumulación prevista en cada una para el período seleccionado. Permitirá elegir 24 h, 72 h, 7 días o 15 días.

### 10.7 Condiciones complementarias

Gráficos compactos para:

- Temperatura.
- Viento y ráfagas.
- Cota de congelación.

## 11. Actualización y caché

- El cliente hará `refetch` cada tres horas.
- La función serverless enviará encabezados de caché compartida para evitar llamadas repetidas.
- El botón manual invalidará el caché del cliente, pero respetará la política del servidor.
- La respuesta mostrará la hora real de obtención de cada modelo cuando esté disponible.

## 12. Manejo de errores

### Fallo de un modelo

- Se devuelve la información de los modelos restantes.
- La confianza se penaliza.
- La UI muestra el modelo fallido sin bloquear toda la página.

### Fallo total de fuentes

- La API responde con un error estructurado.
- La UI conserva el último dato exitoso en caché y muestra que puede estar desactualizado.

### Datos parciales

- Los campos faltantes se representan como `null`.
- La interfaz no convierte valores faltantes en cero.
- Las funciones de agregación ignoran datos ausentes de forma explícita.

## 13. Accesibilidad y responsive

- Contraste compatible con WCAG AA para texto principal.
- Navegación por teclado.
- Estados de foco visibles.
- Etiquetas accesibles en controles y gráficos.
- Tablas alternativas o resúmenes textuales para datos gráficos.
- Diseño desde 360 px hasta pantallas amplias.
- Reducción de animaciones según `prefers-reduced-motion`.

## 14. Pruebas

Se utilizará Vitest y React Testing Library.

### Pruebas unitarias

- Conversión de precipitación a nieve.
- Transición lluvia-nieve por cota de congelación.
- Mediana, rango y dispersión.
- Penalización de confianza por horizonte.
- Penalización por cantidad de modelos.
- Agregación de 24 h, 72 h, 7 días y 15 días.
- Tratamiento de datos faltantes.

### Pruebas de integración

- Normalización de respuesta ECMWF.
- Normalización de respuesta GFS.
- Normalización de respuesta ICON.
- Respuesta parcial cuando falla una fuente.
- Render del dashboard con fixtures estables.
- Cambio de cota y período.

### Verificación final

- `npm run lint`.
- `npm run typecheck`.
- `npm run test`.
- `npm run build`.
- Verificación visual en navegador para escritorio y móvil.

## 15. Estructura prevista

```text
nieve/
├── api/
│   └── forecast.ts
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── charts/
│   │   └── ui/
│   ├── config/
│   │   └── mountain.ts
│   ├── hooks/
│   ├── lib/
│   │   ├── forecast/
│   │   ├── confidence/
│   │   └── units/
│   ├── test/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   └── superpowers/
│       └── specs/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 16. Criterios de aceptación

La primera versión se considerará terminada cuando:

1. Cargue un pronóstico real de Las Leñas sin claves privadas.
2. Muestre base, media y alta montaña.
3. Presente acumulaciones de 24 h, 72 h, 7 días y 15 días.
4. Compare ECMWF, GFS e ICON sin rellenar datos inexistentes.
5. Distinga visualmente los tres horizontes de confianza.
6. Muestre mínimo, mediana y máximo entre modelos.
7. Continúe funcionando si falla un modelo.
8. Se actualice automáticamente cada tres horas.
9. Funcione correctamente en móvil y escritorio.
10. Pase lint, tipos, pruebas y build.
11. Quede desplegable en Vercel sin pasos manuales especiales.

## 17. Fuentes técnicas

- Open-Meteo Weather Forecast API: https://open-meteo.com/en/docs
- Open-Meteo ECMWF API: https://open-meteo.com/en/docs/ecmwf-api
- Open-Meteo GFS API: https://open-meteo.com/en/docs/gfs-api

## 18. Decisiones explícitas

- El horizonte visible será de 15 días, no superior.
- Los días 11–15 se presentarán como tendencia, no como pronóstico preciso.
- No se inventarán valores de ICON después de su horizonte.
- La mediana será el consenso principal.
- La primera versión no guardará historial.
- La aplicación tendrá una única estación: Las Leñas.
- La arquitectura permitirá agregar otros centros de esquí posteriormente.
