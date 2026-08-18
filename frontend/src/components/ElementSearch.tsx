import React, { useState, useMemo } from 'react';
import type { ElementData } from '../types/reaction';

interface ElementSearchProps {
  elements: ElementData[];
  onSelectElement: (element: ElementData) => void;
}

export const ElementSearch: React.FC<ElementSearchProps> = ({ elements, onSelectElement }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    return elements.filter(
      (el) =>
        el.name.toLowerCase().includes(q) ||
        el.symbol.toLowerCase().includes(q) ||
        String(el.atomic_number) === q
    ).slice(0, 8); // Limit to top 8 matches
  }, [elements, searchTerm]);

  const handleSelect = (el: ElementData) => {
    onSelectElement(el);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search element by name, symbol, or atomic number (e.g. Carbon, C, 6)..."
          className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg pl-9 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs transition"
        />
        <svg
          className="w-4 h-4 text-slate-500 absolute left-3 top-2.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          {filtered.map((el) => (
            <button
              key={`search-el-${el.atomic_number}`}
              onClick={() => handleSelect(el)}
              className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-0 text-xs transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 font-mono font-bold text-cyan-400">#{el.atomic_number}</span>
                <span className="font-semibold text-slate-200">{el.name}</span>
                <span className="font-mono text-slate-400">({el.symbol})</span>
              </div>
              <span className="text-[10px] text-slate-500 capitalize">{el.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
