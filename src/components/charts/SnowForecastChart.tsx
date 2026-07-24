import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCm, formatDay, formatLongDay } from '../../lib/format.js';
import type { LevelForecast } from '../../types/forecast.js';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card.js';

interface SnowChartDatum {
  date: string;
  snowfallMedianCm: number | null;
  snowfallMinCm: number | null;
  snowfallMaxCm: number | null;
  cumulativeMedianCm: number | null;
  snowfallRange: [number, number] | null;
  confidenceScore: number;
}

interface SnowTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SnowChartDatum }>;
  label?: string;
}

function SnowTooltip({ active, payload, label }: SnowTooltipProps) {
  const value = payload?.[0]?.payload;
  if (!active || !value || !label) return null;

  return (
    <div className="chart-tooltip min-w-48">
      <p className="font-semibold capitalize text-white">{formatLongDay(label)}</p>
      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-400">Nieve diaria</span>
          <span className="font-semibold text-sky-100">{formatCm(value.snowfallMedianCm, 1)}</span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-400">Rango modelos</span>
          <span className="text-slate-200">
            {value.snowfallMinCm === null || value.snowfallMaxCm === null
              ? '—'
              : `${value.snowfallMinCm.toFixed(1)}–${value.snowfallMaxCm.toFixed(1)} cm`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-400">Acumulado</span>
          <span className="text-slate-200">{formatCm(value.cumulativeMedianCm, 1)}</span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-400">Índice de confianza</span>
          <span className="text-slate-200">{value.confidenceScore}%</span>
        </div>
      </div>
    </div>
  );
}

function HorizonLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[0.68rem] text-slate-500">
      <span className="inline-flex items-center gap-2">
        <i className="size-2 rounded-full bg-sky-300" /> Días 0–7 · operativo
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="size-2 rounded-full bg-amber-300" /> Días 8–10 · tendencia
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="size-2 rounded-full bg-slate-500" /> Días 11–15 · orientativo
      </span>
    </div>
  );
}

export function SnowForecastChart({ level }: { level: LevelForecast }) {
  const data: SnowChartDatum[] = level.daily.map((day) => ({
    date: day.date,
    snowfallMedianCm: day.snowfallMedianCm,
    snowfallMinCm: day.snowfallMinCm,
    snowfallMaxCm: day.snowfallMaxCm,
    cumulativeMedianCm: day.cumulativeMedianCm,
    snowfallRange:
      day.snowfallMinCm === null || day.snowfallMaxCm === null
        ? null
        : [day.snowfallMinCm, day.snowfallMaxCm],
    confidenceScore: day.confidenceScore,
  }));

  return (
    <Card className="min-h-[32rem] overflow-hidden">
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start">
        <div>
          <CardTitle>Nieve diaria y acumulada · {level.level.name}</CardTitle>
          <CardDescription>
            Barras: mediana de modelos. Banda: mínimo–máximo. Línea: acumulado.
          </CardDescription>
        </div>
        <HorizonLegend />
      </CardHeader>

      <div className="mt-5 h-[25rem] w-full" role="img" aria-label={`Gráfico de nieve para ${level.level.name}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 8, left: -12 }} accessibilityLayer>
            <defs>
              <linearGradient id="snowBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8f3ff" />
                <stop offset="100%" stopColor="#4bbce7" />
              </linearGradient>
              <linearGradient id="snowRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,.10)" vertical={false} />
            <ReferenceArea x1={data[0]?.date} x2={data[7]?.date} fill="rgba(56,189,248,.035)" strokeOpacity={0} />
            <ReferenceArea x1={data[8]?.date} x2={data[10]?.date} fill="rgba(251,191,36,.045)" strokeOpacity={0} />
            <ReferenceArea x1={data[11]?.date} x2={data[14]?.date} fill="rgba(100,116,139,.055)" strokeOpacity={0} />
            <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: '#738296', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
            <YAxis yAxisId="daily" tick={{ fill: '#738296', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `${value} cm`} width={58} />
            <YAxis yAxisId="cumulative" orientation="right" tick={{ fill: '#738296', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `${value}`} width={42} />
            <Tooltip content={<SnowTooltip />} cursor={{ fill: 'rgba(255,255,255,.025)' }} />
            <Legend verticalAlign="top" align="right" height={30} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Area yAxisId="daily" type="monotone" dataKey="snowfallRange" name="Rango" fill="url(#snowRange)" stroke="rgba(125,211,252,.24)" connectNulls isAnimationActive={false} />
            <Bar yAxisId="daily" dataKey="snowfallMedianCm" name="Nieve diaria" fill="url(#snowBar)" radius={[6, 6, 2, 2]} maxBarSize={24} isAnimationActive={false} />
            <Line yAxisId="cumulative" type="monotone" dataKey="cumulativeMedianCm" name="Acumulado" stroke="#f8fafc" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
