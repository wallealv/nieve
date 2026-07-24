import type { ReactNode } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDay } from '../../lib/format.js';
import type { LevelForecast } from '../../types/forecast.js';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card.js';

interface ConditionsDatum {
  date: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  temperatureRange: [number, number] | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  freezingLevelM: number | null;
}

function compactTooltip(unit: string) {
  return {
    contentStyle: {
      background: 'rgba(7,17,31,.96)',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 14,
      boxShadow: '0 18px 50px rgba(0,0,0,.35)',
      fontSize: 12,
    },
    labelFormatter: (label: string) => formatDay(label),
    formatter: (value: unknown): [string, string] => [
      value == null ? '—' : `${String(value)}${unit}`,
      '',
    ],
  };
}

function MiniChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-3 h-44">{children}</div>
    </div>
  );
}

export function ConditionsChart({ level }: { level: LevelForecast }) {
  const data: ConditionsDatum[] = level.daily.map((day) => ({
    date: day.date,
    temperatureMinC: day.temperatureMinC,
    temperatureMaxC: day.temperatureMaxC,
    temperatureRange:
      day.temperatureMinC === null || day.temperatureMaxC === null
        ? null
        : [day.temperatureMinC, day.temperatureMaxC],
    windMaxKmh: day.windMaxKmh,
    gustMaxKmh: day.gustMaxKmh,
    freezingLevelM: day.freezingLevelM,
  }));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Condiciones complementarias · {level.level.name}</CardTitle>
          <CardDescription>
            Temperatura, viento y cota de congelación para evaluar calidad y operación.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        <MiniChartFrame title="Temperatura" description="Mínima y máxima diaria">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -24, bottom: 0 }} accessibilityLayer>
              <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={18} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip {...compactTooltip('°C')} />
              <Area type="monotone" dataKey="temperatureRange" fill="rgba(125,211,252,.12)" stroke="rgba(125,211,252,.28)" isAnimationActive={false} />
              <Line type="monotone" dataKey="temperatureMinC" stroke="#7dd3fc" dot={false} strokeWidth={1.7} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="temperatureMaxC" stroke="#f8fafc" dot={false} strokeWidth={1.7} connectNulls isAnimationActive={false} />
              <ReferenceLine y={0} stroke="rgba(251,191,36,.4)" strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </MiniChartFrame>

        <MiniChartFrame title="Viento y ráfagas" description="Máximo diario en km/h">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -24, bottom: 0 }} accessibilityLayer>
              <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={18} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip {...compactTooltip(' km/h')} />
              <Area type="monotone" dataKey="gustMaxKmh" fill="rgba(167,139,250,.12)" stroke="none" isAnimationActive={false} />
              <Line type="monotone" dataKey="windMaxKmh" name="Viento" stroke="#7dd3fc" dot={false} strokeWidth={1.8} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="gustMaxKmh" name="Ráfagas" stroke="#c4b5fd" dot={false} strokeWidth={1.8} connectNulls isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </MiniChartFrame>

        <MiniChartFrame title="Cota de congelación" description={`Comparada con ${level.level.elevationM.toLocaleString('es-AR')} m`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -12, bottom: 0 }} accessibilityLayer>
              <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={18} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `${Math.round(value / 100) * 100}`} width={48} />
              <Tooltip {...compactTooltip(' m')} />
              <Area type="monotone" dataKey="freezingLevelM" name="Cota 0°" stroke="#fbbf24" fill="rgba(251,191,36,.12)" connectNulls isAnimationActive={false} />
              <ReferenceLine y={level.level.elevationM} stroke="rgba(125,211,252,.55)" strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </MiniChartFrame>
      </div>
    </Card>
  );
}
