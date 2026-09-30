import React from 'react';
import type { MoleculeData } from '../types/reaction';

interface MoleculeInfoPanelProps {
  molecule: MoleculeData | null;
}

export const MoleculeInfoPanel: React.FC<MoleculeInfoPanelProps> = ({ molecule }) => {
  if (!molecule) return null;

  const atomCount = molecule.atoms?.length || 0;
  const bondCount = molecule.bonds?.length || 0;

  // Derive simple empirical formula from atoms
  const elementCounts: Record<string, number> = {};
  molecule.atoms.forEach((a) => {
    elementCounts[a.element] = (elementCounts[a.element] || 0) + 1;
  });

  const formulaStr = Object.entries(elementCounts)
    .map(([elem, count]) => (count > 1 ? `${elem}${count}` : elem))
    .join('');

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white text-base shadow-md">
            🧪
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sans tracking-wide">
              {molecule.name || 'Molecule Structure'}
            </h3>
            <p className="text-xs text-cyan-400 font-mono">
              Empirical Formula: <span className="font-bold text-slate-100">{formulaStr || 'N/A'}</span>
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-3 py-1 rounded-full border border-cyan-800/60 shadow-sm">
          RDKit ETKDG 3D
        </span>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Chemical SMILES</span>
          <span className="font-mono text-slate-100 font-bold mt-1 truncate" title={molecule.smiles}>
            {molecule.smiles || 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Explicit Atoms</span>
          <span className="font-mono text-cyan-300 font-bold text-sm mt-0.5">
            {atomCount} Atoms
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Covalent Bonds</span>
          <span className="font-mono text-teal-300 font-bold text-sm mt-0.5">
            {bondCount} Bonds
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Force Field Optimization</span>
          <span className="font-mono text-emerald-300 font-bold text-xs mt-1">
            MMFF94 / UFF Energy Min.
          </span>
        </div>
      </div>
    </div>
  );
};
