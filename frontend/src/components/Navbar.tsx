import React from 'react';

export type NavTab = 'dashboard' | 'elements' | 'molecules' | 'reactions' | 'chat';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  backendConnected: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  backendConnected,
}) => {
  const navItems: { id: NavTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'ChemAI', icon: '⚗️' },
    { id: 'elements', label: 'Periodic Table', icon: '⚛️' },
    { id: 'molecules', label: 'Molecules', icon: '🧪' },
    { id: 'reactions', label: 'Reactions', icon: '🔥' },
    { id: 'chat', label: 'AI Assistant', icon: '🤖' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-2xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between sticky top-0 z-40 shadow-2xl relative">
      {/* Brand Logo & Subtitle */}
      <div
        onClick={() => onTabChange('dashboard')}
        className="flex items-center gap-3 cursor-pointer group select-none"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40 transform group-hover:scale-105 transition-all">
          <span className="text-xl">⚗️</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-black bg-gradient-to-r from-white via-cyan-100 to-teal-300 bg-clip-text text-transparent tracking-tight font-sans">
              ChemAI
            </h1>
            <span className="text-[10px] font-extrabold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 uppercase tracking-widest font-mono">
              3D LAB
            </span>
          </div>
          <p className="text-[11px] text-cyan-400/90 font-mono tracking-wide hidden sm:block">
            Interactive Digital Chemistry Laboratory & AI Tutor
          </p>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <nav className="flex items-center gap-1 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800/90 shadow-inner my-2 sm:my-0">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/35 border border-cyan-400/40 scale-105'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Backend Status Indicator */}
      <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-sm font-mono text-xs">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            backendConnected === true
              ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
              : backendConnected === false
              ? 'bg-rose-500'
              : 'bg-amber-400'
          }`}
        />
        <span className="text-slate-300">
          {backendConnected === true
            ? 'FastAPI & ChemAI Live'
            : backendConnected === false
            ? 'Backend Offline'
            : 'Connecting...'}
        </span>
      </div>
    </header>
  );
};
