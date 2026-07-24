import type { LevelForecast, LevelId } from '../../types/forecast.js';
import { cn } from '../../lib/utils.js';

export function StickyLevelSelector({
  levels,
  selectedId,
  onSelect,
}: {
  levels: LevelForecast[];
  selectedId: LevelId;
  onSelect: (levelId: LevelId) => void;
}) {
  return (
    <div className="sticky top-2 z-20 mt-5 rounded-2xl border border-white/10 bg-[#07111f]/90 p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Seleccionar cota del pronóstico">
        {levels.map((level) => {
          const selected = level.level.id === selectedId;
          return (
            <button
              key={level.level.id}
              type="button"
              className={cn(
                'min-h-11 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm',
                selected
                  ? 'bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,.22)]'
                  : 'text-slate-400 hover:bg-white/[0.045] hover:text-slate-200',
              )}
              aria-pressed={selected}
              onClick={() => onSelect(level.level.id)}
            >
              <span className="block">{level.level.shortName}</span>
              <span className="mt-0.5 block text-[10px] font-medium text-slate-500 sm:text-[11px]">
                {level.level.elevationM.toLocaleString('es-AR')} m
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
