import React, { useState, useEffect } from 'react';
import type { ReactionConditions, KineticsEvaluationResult, ReactionData } from '../types/reaction';
import { fetchReactionExplanation } from '../services/api';

interface ReactionConditionsControlProps {
  reaction?: ReactionData | null;
  conditions: ReactionConditions;
  kineticsResult: KineticsEvaluationResult | null;
  isLoadingKinetics: boolean;
  onConditionsChange: (newConditions: ReactionConditions) => void;
}

const CATALYST_OPTIONS = [
  { value: 'none', label: 'None (Uncatalyzed)' },
  { value: 'acid', label: 'Acid Catalyst (H⁺)' },
  { value: 'base', label: 'Base Catalyst (OH⁻)' },
  { value: 'platinum', label: 'Platinum / Metal Surface (Pt/Pd)' },
  { value: 'v2o5', label: 'Vanadium Pentoxide (V₂O₅)' },
  { value: 'enzyme', label: 'Biological Enzyme' },
];

const SOLVENT_OPTIONS = [
  { value: 'aqueous', label: 'Aqueous (H₂O)' },
  { value: 'acetone', label: 'Polar Aprotic (Acetone / DMSO)' },
  { value: 'ethanol', label: 'Polar Protic (Ethanol / MeOH)' },
  { value: 'hexane', label: 'Non-polar (Hexane / Toluene)' },
];

export const ReactionConditionsControl: React.FC<ReactionConditionsControlProps> = ({
  reaction,
  conditions,
  kineticsResult,
  isLoadingKinetics,
  onConditionsChange,
}) => {
  const currentTemp = conditions.temperature_c ?? 25;
  const currentPress = conditions.pressure_atm ?? 1.0;
  const currentCat = conditions.catalyst ?? 'none';
  const currentSolvent = conditions.solvent ?? 'aqueous';
  const currentConc = parseFloat(String(conditions.concentration || '1.0')) || 1.0;

  // Determine if conditions are interrupted / non-standard
  const isInterrupted =
    currentTemp !== 25 ||
    currentPress !== 1.0 ||
    currentCat !== 'none' ||
    currentSolvent !== 'aqueous' ||
    currentConc !== 1.0;

  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  useEffect(() => {
    if (!reaction) return;

    let isMounted = true;
    setLoadingAi(true);

    fetchReactionExplanation(
      reaction.name || 'Chemical Reaction',
      reaction.reaction_type || 'General',
      reaction.balanced_equation,
      conditions,
      kineticsResult,
      isInterrupted
    ).then((explanation) => {
      if (isMounted) {
        setAiExplanation(explanation || '');
        setLoadingAi(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    reaction?.name,
    reaction?.reaction_type,
    currentTemp,
    currentPress,
    currentCat,
    currentSolvent,
    currentConc,
    kineticsResult?.relative_rate_multiplier,
  ]);

  const handleTempChange = (temp: number) => {
    onConditionsChange({ ...conditions, temperature_c: temp });
  };

  const handlePressChange = (press: number) => {
    onConditionsChange({ ...conditions, pressure_atm: press });
  };

  const handleCatChange = (cat: string) => {
    onConditionsChange({ ...conditions, catalyst: cat });
  };

  const handleSolventChange = (solv: string) => {
    onConditionsChange({ ...conditions, solvent: solv });
  };

  const handleConcChange = (conc: number) => {
    onConditionsChange({ ...conditions, concentration: `${conc} M` });
  };

  const applyPreset = (temp: number, press: number, cat: string, solv: string, conc: number) => {
    onConditionsChange({
      temperature_c: temp,
      pressure_atm: press,
      catalyst: cat,
      solvent: solv,
      concentration: `${conc} M`,
    });
  };

  const tempRatio = Math.min(1.0, Math.max(0.0, (currentTemp - 25) / 475));
  const tempHue = Math.round(195 - tempRatio * 185);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white text-sm shadow-md">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Reaction Parameters & Kinetics Engine</span>
                {(isLoadingKinetics || loadingAi) && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </h3>
              {isInterrupted && (
                <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-700/60 shadow-sm flex items-center gap-1">
                  <span>⚠️ Interrupted / Modified</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Arrhenius Rate: k = A·exp(-Ea/RT) • Catalyst Barrier Reduction & Pressure Shifts
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => applyPreset(25, 1.0, 'none', 'aqueous', 1.0)}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-[10px] font-mono transition cursor-pointer"
          >
            25°C Standard
          </button>
          <button
            onClick={() => applyPreset(450, 30.0, 'platinum', 'aqueous', 2.0)}
            className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 hover:text-white rounded-lg border border-amber-700/60 text-[10px] font-mono transition cursor-pointer"
          >
            🔥 High-Temp Industrial
          </button>
          <button
            onClick={() => applyPreset(50, 1.0, 'none', 'acetone', 2.5)}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 hover:text-white rounded-lg border border-cyan-700/60 text-[10px] font-mono transition cursor-pointer"
          >
            🧪 Polar Aprotic
          </button>
        </div>
      </div>

      {/* Sliders & Dropdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Temperature Control */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>🌡️</span>
              <span>Temperature</span>
            </span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded shadow-sm"
              style={{
                backgroundColor: `hsl(${tempHue}, 85%, 15%)`,
                color: `hsl(${tempHue}, 90%, 65%)`,
                borderColor: `hsl(${tempHue}, 80%, 35%)`,
                borderWidth: '1px',
              }}
            >
              {currentTemp}°C ({(currentTemp + 273.15).toFixed(1)} K)
            </span>
          </div>
          <input
            type="range"
            min="25"
            max="500"
            step="5"
            value={currentTemp}
            onChange={(e) => handleTempChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>25°C (Ambient)</span>
            <span>250°C</span>
            <span>500°C (Pyrolysis)</span>
          </div>
        </div>

        {/* 2. Pressure Control */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>💨</span>
              <span>Pressure</span>
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              {currentPress} atm
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={currentPress}
            onChange={(e) => handlePressChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>1 atm (1 bar)</span>
            <span>50 atm</span>
            <span>100 atm (High)</span>
          </div>
        </div>

        {/* 3. Reactant Concentration Control */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>💧</span>
              <span>Concentration</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              {currentConc.toFixed(1)} M
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={currentConc}
            onChange={(e) => handleConcChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0.1 M (Dilute)</span>
            <span>1.0 M (Standard)</span>
            <span>5.0 M (Concentrated)</span>
          </div>
        </div>

        {/* 4. Catalyst Dropdown */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Catalyst Selection</span>
          </label>
          <select
            value={currentCat}
            onChange={(e) => handleCatChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-sans cursor-pointer"
          >
            {CATALYST_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Solvent Environment Dropdown */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span>🧪</span>
            <span>Solvent Medium</span>
          </label>
          <select
            value={currentSolvent}
            onChange={(e) => handleSolventChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-sans cursor-pointer"
          >
            {SOLVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Live Kinetics Metrics Summary */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Relative Rate:</span>
            <span className="font-mono font-extrabold text-amber-300 text-sm">
              {kineticsResult?.relative_rate_multiplier ?? 1.0}×
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-400 font-mono">Effective Ea:</span>
            <span className="font-mono font-bold text-cyan-300">
              {kineticsResult?.effective_activation_energy_kj ?? 70} kJ/mol
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-400 font-mono">3D Velocity Factor:</span>
            <span className="font-mono font-bold text-emerald-400">
              {kineticsResult?.simulation_speed_factor ?? 1.0}× playback
            </span>
          </div>
        </div>
      </div>

      {/* Educational Kinetics Banner */}
      {kineticsResult && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 flex flex-col gap-1 font-mono shadow-inner">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <span>📖</span>
            <span>Physical Chemistry Kinetics & Barrier Assessment:</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {kineticsResult.rate_impact}
          </p>
          {kineticsResult.le_chatelier_shift && (
            <p className="text-[11px] text-amber-300/90 leading-relaxed mt-0.5">
              ⚖️ {kineticsResult.le_chatelier_shift}
            </p>
          )}
        </div>
      )}

      {/* Dynamic ChemAI Reaction & Interruption Explanation Card */}
      <div className="bg-slate-950/90 border border-cyan-800/70 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <h3 className="text-xs font-bold text-cyan-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <span>✨ AI Reaction & Condition Analysis</span>
              <span className="text-[10px] text-cyan-400 font-normal normal-case bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/70">
                ChemAI Qwen
              </span>
            </h3>
          </div>
          {loadingAi && (
            <span className="text-[11px] font-mono text-slate-400 animate-pulse">
              Analyzing mechanism & conditions...
            </span>
          )}
        </div>

        {loadingAi ? (
          <div className="py-4 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>AI is analyzing chemical reaction mechanism and condition modifications...</span>
          </div>
        ) : (
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-mono">
            {aiExplanation}
          </div>
        )}
      </div>
    </div>
  );
};
