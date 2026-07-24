import {
  bandLabel,
  confidenceClass,
  formatCm,
  formatDay,
  formatElevation,
  formatTemperature,
  formatWind,
} from '../../lib/format.js';
import type { LevelForecast, ModelId } from '../../types/forecast.js';
import { Badge } from '../ui/Badge.js';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card.js';

function modelSnowfall(
  day: LevelForecast['daily'][number],
  model: ModelId,
): number | null {
  return day.models.find((value) => value.model === model)?.snowfallCm ?? null;
}

export function ForecastTable({ level }: { level: LevelForecast }) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="p-5 sm:p-6">
        <div>
          <CardTitle>Detalle diario · {level.level.name}</CardTitle>
          <CardDescription>
            Valores ausentes se muestran como “—”; nunca se completan con cero.
          </CardDescription>
        </div>
      </CardHeader>
      <div className="overflow-x-auto border-t border-white/8">
        <table className="min-w-[980px] w-full border-collapse text-left text-xs">
          <caption className="sr-only">
            Pronóstico diario de nieve y condiciones para {level.level.name}
          </caption>
          <thead className="bg-black/15 text-[0.65rem] uppercase tracking-[0.13em] text-slate-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Fecha</th>
              <th className="px-3 py-3.5 font-semibold">Consenso</th>
              <th className="px-3 py-3.5 font-semibold">Rango</th>
              <th className="px-3 py-3.5 font-semibold">ECMWF</th>
              <th className="px-3 py-3.5 font-semibold">GFS</th>
              <th className="px-3 py-3.5 font-semibold">ICON</th>
              <th className="px-3 py-3.5 font-semibold">Temp.</th>
              <th className="px-3 py-3.5 font-semibold">Viento</th>
              <th className="px-3 py-3.5 font-semibold">Cota 0°</th>
              <th className="px-5 py-3.5 font-semibold">Confianza</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.055]">
            {level.daily.map((day) => (
              <tr key={day.date} className="transition hover:bg-white/[0.03]">
                <td className="px-5 py-3.5">
                  <p className="font-medium capitalize text-slate-200">{formatDay(day.date)}</p>
                  <p className="mt-1 text-[0.66rem] text-slate-500">{bandLabel(day.band)}</p>
                </td>
                <td className="px-3 py-3.5 font-semibold tabular-nums text-sky-100">
                  {formatCm(day.snowfallMedianCm, 1)}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-400">
                  {day.snowfallMinCm === null || day.snowfallMaxCm === null
                    ? '—'
                    : `${day.snowfallMinCm.toFixed(1)}–${day.snowfallMaxCm.toFixed(1)}`}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-300">
                  {formatCm(modelSnowfall(day, 'ecmwf'), 1)}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-300">
                  {formatCm(modelSnowfall(day, 'gfs'), 1)}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-300">
                  {formatCm(modelSnowfall(day, 'icon'), 1)}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-400">
                  {formatTemperature(day.temperatureMinC)} / {formatTemperature(day.temperatureMaxC)}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-400">
                  {formatWind(day.windMaxKmh)}
                </td>
                <td className="px-3 py-3.5 tabular-nums text-slate-400">
                  {formatElevation(day.freezingLevelM)}
                </td>
                <td className="px-5 py-3.5">
                  <Badge className={confidenceClass(day.confidenceLabel)}>
                    {day.confidenceLabel} · {day.confidenceScore}%
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
