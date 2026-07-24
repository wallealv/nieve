import { lazy, Suspense, useMemo, useState } from 'react';
import { AlertSettings } from './components/dashboard/AlertSettings.js';
import { CurrentSnowPanel } from './components/dashboard/CurrentSnowPanel.js';
import { ErrorState } from './components/dashboard/ErrorState.js';
import { ForecastHistory } from './components/dashboard/ForecastHistory.js';
import { Header } from './components/dashboard/Header.js';
import { LevelSummaryCard } from './components/dashboard/LevelSummaryCard.js';
import { LoadingDashboard } from './components/dashboard/LoadingDashboard.js';
import { SectionSkeleton } from './components/dashboard/SectionSkeleton.js';
import { StickyLevelSelector } from './components/dashboard/StickyLevelSelector.js';
import { StormSummary } from './components/dashboard/StormSummary.js';
import { WarningBanner } from './components/dashboard/WarningBanner.js';
import { useAlertSettings } from './hooks/useAlertSettings.js';
import { useCurrentSnow } from './hooks/useCurrentSnow.js';
import { useForecast } from './hooks/useForecast.js';
import { useForecastHistory } from './hooks/useForecastHistory.js';
import { findPrimaryStorm } from './lib/forecast/storm.js';
import type { ForecastPeriod } from './lib/forecast/presentation.js';
import type { LevelId } from './types/forecast.js';

const SnowForecastChart = lazy(() =>
  import('./components/charts/SnowForecastChart.js').then((module) => ({
    default: module.SnowForecastChart,
  })),
);
const ConditionsChart = lazy(() =>
  import('./components/charts/ConditionsChart.js').then((module) => ({
    default: module.ConditionsChart,
  })),
);
const ForecastTable = lazy(() =>
  import('./components/dashboard/ForecastTable.js').then((module) => ({
    default: module.ForecastTable,
  })),
);
const ForecastMethodology = lazy(() =>
  import('./components/dashboard/ForecastMethodology.js').then((module) => ({
    default: module.ForecastMethodology,
  })),
);
const ModelStatusList = lazy(() =>
  import('./components/dashboard/ModelStatusList.js').then((module) => ({
    default: module.ModelStatusList,
  })),
);
const MountainProfile = lazy(() =>
  import('./components/dashboard/MountainProfile.js').then((module) => ({
    default: module.MountainProfile,
  })),
);

export function App() {
  const forecast = useForecast();
  const currentSnow = useCurrentSnow();
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId>('summit');
  const [period, setPeriod] = useState<ForecastPeriod>('7d');
  const storm = useMemo(
    () => (forecast.data ? findPrimaryStorm(forecast.data.levels) : null),
    [forecast.data],
  );
  const history = useForecastHistory(forecast.data, currentSnow.data, storm);
  const alerts = useAlertSettings(forecast.data);

  const selectedLevel =
    forecast.data?.levels.find((level) => level.level.id === selectedLevelId) ??
    forecast.data?.levels[0];

  if (forecast.isPending) return <LoadingDashboard />;
  if (!forecast.data || !selectedLevel) {
    return (
      <ErrorState
        message={forecast.error instanceof Error ? forecast.error.message : 'Error desconocido.'}
        onRetry={() => void forecast.refetch()}
      />
    );
  }

  const warnings = forecast.isError
    ? [
        ...forecast.data.warnings,
        forecast.error instanceof Error
          ? forecast.error.message
          : 'La última actualización falló; se muestran los datos anteriores.',
      ]
    : forecast.data.warnings;

  const refreshAll = () => {
    void forecast.refetch();
    void currentSnow.refetch();
  };

  return (
    <main className="app-shell">
      <Header
        updatedAt={forecast.data.resort.updatedAt}
        isRefreshing={forecast.isFetching || currentSnow.isFetching}
        onRefresh={refreshAll}
      />

      <div className="mt-4">
        <WarningBanner warnings={warnings} />
      </div>

      <StormSummary event={storm} />

      <CurrentSnowPanel
        data={currentSnow.data}
        isPending={currentSnow.isPending}
        isFetching={currentSnow.isFetching}
        error={currentSnow.error instanceof Error ? currentSnow.error : null}
      />

      <section className="mt-5" aria-labelledby="levels-title">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="eyebrow">Pronóstico por nivel</p>
            <h2 id="levels-title" className="mt-1 text-xl font-semibold tracking-tight text-white">
              Resumen de nieve futura por cota
            </h2>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">
            Fuente: {forecast.data.resort.source}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {forecast.data.levels.map((level) => (
            <LevelSummaryCard
              key={level.level.id}
              level={level}
              selected={level.level.id === selectedLevel.level.id}
              onSelect={() => setSelectedLevelId(level.level.id)}
            />
          ))}
        </div>
      </section>

      <StickyLevelSelector
        levels={forecast.data.levels}
        selectedId={selectedLevel.level.id}
        onSelect={setSelectedLevelId}
      />

      <section className="mt-5 grid gap-4 2xl:grid-cols-[1.45fr_1fr]" aria-label="Pronóstico principal">
        <Suspense fallback={<SectionSkeleton label="Cargando gráfico de nieve…" />}>
          <SnowForecastChart level={selectedLevel} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton label="Cargando perfil de montaña…" />}>
          <MountainProfile
            levels={forecast.data.levels}
            period={period}
            onPeriodChange={setPeriod}
          />
        </Suspense>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2" aria-label="Historial y alertas">
        <ForecastHistory history={history} levelId={selectedLevel.level.id} />
        <AlertSettings
          settings={alerts.settings}
          match={alerts.match}
          notificationPermission={alerts.notificationPermission}
          onChange={alerts.setSettings}
          onRequestNotifications={alerts.requestNotifications}
        />
      </section>

      <details className="mt-5 rounded-2xl border border-white/8 bg-white/[0.018] p-4 sm:p-5">
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-semibold text-slate-200">
          Fuentes, estado de modelos y metodología
        </summary>
        <section className="mt-3 grid gap-4 xl:grid-cols-[1fr_1.08fr]" aria-label="Fuentes y metodología">
          <Suspense fallback={<SectionSkeleton />}>
            <ModelStatusList models={forecast.data.models} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <ForecastMethodology />
          </Suspense>
        </section>
      </details>

      <section className="mt-5" aria-label="Condiciones complementarias">
        <Suspense fallback={<SectionSkeleton label="Cargando condiciones…" />}>
          <ConditionsChart level={selectedLevel} />
        </Suspense>
      </section>

      <section className="mt-5" aria-label="Tabla de pronóstico diario">
        <Suspense fallback={<SectionSkeleton label="Cargando tabla diaria…" />}>
          <ForecastTable level={selectedLevel} />
        </Suspense>
      </section>

      <footer className="px-2 pb-5 pt-8 text-center text-xs leading-5 text-slate-600">
        Los espesores actuales son reportes de terceros y pueden diferir por hora, cota y método de medición.
        El pronóstico es estimativo. Verificá siempre el parte oficial y las condiciones de seguridad antes de subir.
      </footer>
    </main>
  );
}
