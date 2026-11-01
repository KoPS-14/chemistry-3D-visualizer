import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  FlaskConical,
  Flame,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { executeCustomReaction } from '../services/api';
import type {
  CustomReactionResponse,
  ReactionConditions,
  ReactionData,
  ReactantProduct3DData,
} from '../types/reaction';
import { ReactionAnimationViewer } from './ReactionAnimationViewer';
import { ReactionTimelineControls } from './ReactionTimelineControls';
import { calculateAnimationFrameState } from '../three/animateReaction';

export const CustomReactionLab: React.FC = () => {
  const [reactants, setReactants] = useState<string[]>(['acetic acid', 'ethanol']);
  const [conditions, setConditions] = useState<ReactionConditions>({
    temperature_c: 60,
    pressure_atm: 1.0,
    catalyst: 'none',
    solvent: 'aqueous',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CustomReactionResponse | null>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);

  // Animation Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0.0);
  const [speed, setSpeed] = useState<number>(1.0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Add/Remove Reactant Inputs
  const handleAddReactant = () => {
    if (reactants.length < 4) {
      setReactants([...reactants, '']);
    }
  };

  const handleRemoveReactant = (index: number) => {
    if (reactants.length > 2) {
      setReactants(reactants.filter((_, i) => i !== index));
    }
  };

  const handleReactantChange = (index: number, val: string) => {
    const updated = [...reactants];
    updated[index] = val;
    setReactants(updated);
  };

  // Convert CustomReactionResponse into standard ReactionData for ReactionAnimationViewer
  const reactionData: ReactionData | null = useMemo(() => {
    if (!result || result.status !== 'success' || !result.matched_rule) return null;

    const reactants3D: ReactantProduct3DData[] = (result.reactant_state?.molecules || []).map(
      (m, idx) => ({
        name: result.reactants_resolved?.[idx]?.name || m.name,
        smiles: result.reactants_resolved?.[idx]?.smiles || m.smiles,
        role: 'reactant',
        molecule_data: m,
      })
    );

    const products3D: ReactantProduct3DData[] = (result.product_state?.molecules || []).map(
      (m, idx) => ({
        name: result.products?.[idx]?.name || m.name,
        smiles: result.products?.[idx]?.smiles || m.smiles,
        role: 'product',
        molecule_data: m,
      })
    );

    const reactantNames = (result.reactants_resolved || []).map((r) => r.name).join(' + ');
    const productNames = (result.products || []).map((p) => p.name).join(' + ');
    const equation = `${reactantNames} ➔ ${productNames}`;

    return {
      name: result.matched_rule.name,
      reaction_type: result.matched_rule.id,
      description: result.matched_rule.description,
      balanced_equation: equation,
      reactants: reactants3D,
      products: products3D,
      conditions,
      stages: result.narration || [
        '1. Initial Reactant Alignment',
        '2. Reactant Approach & Collision',
        '3. Pure Activated Transition State',
        '4. Product Formation & Separation',
      ],
    };
  }, [result, conditions]);

  // Compute active animation frame stage state for timeline controls
  const animFrameState = useMemo(() => {
    if (!reactionData) return null;
    return calculateAnimationFrameState(reactionData, progress);
  }, [reactionData, progress]);

  // Run Custom Reaction
  const handleRunReaction = async (overrideRuleId?: string) => {
    setIsLoading(true);
    setProgress(0.0);
    setIsPlaying(false);
    try {
      const res = await executeCustomReaction({
        reactants: reactants.filter((r) => r.trim().length > 0),
        conditions,
        selected_rule_id: overrideRuleId,
      });
      setResult(res);
      if (res.status === 'success') {
        setIsPlaying(true);
      }
    } catch {
      setResult({
        status: 'lookup_failure',
        message: 'Network error executing reaction.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Smooth animation playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const updateFrame = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (currentTime - lastTimeRef.current) / 1000;
        const duration = 6.0 / speed;
        setProgress((prev) => {
          const next = prev + delta / duration;
          if (next >= 1.0) {
            setIsPlaying(false);
            return 1.0;
          }
          return next;
        });
      }
      lastTimeRef.current = currentTime;
      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed]);

  // Quick Preset Handlers
  const handleLoadPreset = (rList: string[], temp: number = 25, cat: string = 'none') => {
    setReactants(rList);
    setConditions({
      temperature_c: temp,
      catalyst: cat,
      pressure_atm: 1.0,
      solvent: 'aqueous',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Custom Reaction Lab
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
                  RDKit Rule Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Input any 2+ molecules (chemical names or SMILES). The system tests validated reaction SMARTS rules with atom mapping.
              </p>
            </div>
          </div>
        </div>

        {/* Visible Disclaimer Notice (Requirement 9) */}
        <div className="max-w-md bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 flex items-start gap-2.5 shadow-inner">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-tight">
            <strong>Notice:</strong> Illustrative animation based on a supported reaction rule, not a molecular dynamics simulation.
          </p>
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400" /> Presets:
        </span>
        <button
          onClick={() => handleLoadPreset(['bromomethane', 'hydroxide'], 25)}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
        >
          SN2 (Methyl Bromide + OH⁻)
        </button>
        <button
          onClick={() => handleLoadPreset(['acetic acid', 'ethanol'], 60, 'sulfuric acid')}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
        >
          Esterification (Acetic + Ethanol)
        </button>
        <button
          onClick={() => handleLoadPreset(['hydrochloric acid', 'sodium hydroxide'], 25)}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
        >
          Neutralization (HCl + NaOH)
        </button>
        <button
          onClick={() => handleLoadPreset(['acetic acid', 'ethylamine'], 50)}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
        >
          Amide (Acetic + Ethylamine)
        </button>
        <button
          onClick={() => handleLoadPreset(['ethene', 'water'], 100, 'acid')}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
        >
          Hydration (Ethene + H₂O)
        </button>
        <button
          onClick={() => handleLoadPreset(['benzene', 'methane'], 25)}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 hover:border-amber-500/60 hover:text-amber-300 transition-all font-mono text-slate-400 cursor-pointer"
        >
          No Rule (Benzene + Methane)
        </button>
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`ml-auto px-2.5 py-1 text-xs rounded-lg border font-mono transition-all cursor-pointer ${
            wireframe
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
              : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          {wireframe ? '🌐 Wireframe ON' : '🌐 Wireframe'}
        </button>
      </div>

      {/* Main Grid: Left Controls & Inputs, Right 3D View / Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Reactants Input & Conditions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Reactant Inputs Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Reactant Molecules
              </h3>
              <button
                onClick={handleAddReactant}
                disabled={reactants.length >= 4}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40 font-mono cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Reactant
              </button>
            </div>

            <div className="space-y-2.5">
              {reactants.map((reactant, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500 w-5 text-right">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={reactant}
                    onChange={(e) => handleReactantChange(idx, e.target.value)}
                    placeholder={`e.g. "bromomethane" or "CBr"`}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-all"
                  />
                  {reactants.length > 2 && (
                    <button
                      onClick={() => handleRemoveReactant(idx)}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Conditions Row */}
            <div className="border-t border-slate-800/80 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Reaction Conditions
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Temperature: <span className="text-cyan-300">{conditions.temperature_c ?? 25}°C</span>
                  </label>
                  <input
                    type="range"
                    min="-20"
                    max="200"
                    value={conditions.temperature_c ?? 25}
                    onChange={(e) =>
                      setConditions({ ...conditions, temperature_c: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Catalyst</label>
                  <select
                    value={conditions.catalyst || 'none'}
                    onChange={(e) => setConditions({ ...conditions, catalyst: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 outline-none"
                  >
                    <option value="none">None (Thermal)</option>
                    <option value="acid">Acid Catalyst (H⁺)</option>
                    <option value="base">Base Catalyst (OH⁻)</option>
                    <option value="metal">Transition Metal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleRunReaction()}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 hover:from-cyan-400 hover:to-emerald-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Evaluating Reaction SMARTS...' : 'Run Reaction Lab'}
            </button>
          </div>

          {/* Status Alert Panels (Requirement 8) */}
          {result && (
            <div className="space-y-4">
              {/* 1. Multiple Matches Alert */}
              {result.status === 'multiple_matches' && (
                <div className="bg-indigo-950/50 border border-indigo-600/60 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm font-mono">
                    <Layers className="w-5 h-5" /> Multiple Supported Rules Match
                  </div>
                  <p className="text-xs text-indigo-200">
                    Several reaction pathways are valid for these reactants. Choose which rule to execute:
                  </p>
                  <div className="space-y-2 pt-1">
                    {result.options?.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleRunReaction(opt.id)}
                        className="w-full text-left p-3 rounded-xl bg-slate-900 border border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/60 transition-all group cursor-pointer"
                      >
                        <div className="font-bold text-sm text-indigo-300 group-hover:text-white flex items-center justify-between">
                          {opt.name}
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. No Supported Rule Alert */}
              {result.status === 'no_supported_rule' && (
                <div className="bg-slate-900/90 border border-amber-600/50 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono">
                    <HelpCircle className="w-5 h-5" /> No Supported Reaction Rule Matches
                  </div>
                  <p className="text-xs text-slate-300">
                    These molecules do not match any of the 5 supported reaction templates (SN2, Esterification, Acid-Base, Amide, Alkene Hydration).
                    As per scientific verification, ChemAI does not invent unverified products. Here is the verified chemical profile:
                  </p>
                  <div className="space-y-3 pt-2">
                    {result.molecule_analysis?.map((mol, idx) => (
                      <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
                        <div className="font-bold text-cyan-400 flex items-center justify-between">
                          <span>{mol.name} ({mol.formula})</span>
                          <span className="text-slate-400 font-normal">{mol.molecular_weight} g/mol</span>
                        </div>
                        <div className="text-slate-300 text-[11px]">SMILES: <code className="text-slate-200">{mol.smiles}</code></div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                          <div>TPSA: <span className="text-slate-200">{mol.tpsa} Å²</span></div>
                          <div>LogP: <span className="text-slate-200">{mol.logp}</span></div>
                          <div>H-Donors: <span className="text-slate-200">{mol.hbd}</span></div>
                          <div>H-Acceptors: <span className="text-slate-200">{mol.hba}</span></div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Functional Groups: <span className="text-emerald-400">{mol.functional_groups.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Invalid Molecule Alert */}
              {result.status === 'invalid_molecule' && (
                <div className="bg-red-950/40 border border-red-600/60 rounded-2xl p-4 text-xs font-mono text-red-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <strong className="block text-red-300 text-sm mb-0.5">Invalid Molecular Structure</strong>
                    {result.message}
                  </div>
                </div>
              )}

              {/* 4. Lookup Failure Alert */}
              {result.status === 'lookup_failure' && (
                <div className="bg-red-950/40 border border-red-600/60 rounded-2xl p-4 text-xs font-mono text-red-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <strong className="block text-red-300 text-sm mb-0.5">Chemical Name Lookup Failed</strong>
                    {result.message}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: 3D Animation Viewer (Same as Reactions Tab) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Reaction Viewer Canvas */}
          <div className="relative h-[480px] md:h-[520px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
            {reactionData ? (
              <ReactionAnimationViewer
                reaction={reactionData}
                progress={progress}
                wireframe={wireframe}
              />
            ) : (
              <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-6 text-center">
                <FlaskConical className="w-14 h-14 text-slate-700 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-slate-400 mb-1">Custom Reaction Simulation Chamber</p>
                <p className="text-slate-500 max-w-sm">
                  Select a preset above or enter reactant names/SMILES, then click "Run Reaction Lab".
                </p>
              </div>
            )}
          </div>

          {/* Timeline Controls (Same as Reactions Tab) */}
          {reactionData && (
            <ReactionTimelineControls
              isPlaying={isPlaying}
              progress={progress}
              speed={speed}
              currentStageName={animFrameState?.currentStageName || 'Reaction Stage'}
              stageDescription={animFrameState?.stageDescription || ''}
              stages={reactionData.stages || ['Reactants', 'Transition State', 'Products']}
              currentStageIndex={animFrameState?.currentStageIndex || 0}
              onTogglePlay={() => setIsPlaying((prev) => !prev)}
              onReset={() => {
                setIsPlaying(false);
                setProgress(0.0);
              }}
              onProgressChange={(val: number) => setProgress(val)}
              onSpeedChange={(s: number) => setSpeed(s)}
            />
          )}

          {/* Formed Products & Energetics Summary Card */}
          {result?.status === 'success' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Formed Products
                </h4>
                <div className="space-y-1.5">
                  {result.products?.map((p, idx) => (
                    <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-200">
                      {p.name} — <code className="text-cyan-300">{p.smiles}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> Energetics & Kinetics
                </h4>
                {result.has_activation_energy ? (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1 text-slate-300">
                    <div>Baseline Activation Energy (Ea): <strong className="text-amber-400">{result.baseline_activation_energy_kj} kJ/mol</strong></div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Temperature ({conditions.temperature_c}°C) and catalyst ({conditions.catalyst || 'none'}) influence molecular kinetic rates without altering product stoichiometry.
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-400">
                    No stored activation energy for this reaction class. Rate graph omitted.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
