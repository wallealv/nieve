import { Info, ShieldCheck, Telescope, TriangleAlert } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card.js';

const bands = [
  {
    title: 'Días 0–7',
    subtitle: 'Pronóstico operativo',
    description: 'ECMWF + GFS + ICON. Es el tramo más útil para tomar decisiones.',
    icon: ShieldCheck,
    className: 'text-sky-200 bg-sky-300/10',
  },
  {
    title: 'Días 8–10',
    subtitle: 'Tendencia extendida',
    description: 'ECMWF + GFS. Importa más la señal que el centímetro exacto.',
    icon: Telescope,
    className: 'text-amber-200 bg-amber-300/10',
  },
  {
    title: 'Días 11–15',
    subtitle: 'Escenario orientativo',
    description: 'Baja predictibilidad local. Se muestra para anticipar tendencias.',
    icon: TriangleAlert,
    className: 'text-slate-300 bg-slate-300/10',
  },
] as const;

export function ForecastMethodology() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Cómo leer este pronóstico</CardTitle>
          <CardDescription>
            La confianza combina acuerdo entre modelos, cobertura y distancia temporal.
          </CardDescription>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-white/[0.055] text-slate-300">
          <Info className="size-4.5" aria-hidden="true" />
        </span>
      </CardHeader>

      <div className="mt-5 space-y-3">
        {bands.map((band) => {
          const Icon = band.icon;
          return (
            <div key={band.title} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${band.className}`}>
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="text-sm font-semibold text-white">{band.title}</p>
                  <p className="text-xs font-medium text-slate-400">{band.subtitle}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{band.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        El índice de confianza es interno; no representa una probabilidad meteorológica oficial.
      </p>
    </Card>
  );
}
