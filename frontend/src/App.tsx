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
import { ChemistryTutorChat } from './components/ChemistryTutorChat';
import { calculateAnimationFrameState } from './three/animateReaction';
import { visualizeChemistry, fetchAllElements, checkHealth } from './services/api';
import type { MoleculeData, ReactionData, VisualizeResponse, ElementData } from './types/reaction';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'elements' | 'molecules'>('elements');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Periodic Table Elements state
  const [elementsList, setElementsList] = useState<ElementData[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);

  // Molecule & Reaction state
  const [molecule, setMolecule] = useState<MoleculeData | null>(null);
  const [reaction, setReaction] = useState<ReactionData | null>(null);

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
          const next = prev + delta * 0.035 * animSpeed;
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
          setMolecule(res.data as MoleculeData);
        } else if (res.request_type === 'reaction') {
          const rxnData = res.data as ReactionData;
          setReaction(rxnData);
          setIsPlayingAnim(true);

          if (rxnData.reactants && rxnData.reactants.length > 0) {
            setMolecule(rxnData.reactants[0].molecule_data);
          } else {
            setMolecule(null);
          }
        }
      } else if (res.status === 'unsupported') {
        setMolecule(null);
        setReaction(null);
        setErrorMsg(res.message || 'This reaction/molecule is not currently supported or could not be chemically validated.');
      } else {
        setMolecule(null);
        setReaction(null);
        setErrorMsg(res.message || 'An error occurred during visualization.');
      }
    } catch (err: any) {
      setMolecule(null);
      setReaction(null);
      setErrorMsg(err.message || 'Failed to connect to backend service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTutorVisualize = (promptText: string) => {
    setActiveTab('molecules');
    handlePromptSubmit(promptText);
  };

  // Compute current animation state parameters for UI
  const animFrameState = reaction
    ? calculateAnimationFrameState(reaction, animProgress)
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">
      {/* AI Chemistry Tutor Drawer Component */}
      <ChemistryTutorChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onVisualizePrompt={handleTutorVisualize}
      />

      {/* Futuristic Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.144.174l-.946.542a2 2 0 00-.77 2.65l.77 1.332a2 2 0 002.65.77l.946-.542a2 2 0 011.144-.174l2.387.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.022-.547l.946-.542a2 2 0 00.77-2.65l-.77-1.332a2 2 0 00-2.65.77l-.946.542z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-white via-cyan-200 to-teal-400 bg-clip-text text-transparent tracking-tight">
              ChemAI 3D
            </h1>
            <p className="text-[11px] text-cyan-400 font-mono tracking-wide">3D Periodic Table & Reaction Engine</p>
          </div>
        </div>

        {/* Navigation Mode Switcher & AI Tutor Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800/90 shadow-inner">
            <button
              onClick={() => setActiveTab('elements')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'elements'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-600/40 border border-cyan-400/40'
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
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'molecules'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-600/40 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Molecules & Reactions
            </button>
          </div>

          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 hover:text-white transition-all cursor-pointer shadow-xl shadow-cyan-950/60"
          >
            <span className="text-sm">🤖</span>
            <span>AI Tutor</span>
          </button>
        </div>

        {/* Backend Connection Status Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className={`w-2.5 h-2.5 rounded-full ${backendConnected === true ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400' : backendConnected === false ? 'bg-rose-500' : 'bg-amber-400'}`} />
          <span className="text-xs font-mono text-slate-300">
            {backendConnected === true ? 'FastAPI & Gemini Live' : backendConnected === false ? 'Backend Offline' : 'Connecting...'}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  Interactive 118-Element Periodic Table
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Click any element below to inspect its 3D educational atomic orbital model.</p>
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
            {/* Top Prompt Section */}
            <section>
              <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
            </section>

            {/* Notifications / Explanations / Error Messages */}
            {explanation && (
              <div className="bg-cyan-950/40 border border-cyan-800/70 rounded-2xl p-4 text-xs text-cyan-200 shadow-xl backdrop-blur-md font-mono">
                <span className="font-bold text-cyan-300">ℹ️ Chemistry Engine Note:</span> {explanation}
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-200 shadow-xl backdrop-blur-md flex items-center gap-2.5 font-mono">
                <span className="text-lg">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 3D Canvas Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 flex flex-col gap-4">
                <section className="relative h-[480px] md:h-[540px] w-full">
                  {reaction ? (
                    <ReactionAnimationViewer
                      reaction={reaction}
                      progress={animProgress}
                      wireframe={wireframe}
                    />
                  ) : (
                    <MoleculeViewer molecule={molecule} wireframe={wireframe} />
                  )}
                </section>

                {/* Reaction Timeline Playback Controls */}
                {reaction && (
                  <section>
                    <ReactionTimelineControls
                      isPlaying={isPlayingAnim}
                      progress={animProgress}
                      speed={animSpeed}
                      currentStageName={animFrameState?.currentStageName || 'Reaction Stage'}
                      stageDescription={animFrameState?.stageDescription || ''}
                      stages={reaction.stages || ['Reactants', 'Transition State', 'Products']}
                      currentStageIndex={animFrameState?.currentStageIndex || 0}
                      onTogglePlay={() => setIsPlayingAnim((prev) => !prev)}
                      onReset={() => {
                        setIsPlayingAnim(false);
                        setAnimProgress(0.0);
                      }}
                      onProgressChange={(val: number) => setAnimProgress(val)}
                      onSpeedChange={(s: number) => setAnimSpeed(s)}
                    />
                  </section>
                )}
              </div>

              {/* Sidebar Control Panel */}
              <div className="lg:col-span-1">
                <Controls
                  wireframe={wireframe}
                  onToggleWireframe={() => setWireframe((prev) => !prev)}
                  onResetView={() => {
                    setAnimProgress(0.0);
                    setIsPlayingAnim(false);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
