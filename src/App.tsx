import { lazy, Suspense, useMemo } from 'react';
import { AlertSettings } from './components/dashboard/AlertSettings.js';
import { BestWindows } from './components/dashboard/BestWindows.js';
import { CurrentSnowPanel } from './components/dashboard/CurrentSnowPanel.js';
import { ErrorState } from './components/dashboard/ErrorState.js';
import { ForecastHistory } from './components/dashboard/ForecastHistory.js';
import { Header } from './components/dashboard/Header.js';
import { HourlyTimeline } from './components/dashboard/HourlyTimeline.js';
import { LevelSummaryCard } from './components/dashboard/LevelSummaryCard.js';
import { LoadingDashboard } from './components/dashboard/LoadingDashboard.js';
import { LocalDataSettings } from './components/dashboard/LocalDataSettings.js';
import { ModelRunEvolution } from './components/dashboard/ModelRunEvolution.js';
import { PwaStatus } from './components/dashboard/PwaStatus.js';
import { RegionalComparator } from './components/dashboard/RegionalComparator.js';
import { RoadStatusCard } from './components/dashboard/RoadStatusCard.js';
import { SectionSkeleton } from './components/dashboard/SectionSkeleton.js';
import { SnowPhaseQuality } from './components/dashboard/SnowPhaseQuality.js';
import { StickyLevelSelector } from './components/dashboard/StickyLevelSelector.js';
import { StormSummary } from './components/dashboard/StormSummary.js';
import { WarningBanner } from './components/dashboard/WarningBanner.js';
import { WebcamCard } from './components/dashboard/WebcamCard.js';
import { RegionalSnowMapLoader } from './components/map/RegionalSnowMapLoader.js';
import { useAlertSettings } from './hooks/useAlertSettings.js';
import { useClimatology } from './hooks/useClimatology.js';
import { useCurrentSnow } from './hooks/useCurrentSnow.js';
import { useFavorites } from './hooks/useFavorites.js';
import { useForecast } from './hooks/useForecast.js';
import { useForecastHistory } from './hooks/useForecastHistory.js';
import { useHourlyForecast } from './hooks/useHourlyForecast.js';
import { useLocalPreferences } from './hooks/useLocalPreferences.js';
import { useModelRuns } from './hooks/useModelRuns.js';
import { useOffPisteChange } from './hooks/useOffPisteChange.js';
import { usePwaStatus } from './hooks/usePwaStatus.js';
import { useRegionalForecast } from './hooks/useRegionalForecast.js';
import { useRoadStatus } from './hooks/useRoadStatus.js';
import { useWebcamStatus } from './hooks/useWebcamStatus.js';
import { findPrimaryStorm } from './lib/forecast/storm.js';
import { findBestWindows } from './lib/forecast/windows.js';
import type { LevelId } from './types/forecast.js';

const SnowForecastChart = lazy(() =>
  import('./components/charts/SnowForecastChart.js').then((module) => ({ default: module.SnowForecastChart })),
);
const ConditionsChart = lazy(() =>
  import('./components/charts/ConditionsChart.js').then((module) => ({ default: module.ConditionsChart })),
);
const ForecastTable = lazy(() =>
  import('./components/dashboard/ForecastTable.js').then((module) => ({ default: module.ForecastTable })),
);
const ForecastMethodology = lazy(() =>
  import('./components/dashboard/ForecastMethodology.js').then((module) => ({ default: module.ForecastMethodology })),
);
const ModelStatusList = lazy(() =>
  import('./components/dashboard/ModelStatusList.js').then((module) => ({ default: module.ModelStatusList })),
);
const MountainProfile = lazy(() =>
  import('./components/dashboard/MountainProfile.js').then((module) => ({ default: module.MountainProfile })),
);

export function App() {
  const forecast = useForecast();
  const currentSnow = useCurrentSnow();
  const hourly = useHourlyForecast();
  const modelRuns = useModelRuns();
  const road = useRoadStatus();
  const webcam = useWebcamStatus();
  const regional = useRegionalForecast();
  const climatology = useClimatology();
  const favorites = useFavorites();
  const preferences = useLocalPreferences();
  const pwa = usePwaStatus();
  const offPisteChange = useOffPisteChange(currentSnow.data?.operations.offPisteStatus);
  const selectedLevelId = preferences.levelId;
  const period = preferences.period;
  const storm = useMemo(
    () => (forecast.data ? findPrimaryStorm(forecast.data.levels) : null),
    [forecast.data],
  );
  const history = useForecastHistory(forecast.data, currentSnow.data, storm);
  const alertContext = useMemo(
    () => ({
      hourly: hourly.data,
      modelRuns: modelRuns.data,
      roadChange: road.change,
      offPisteChange,
    }),
    [hourly.data, modelRuns.data, offPisteChange, road.change],
  );
  const alerts = useAlertSettings(forecast.data, alertContext);
  const bestWindows = useMemo(() => {
    if (!hourly.data) return null;
    const depthFor = (levelId: LevelId) =>
      currentSnow.data?.zones.find((zone) => zone.zone === levelId)?.referenceDepthCm ?? null;
    const operations = currentSnow.data?.operations;
    const liftsOpenRatio =
      operations?.liftsOpen !== null &&
      operations?.liftsOpen !== undefined &&
      operations.liftsTotal !== null &&
      operations.liftsTotal > 0
        ? operations.liftsOpen / operations.liftsTotal
        : null;

    return findBestWindows(hourly.data.levels, {
      observedDepthByLevel: {
        base: depthFor('base'),
        mid: depthFor('mid'),
        summit: depthFor('summit'),
      },
      offPisteStatus: operations?.offPisteStatus ?? null,
      avalancheRisk: operations?.avalancheRisk ?? null,
      liftsOpenRatio,
    });
  }, [currentSnow.data, hourly.data]);

  const selectedLevel =
    forecast.data?.levels.find((level) => level.level.id === selectedLevelId) ?? forecast.data?.levels[0];
  const selectedHourlyLevel =
    hourly.data?.levels.find((level) => level.level.id === selectedLevelId) ?? hourly.data?.levels[0];

  if (forecast.isPending) return <LoadingDashboard />;
  if (!forecast.data || !selectedLevel) {
    return (
      <ErrorState
        message={forecast.error instanceof Error ? forecast.error.message : 'Error desconocido.'}
        onRetry={() => void forecast.refetch()}
      />
    );
  }

  const warnings = [
    ...forecast.data.warnings,
    ...(hourly.data?.warnings ?? []),
    ...(modelRuns.data?.warnings ?? []),
    ...(regional.data?.warnings ?? []),
    ...(forecast.isError
      ? [forecast.error instanceof Error ? forecast.error.message : 'La última actualización falló; se muestran los datos anteriores.']
      : []),
    ...(hourly.isError
      ? [hourly.error instanceof Error ? `Pronóstico horario: ${hourly.error.message}` : 'El pronóstico horario no está disponible.']
      : []),
    ...(modelRuns.isError
      ? [modelRuns.error instanceof Error ? `Corridas anteriores: ${modelRuns.error.message}` : 'Las corridas anteriores no están disponibles.']
      : []),
    ...(regional.isError
      ? [regional.error instanceof Error ? `Comparador regional: ${regional.error.message}` : 'La comparación regional no está disponible.']
      : []),
    ...(climatology.isError
      ? [climatology.error instanceof Error ? `Referencia histórica: ${climatology.error.message}` : 'La referencia histórica no está disponible.']
      : []),
  ];

  const refreshAll = () => {
    void forecast.refetch();
    void currentSnow.refetch();
    void hourly.refetch();
    void modelRuns.refetch();
    void road.refetch();
    void webcam.refetch();
    void regional.refetch();
    void climatology.refetch();
  };

  const isRefreshing =
    forecast.isFetching || currentSnow.isFetching || hourly.isFetching || modelRuns.isFetching ||
    road.isFetching || webcam.isFetching || regional.isFetching || climatology.isFetching;

  return (
    <main className="app-shell">
      <Header updatedAt={forecast.data.resort.updatedAt} isRefreshing={isRefreshing} onRefresh={refreshAll} />

      <PwaStatus
        online={pwa.online}
        standalone={pwa.standalone}
        canInstall={pwa.canInstall}
        ios={pwa.ios}
        updateAvailable={pwa.updateAvailable}
        onInstall={pwa.install}
        onReload={pwa.reload}
      />

      <div className="mt-4"><WarningBanner warnings={warnings} /></div>
      <StormSummary event={storm} />

      <RoadStatusCard
        data={road.data}
        isPending={road.isPending}
        error={road.error instanceof Error ? road.error : null}
        change={road.change}
      />

      <CurrentSnowPanel
        data={currentSnow.data}
        isPending={currentSnow.isPending}
        isFetching={currentSnow.isFetching}
        error={currentSnow.error instanceof Error ? currentSnow.error : null}
      />

      {hourly.data ? <BestWindows summary={bestWindows} /> : null}

      <section className="mt-5" aria-labelledby="levels-title">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="eyebrow">Pronóstico por nivel</p>
            <h2 id="levels-title" className="mt-1 text-xl font-semibold tracking-tight text-white">Resumen de nieve futura por cota</h2>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">Fuente: {forecast.data.resort.source}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {forecast.data.levels.map((level) => (
            <LevelSummaryCard
              key={level.level.id}
              level={level}
              selected={level.level.id === selectedLevel.level.id}
              onSelect={() => preferences.setLevelId(level.level.id)}
            />
          ))}
        </div>
      </section>

      <StickyLevelSelector levels={forecast.data.levels} selectedId={selectedLevel.level.id} onSelect={preferences.setLevelId} />

      {selectedHourlyLevel ? (
        <section className="mt-5 grid gap-4 2xl:grid-cols-[1.4fr_1fr]" aria-label="Pronóstico horario y calidad">
          <HourlyTimeline level={selectedHourlyLevel} />
          <SnowPhaseQuality level={selectedHourlyLevel} />
        </section>
      ) : hourly.isPending ? (
        <section className="mt-5" aria-label="Cargando pronóstico horario"><SectionSkeleton label="Cargando pronóstico horario…" /></section>
      ) : null}

      <section className="mt-5 grid gap-4 2xl:grid-cols-[1.45fr_1fr]" aria-label="Pronóstico principal">
        <Suspense fallback={<SectionSkeleton label="Cargando gráfico de nieve…" />}><SnowForecastChart level={selectedLevel} /></Suspense>
        <Suspense fallback={<SectionSkeleton label="Cargando perfil de montaña…" />}>
          <MountainProfile levels={forecast.data.levels} period={period} onPeriodChange={preferences.setPeriod} />
        </Suspense>
      </section>

      {modelRuns.data ? (
        <section className="mt-5" aria-label="Evolución de modelos"><ModelRunEvolution data={modelRuns.data} levelId={selectedLevel.level.id} /></section>
      ) : null}

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_.85fr]" aria-label="Historial y cámara">
        <ForecastHistory
          history={history}
          levelId={selectedLevel.level.id}
          current7dCm={selectedLevel.totals.days7}
          climatology={climatology.data}
        />
        <WebcamCard data={webcam.data} isPending={webcam.isPending} error={webcam.error instanceof Error ? webcam.error : null} />
      </section>

      {regional.data ? (
        <section className="mt-5" aria-label="Comparación regional de centros">
          <RegionalComparator data={regional.data} favorites={favorites.favorites} onToggleFavorite={favorites.toggleFavorite} />
        </section>
      ) : regional.isPending ? (
        <section className="mt-5" aria-label="Cargando comparación regional"><SectionSkeleton label="Comparando centros de Argentina y Chile…" /></section>
      ) : null}

      <RegionalSnowMapLoader />

      <section className="mt-5" aria-label="Alertas locales">
        <AlertSettings
          settings={alerts.settings}
          match={alerts.match}
          notificationPermission={alerts.notificationPermission}
          onChange={alerts.setSettings}
          onRequestNotifications={alerts.requestNotifications}
        />
      </section>

      <details className="mt-5 rounded-2xl border border-white/8 bg-white/[0.018] p-4 sm:p-5">
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-semibold text-slate-200">Fuentes, estado de modelos, datos locales y metodología</summary>
        <section className="mt-3 grid gap-4 xl:grid-cols-[1fr_1.08fr]" aria-label="Fuentes y metodología">
          <Suspense fallback={<SectionSkeleton />}><ModelStatusList models={forecast.data.models} /></Suspense>
          <Suspense fallback={<SectionSkeleton />}><ForecastMethodology /></Suspense>
          <div className="xl:col-span-2"><LocalDataSettings /></div>
        </section>
      </details>

      <section className="mt-5" aria-label="Condiciones complementarias">
        <Suspense fallback={<SectionSkeleton label="Cargando condiciones…" />}><ConditionsChart level={selectedLevel} /></Suspense>
      </section>

      <section className="mt-5" aria-label="Tabla de pronóstico diario">
        <Suspense fallback={<SectionSkeleton label="Cargando tabla diaria…" />}><ForecastTable level={selectedLevel} /></Suspense>
      </section>

      <footer className="px-2 pb-5 pt-8 text-center text-xs leading-5 text-slate-600">
        Los espesores actuales son reportes de terceros y pueden diferir por hora, cota y método de medición.
        El pronóstico es estimativo. Verificá siempre el parte oficial y las condiciones de seguridad antes de subir.
      </footer>
    </main>
  );
}