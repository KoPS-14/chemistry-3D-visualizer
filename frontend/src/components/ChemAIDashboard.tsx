import React from 'react';
import type { NavTab } from './Navbar';

interface ChemAIDashboardProps {
  onTabChange: (tab: NavTab) => void;
  onQuickRender: (tab: NavTab, prompt: string) => void;
}

export const ChemAIDashboard: React.FC<ChemAIDashboardProps> = ({
  onTabChange,
  onQuickRender,
}) => {
  const labFeatures = [
    {
      tab: 'elements' as NavTab,
      title: '3D Periodic Table',
      icon: '⚛️',
      description: 'Explore all 118 chemical elements with real-time 3D electron shell orbital models and periodic properties.',
      gradient: 'from-cyan-600/30 to-blue-600/30 border-cyan-500/40 text-cyan-300',
      badge: '118 Elements',
    },
    {
      tab: 'molecules' as NavTab,
      title: '3D Molecule Studio',
      icon: '🧪',
      description: 'Render spatial 3D structures from natural language or SMILES using RDKit ETKDG geometry optimization.',
      gradient: 'from-emerald-600/30 to-teal-600/30 border-emerald-500/40 text-emerald-300',
      badge: 'RDKit Force Field',
    },
    {
      tab: 'reactions' as NavTab,
      title: '3D Reaction Simulator',
      icon: '🔥',
      description: 'Simulate organic mechanisms & inorganic synthesis with interactive keyframe animation timelines and kinetics parameters.',
      gradient: 'from-amber-600/30 to-orange-600/30 border-amber-500/40 text-amber-300',
      badge: 'Kinetics Engine',
    },
    {
      tab: 'chat' as NavTab,
      title: 'AI Chemistry Tutor',
      icon: '🤖',
      description: 'Chat with ChemAI Qwen for mechanism walkthroughs, physical chemistry calculations, and instant 3D model triggers.',
      gradient: 'from-purple-600/30 to-indigo-600/30 border-purple-500/40 text-purple-300',
      badge: 'ChemAI Qwen',
    },
  ];

  const quickShowcases = [
    {
      name: 'SN2 Nucleophilic Substitution',
      type: 'reaction' as NavTab,
      prompt: 'Show SN2 reaction of methyl bromide with hydroxide',
      icon: '🔥',
      tag: 'Reaction Mechanism',
    },
    {
      name: 'Ethanol (C2H5OH)',
      type: 'molecules' as NavTab,
      prompt: 'Show ethanol in 3D',
      icon: '🧪',
      tag: 'Organic Alcohol',
    },
    {
      name: 'Gold (Au, Z=79)',
      type: 'elements' as NavTab,
      prompt: '79',
      icon: '⚛️',
      tag: 'Transition Metal',
    },
    {
      name: 'Diels-Alder Cycloaddition',
      type: 'reactions' as NavTab,
      prompt: 'Diels-Alder Cycloaddition of Butadiene and Ethylene',
      icon: '🔥',
      tag: 'Pericyclic Reaction',
    },
  ];

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-cyan-950/80 border border-cyan-700/60 px-3 py-1 rounded-full text-xs text-cyan-300 font-mono shadow-sm">
            <span>✨</span>
            <span>Interactive Digital Chemistry Laboratory & AI Tutor</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-white via-cyan-100 to-teal-200 bg-clip-text text-transparent font-sans tracking-tight">
            ChemAI 3D Laboratory
          </h1>

          <p className="text-slate-300 text-xs sm:text-base leading-relaxed font-sans">
            Combine natural language AI understanding with RDKit chemical validation and 3D spatial coordinate generation. Explore elements, molecules, and chemical reaction animation timelines interactively.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onTabChange('elements')}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40 transition-all cursor-pointer flex items-center gap-2 hover:scale-105"
            >
              <span>⚛️</span>
              <span>Open 3D Periodic Table</span>
            </button>
            <button
              onClick={() => onTabChange('chat')}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2 shadow-md"
            >
              <span>🤖</span>
              <span>Ask AI Chemistry Tutor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {labFeatures.map((feat) => (
          <div
            key={feat.tab}
            onClick={() => onTabChange(feat.tab)}
            className={`p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 group shadow-xl backdrop-blur-xl`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-800">
                  {feat.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                {feat.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {feat.description}
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform font-mono pt-2">
              <span>Launch Studio</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start Showcase Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span>Featured 3D Models & Simulations</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Click any model below to immediately launch its interactive 3D visualization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickShowcases.map((sc, idx) => (
            <button
              key={idx}
              onClick={() => onQuickRender(sc.type, sc.prompt)}
              className="p-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{sc.icon}</span>
                <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                  {sc.tag}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {sc.name}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-1">
                  {sc.prompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
