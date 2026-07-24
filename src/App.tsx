import { useState } from 'react';
import { ConditionsChart } from './components/charts/ConditionsChart.js';
import { SnowForecastChart } from './components/charts/SnowForecastChart.js';
import { CurrentSnowPanel } from './components/dashboard/CurrentSnowPanel.js';
import { ErrorState } from './components/dashboard/ErrorState.js';
import { ForecastMethodology } from './components/dashboard/ForecastMethodology.js';
import { ForecastTable } from './components/dashboard/ForecastTable.js';
import { Header } from './components/dashboard/Header.js';
import { LevelSummaryCard } from './components/dashboard/LevelSummaryCard.js';
import { LoadingDashboard } from './components/dashboard/LoadingDashboard.js';
import { ModelStatusList } from './components/dashboard/ModelStatusList.js';
import { MountainProfile } from './components/dashboard/MountainProfile.js';
import { WarningBanner } from './components/dashboard/WarningBanner.js';
import { useCurrentSnow } from './hooks/useCurrentSnow.js';
import { useForecast } from './hooks/useForecast.js';
import {
  nextSnowEvent,
  type ForecastPeriod,
} from './lib/forecast/presentation.js';
import type { LevelId } from './types/forecast.js';

export function App() {
  const forecast = useForecast();
  const currentSnow = useCurrentSnow();
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId>('summit');
  const [period, setPeriod] = useState<ForecastPeriod>('7d');

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

  const summit = forecast.data.levels.find((level) => level.level.id === 'summit') ?? selectedLevel;
  const snowEvent = nextSnowEvent(summit);
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
        event={snowEvent}
        isRefreshing={forecast.isFetching || currentSnow.isFetching}
        onRefresh={refreshAll}
      />

      <div className="mt-4">
        <WarningBanner warnings={warnings} />
      </div>

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
              Elegí una cota para explorar la nieve futura
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

      <section className="mt-5 grid gap-4 2xl:grid-cols-[1.45fr_1fr]" aria-label="Pronóstico principal">
        <SnowForecastChart level={selectedLevel} />
        <MountainProfile
          levels={forecast.data.levels}
          period={period}
          onPeriodChange={setPeriod}
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.08fr]" aria-label="Fuentes y metodología">
        <ModelStatusList models={forecast.data.models} />
        <ForecastMethodology />
      </section>

      <section className="mt-5" aria-label="Condiciones complementarias">
        <ConditionsChart level={selectedLevel} />
      </section>

      <section className="mt-5" aria-label="Tabla de pronóstico diario">
        <ForecastTable level={selectedLevel} />
      </section>

      <footer className="px-2 pb-5 pt-8 text-center text-xs leading-5 text-slate-600">
        Los espesores actuales son reportes de terceros y pueden diferir por hora, cota y método de medición.
        El pronóstico es estimativo. Verificá siempre el parte oficial y las condiciones de seguridad antes de subir.
      </footer>
    </main>
  );
}
