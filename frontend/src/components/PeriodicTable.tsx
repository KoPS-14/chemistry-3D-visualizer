import React from 'react';
import type { ElementData } from '../types/reaction';
import { getCategoryColor } from '../three/scene';

interface PeriodicTableProps {
  elements: ElementData[];
  selectedElement: ElementData | null;
  onSelectElement: (element: ElementData) => void;
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({
  elements,
  selectedElement,
  onSelectElement,
}) => {
  // Create a map for quick lookup by (period, group)
  const mainGridMap = new Map<string, ElementData>();
  const lanthanides: ElementData[] = [];
  const actinides: ElementData[] = [];

  elements.forEach((el) => {
    if (el.atomic_number >= 57 && el.atomic_number <= 71) {
      lanthanides.push(el);
    } else if (el.atomic_number >= 89 && el.atomic_number <= 103) {
      actinides.push(el);
    } else if (el.period && el.group) {
      mainGridMap.set(`${el.period}-${el.group}`, el);
    }
  });

  // Sort f-block series by atomic number
  lanthanides.sort((a, b) => a.atomic_number - b.atomic_number);
  actinides.sort((a, b) => a.atomic_number - b.atomic_number);

  const periods = [1, 2, 3, 4, 5, 6, 7];
  const groups = Array.from({ length: 18 }, (_, i) => i + 1);

  const renderTile = (el: ElementData) => {
    const isSelected = selectedElement?.atomic_number === el.atomic_number;
    const catColor = getCategoryColor(el.category);

    return (
      <button
        key={`el-tile-${el.atomic_number}`}
        onClick={() => onSelectElement(el)}
        style={{
          borderColor: isSelected ? '#38bdf8' : 'rgba(51, 65, 85, 0.6)',
          backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.25)' : 'rgba(15, 23, 42, 0.8)',
        }}
        className={`relative flex flex-col items-center justify-between p-1 rounded border transition-all duration-150 group hover:scale-105 hover:z-10 hover:border-cyan-400 aspect-square select-none cursor-pointer ${
          isSelected ? 'ring-2 ring-cyan-400 z-10 shadow-lg shadow-cyan-500/20' : ''
        }`}
        title={`${el.name} (${el.symbol}) - Z=${el.atomic_number}`}
      >
        {/* Category color top indicator */}
        <span
          className="w-full h-1 rounded-t-sm opacity-80"
          style={{ backgroundColor: catColor }}
        />

        <div className="w-full flex justify-between items-center text-[9px] text-slate-400 font-mono px-0.5">
          <span>{el.atomic_number}</span>
        </div>

        <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono leading-none my-0.5">
          {el.symbol}
        </span>

        <span className="text-[9px] text-slate-400 truncate w-full text-center hidden sm:block">
          {el.name}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl overflow-x-auto">
      <div className="min-w-[750px] flex flex-col gap-4">
        {/* Main 18-group x 7-period Grid */}
        <div className="grid grid-cols-18 gap-1.5">
          {periods.map((p) =>
            groups.map((g) => {
              const key = `${p}-${g}`;
              const el = mainGridMap.get(key);

              // Placeholder for La (57-71) in main grid (Period 6, Group 3)
              if (p === 6 && g === 3) {
                return (
                  <div
                    key="placeholder-la"
                    className="flex flex-col items-center justify-center p-1 rounded border border-slate-800 bg-slate-950/40 text-[10px] text-pink-400/80 font-mono select-none"
                  >
                    57-71
                  </div>
                );
              }

              // Placeholder for Ac (89-103) in main grid (Period 7, Group 3)
              if (p === 7 && g === 3) {
                return (
                  <div
                    key="placeholder-ac"
                    className="flex flex-col items-center justify-center p-1 rounded border border-slate-800 bg-slate-950/40 text-[10px] text-rose-400/80 font-mono select-none"
                  >
                    89-103
                  </div>
                );
              }

              if (el) {
                return renderTile(el);
              }

              return <div key={`empty-${p}-${g}`} className="aspect-square" />;
            })
          )}
        </div>

        {/* Lanthanides & Actinides F-Block */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-1.5 pl-[11.11%]">
          {/* Lanthanides Series */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-pink-400 font-semibold w-16 text-right pr-2">
              Lanthanides
            </span>
            <div className="grid grid-cols-15 gap-1.5 flex-1">
              {lanthanides.map((el) => renderTile(el))}
            </div>
          </div>

          {/* Actinides Series */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-rose-400 font-semibold w-16 text-right pr-2">
              Actinides
            </span>
            <div className="grid grid-cols-15 gap-1.5 flex-1">
              {actinides.map((el) => renderTile(el))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
