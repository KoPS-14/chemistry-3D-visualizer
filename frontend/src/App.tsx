import React, { useState, useEffect, useRef } from 'react';
import { MoleculeViewer } from './components/MoleculeViewer';
import { PromptInput } from './components/PromptInput';
import { Controls } from './components/Controls';
import { PeriodicTable } from './components/PeriodicTable';
import { ElementInfoPanel } from './components/ElementInfoPanel';
import { ElementAtomViewer } from './components/ElementAtomViewer';
import { ElementSearch } from './components/ElementSearch';
import { ReactionAnimationViewer } from './components/ReactionAnimationViewer';
import { ReactionTimelineControls } from './components/ReactionTimelineControls';
import { calculateAnimationFrameState } from './three/animateReaction';
import { visualizeChemistry, fetchAllElements, checkHealth } from './services/api';
import type { MoleculeData, ReactionData, ReactantProduct3DData, VisualizeResponse, ElementData } from './types/reaction';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'elements' | 'molecules'>('elements');

  // Periodic Table Elements state
  const [elementsList, setElementsList] = useState<ElementData[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);

  // Molecule & Reaction state
  const [molecule, setMolecule] = useState<MoleculeData | null>(null);
  const [reaction, setReaction] = useState<ReactionData | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ReactantProduct3DData | null>(null);

  // Reaction Animation Playback state
  const [isPlayingAnim, setIsPlayingAnim] = useState<boolean>(false);
  const [animProgress, setAnimProgress] = useState<number>(0.0);
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Initial load: fetch elements and check health
  useEffect(() => {
    checkHealth().then((isOk) => {
      setBackendConnected(isOk);
    });

    fetchAllElements().then((list) => {
      setElementsList(list);
      if (list.length > 0) {
        setSelectedElement(list[0]);
      }
    });
  }, []);

  // Animation frame playback loop
  useEffect(() => {
    if (!isPlayingAnim) {
      lastTimeRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (time - lastTimeRef.current) / 1000;
        setAnimProgress((prev) => {
          const next = prev + delta * 0.15 * animSpeed;
          if (next >= 1.0) {
            setIsPlayingAnim(false);
            return 1.0;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlayingAnim, animSpeed]);

  const handlePromptSubmit = async (promptText: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setExplanation(null);
    setIsPlayingAnim(false);
    setAnimProgress(0.0);

    try {
      const res: VisualizeResponse = await visualizeChemistry(promptText);

      if (res.status === 'success' && res.data) {
        setBackendConnected(true);
        setExplanation(res.explanation || null);

        if (res.request_type === 'molecule') {
          setReaction(null);
          setSelectedComponent(null);
          setMolecule(res.data as MoleculeData);
        } else if (res.request_type === 'reaction') {
          const rxnData = res.data as ReactionData;
          setReaction(rxnData);
          setIsPlayingAnim(true);

          if (rxnData.reactants && rxnData.reactants.length > 0) {
            setSelectedComponent(rxnData.reactants[0]);
            setMolecule(rxnData.reactants[0].molecule_data);
          } else {
            setSelectedComponent(null);
            setMolecule(null);
          }
        }
      } else if (res.status === 'unsupported') {
        setMolecule(null);
        setReaction(null);
        setSelectedComponent(null);
        setErrorMsg(res.message || 'This reaction/molecule is not currently supported or could not be chemically validated.');
      } else {
        setMolecule(null);
        setReaction(null);
        setSelectedComponent(null);
        setErrorMsg(res.message || 'An error occurred during visualization.');
      }
    } catch (err: any) {
      setMolecule(null);
      setReaction(null);
      setSelectedComponent(null);
      setErrorMsg(err.message || 'Failed to connect to backend service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectComponent = (comp: ReactantProduct3DData) => {
    setSelectedComponent(comp);
    setMolecule(comp.molecule_data);
  };

  // Compute current animation state parameters for UI
  const animFrameState = reaction
    ? calculateAnimationFrameState(reaction, animProgress)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.144.174l-.946.542a2 2 0 00-.77 2.65l.77 1.332a2 2 0 002.65.77l.946-.542a2 2 0 011.144-.174l2.387.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.022-.547l.946-.542a2 2 0 00.77-2.65l-.77-1.332a2 2 0 00-2.65.77l-.946.542z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              ChemAI 3D
            </h1>
            <p className="text-xs text-slate-400">3D Periodic Table & Procedural Reaction Visualizer</p>
          </div>
        </div>

        {/* Navigation Mode Switcher (Periodic Table vs Molecules/Reactions) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('elements')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'elements'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            3D Periodic Table (118)
          </button>
          <button
            onClick={() => {
              setActiveTab('molecules');
              if (!molecule && !reaction) {
                handlePromptSubmit('Show SN2 reaction of methyl bromide with hydroxide');
              }
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'molecules'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Molecules & Reactions
          </button>
        </div>

        {/* Backend Connection Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${backendConnected === true ? 'bg-emerald-400 animate-pulse' : backendConnected === false ? 'bg-rose-500' : 'bg-amber-400'}`} />
          <span className="text-xs font-medium text-slate-400">
            {backendConnected === true ? 'FastAPI Connected' : backendConnected === false ? 'Backend Offline' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* ========================================================= */}
        {/* MODE 1: 3D PERIODIC TABLE VISUALIZER FEATURE               */}
        {/* ========================================================= */}
        {activeTab === 'elements' && (
          <>
            {/* Top Toolbar: Search Box & Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  Interactive 118-Element Periodic Table
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Click any element below to inspect its 3D educational atomic orbital model.</p>
              </div>

              <ElementSearch elements={elementsList} onSelectElement={setSelectedElement} />
            </div>

            {/* 3D Atom Canvas Focus */}
            <section className="relative h-[440px] md:h-[500px] w-full">
              <ElementAtomViewer element={selectedElement} />
            </section>

            {/* Element Information Card */}
            <section>
              <ElementInfoPanel element={selectedElement} />
            </section>

            {/* Full 118-Element Interactive Periodic Grid */}
            <section>
              <PeriodicTable
                elements={elementsList}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
              />
            </section>
          </>
        )}

        {/* ========================================================= */}
        {/* MODE 2: MOLECULE & REACTION VISUALIZER                    */}
        {/* ========================================================= */}
        {activeTab === 'molecules' && (
          <>
            {/* Prompt Input Section */}
            <section>
              <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
            </section>

            {/* Error / Warning Alert Banner */}
            {errorMsg && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-200 px-4 py-3 rounded-xl text-sm flex items-start gap-3 shadow-lg">
                <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-rose-300">Chemistry Request Rejected</p>
                  <p className="mt-0.5 text-rose-200/90">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* 3D Canvas Main Focus: Reaction Animation OR Single Molecule Viewer */}
            <section className="relative h-[480px] md:h-[560px] w-full flex flex-col">
              <div className="absolute top-3 left-3 z-10">
                <Controls
                  wireframe={wireframe}
                  onToggleWireframe={() => setWireframe(!wireframe)}
                  onResetView={() => {}}
                />
              </div>

              <div className="w-full h-full flex-1">
                {reaction ? (
                  <ReactionAnimationViewer reaction={reaction} progress={animProgress} wireframe={wireframe} />
                ) : (
                  <MoleculeViewer molecule={molecule} wireframe={wireframe} />
                )}
              </div>
            </section>

            {/* Reaction Timeline Controls */}
            {reaction && animFrameState && (
              <section>
                <ReactionTimelineControls
                  isPlaying={isPlayingAnim}
                  progress={animProgress}
                  speed={animSpeed}
                  currentStageName={animFrameState.currentStageName}
                  stageDescription={animFrameState.stageDescription}
                  stages={reaction.stages || reaction.animation_template?.stages || []}
                  currentStageIndex={animFrameState.currentStageIndex}
                  onTogglePlay={() => setIsPlayingAnim(!isPlayingAnim)}
                  onReset={() => {
                    setIsPlayingAnim(false);
                    setAnimProgress(0.0);
                  }}
                  onProgressChange={(newProgress) => {
                    setIsPlayingAnim(false);
                    setAnimProgress(newProgress);
                  }}
                  onSpeedChange={(newSpeed) => setAnimSpeed(newSpeed)}
                />
              </section>
            )}

            {/* Reaction Details Section */}
            {reaction && (
              <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <h2 className="text-base font-bold text-slate-200">{reaction.name}</h2>
                    </div>
                    {reaction.balanced_equation && (
                      <p className="text-sm font-mono text-amber-300 mt-1">{reaction.balanced_equation}</p>
                    )}
                  </div>
                  <span className="text-xs bg-amber-950/80 text-amber-300 font-mono px-3 py-1 rounded-md border border-amber-800/80">
                    Reaction Class: {reaction.reaction_type}
                  </span>
                </div>

                {/* Reactants and Products Component Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reactants */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Reactants (Click to inspect 3D)</span>
                    <div className="flex flex-wrap gap-2">
                      {reaction.reactants.map((r, i) => (
                        <button
                          key={`reactant-${i}`}
                          onClick={() => handleSelectComponent(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                            selectedComponent?.name === r.name
                              ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <span className="font-mono text-cyan-300">[{r.smiles}]</span>
                          <span>{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Products */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Products (Click to inspect 3D)</span>
                    <div className="flex flex-wrap gap-2">
                      {reaction.products.map((p, i) => (
                        <button
                          key={`product-${i}`}
                          onClick={() => handleSelectComponent(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                            selectedComponent?.name === p.name
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <span className="font-mono text-emerald-300">[{p.smiles}]</span>
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Single Molecule Information Panel */}
            {molecule && (
              <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <h2 className="text-base font-bold text-slate-200">
                      {selectedComponent ? `3D Component: ${molecule.name}` : 'Molecule Information'}
                    </h2>
                  </div>
                  <span className="text-xs bg-slate-800 text-cyan-300 font-mono px-2.5 py-1 rounded-md border border-slate-700">
                    Validated RDKit 3D Structure
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs text-slate-500 block uppercase font-medium">Name</span>
                    <span className="text-sm font-semibold text-slate-100 mt-0.5 block truncate">{molecule.name}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs text-slate-500 block uppercase font-medium">Formula</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono mt-0.5 block">{molecule.formula}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs text-slate-500 block uppercase font-medium">Mol Weight</span>
                    <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{molecule.molecular_weight} g/mol</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs text-slate-500 block uppercase font-medium">SMILES</span>
                    <span className="text-sm font-mono text-slate-300 mt-0.5 block truncate" title={molecule.smiles}>{molecule.smiles}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs text-slate-500 block uppercase font-medium">Atoms Count</span>
                    <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{molecule.atoms?.length || 0}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs text-slate-500 block uppercase font-medium">Bonds Count</span>
                    <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{molecule.bonds?.length || 0}</span>
                  </div>
                </div>

                {explanation && (
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-300">AI Explanation: </span>
                    {explanation}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        AI-Powered Chemistry Visualization System • 118-Element 3D Periodic Table & Procedural Reaction Animation Engine
      </footer>
    </div>
  );
};

export default App;
