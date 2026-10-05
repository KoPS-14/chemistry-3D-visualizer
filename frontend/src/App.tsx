import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import type { NavTab } from './components/Navbar';
import { ChemAIDashboard } from './components/ChemAIDashboard';
import { MoleculeViewer } from './components/MoleculeViewer';
import { MoleculeInfoPanel } from './components/MoleculeInfoPanel';
import { PromptInput } from './components/PromptInput';
import { Controls } from './components/Controls';
import { PeriodicTable } from './components/PeriodicTable';
import { ElementPanel } from './components/ElementPanel';
import { ElementAtomViewer } from './components/ElementAtomViewer';
import { ElementSearch } from './components/ElementSearch';
import { ReactionAnimationViewer } from './components/ReactionAnimationViewer';
import { ReactionTimelineControls } from './components/ReactionTimelineControls';
import { ReactionConditionsControl } from './components/ReactionConditionsControl';
import { ChemistryChatbotView } from './components/ChemistryChatbotView';
import { ContextualAI } from './components/ContextualAI';
import { calculateAnimationFrameState } from './three/animateReaction';
import {
  visualizeChemistry,
  fetchAllElements,
  checkHealth,
  evaluateKinetics,
  fetchElementExplanation,
  fetchReactionExplanation,
} from './services/api';
import type {
  MoleculeData,
  ReactionData,
  VisualizeResponse,
  ElementData,
  ReactionConditions,
  KineticsEvaluationResult,
} from './types/reaction';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Periodic Table Elements state
  const [elementsList, setElementsList] = useState<ElementData[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);
  const [elementExplanation, setElementExplanation] = useState<string | null>(null);
  const [isLoadingElementExp, setIsLoadingElementExp] = useState<boolean>(false);

  // Molecule & Reaction state
  const [molecule, setMolecule] = useState<MoleculeData | null>(null);
  const [reaction, setReaction] = useState<ReactionData | null>(null);
  const [reactionExplanation, setReactionExplanation] = useState<string | null>(null);
  const [isLoadingReactionExp, setIsLoadingReactionExp] = useState<boolean>(false);

  // Reaction Conditions & Kinetics state
  const [reactionConditions, setReactionConditions] = useState<ReactionConditions>({
    temperature_c: 25,
    pressure_atm: 1.0,
    catalyst: 'none',
    solvent: 'aqueous',
    concentration: '1.0 M',
  });
  const [kineticsResult, setKineticsResult] = useState<KineticsEvaluationResult | null>(null);
  const [isLoadingKinetics, setIsLoadingKinetics] = useState<boolean>(false);

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
  const [pendingChatQuestion, setPendingChatQuestion] = useState<string | null>(null);

  // Initial load: fetch elements and check health
  useEffect(() => {
    checkHealth().then((isOk) => {
      setBackendConnected(isOk);
    });

    fetchAllElements().then((list) => {
      setElementsList(list);
      if (list.length > 0) {
        handleSelectElement(list[0]);
      }
    });
  }, []);

  // Update AI explanation when selected element changes
  const handleSelectElement = async (el: ElementData) => {
    setSelectedElement(el);
    setIsLoadingElementExp(true);
    setElementExplanation(null);
    const exp = await fetchElementExplanation(el);
    setElementExplanation(exp);
    setIsLoadingElementExp(false);
  };

  // Update kinetics and reaction explanation when reaction or conditions change
  useEffect(() => {
    if (!reaction) return;

    let isMounted = true;
    setIsLoadingKinetics(true);
    setIsLoadingReactionExp(true);

    evaluateKinetics(reaction.reaction_type, reactionConditions).then((res) => {
      if (!isMounted) return;
      setKineticsResult(res);
      setIsLoadingKinetics(false);
      if (res && res.simulation_speed_factor) {
        setAnimSpeed(res.simulation_speed_factor);
      }

      fetchReactionExplanation(
        reaction.name,
        reaction.reaction_type,
        reaction.balanced_equation,
        reactionConditions,
        res,
        false
      ).then((exp) => {
        if (isMounted) {
          setReactionExplanation(exp);
          setIsLoadingReactionExp(false);
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [reaction, reactionConditions]);

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
          setActiveTab('molecules');
        } else if (res.request_type === 'reaction') {
          const rxnData = res.data as ReactionData;
          setReaction(rxnData);
          setIsPlayingAnim(true);
          setActiveTab('reactions');

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

  const handleNavigateAndVisualize = (targetTab: NavTab, promptOrSearch: string) => {
    if (targetTab === 'elements') {
      setActiveTab('elements');
      const zNum = parseInt(promptOrSearch, 10);
      if (!isNaN(zNum)) {
        const found = elementsList.find((e) => e.atomic_number === zNum);
        if (found) handleSelectElement(found);
      } else {
        const found = elementsList.find(
          (e) =>
            e.symbol.toLowerCase() === promptOrSearch.toLowerCase() ||
            e.name.toLowerCase() === promptOrSearch.toLowerCase()
        );
        if (found) handleSelectElement(found);
      }
    } else {
      setActiveTab(targetTab);
      handlePromptSubmit(promptOrSearch);
    }
  };

  // Compute current animation state parameters for UI
  const animFrameState = reaction
    ? calculateAnimationFrameState(reaction, animProgress)
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting blobs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none animate-ambient-glow z-0" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none animate-ambient-glow z-0" />

      {/* Reusable Navbar with 5 Tabs */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backendConnected={backendConnected}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 relative z-10">
        {/* ========================================================= */}
        {/* TAB 1: ChemAI DASHBOARD                                   */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <ChemAIDashboard
            onTabChange={setActiveTab}
            onQuickRender={(tab, prompt) => handleNavigateAndVisualize(tab, prompt)}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 2: 3D PERIODIC TABLE EXPLORER                         */}
        {/* ========================================================= */}
        {activeTab === 'elements' && (
          <>
            {/* Top Toolbar: Search Box & Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  3D Atomic Explorer: 118-Element Periodic Table
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Select any element to render its 3D atomic orbital model and inspect detailed properties.</p>
              </div>

              <ElementSearch elements={elementsList} onSelectElement={handleSelectElement} />
            </div>

            {/* 3D Atom Canvas Focus */}
            <section className="relative h-[440px] md:h-[500px] w-full">
              <ElementAtomViewer element={selectedElement} />
            </section>

            {/* Element Technical Information & Contextual AI Panel */}
            <section>
              <ElementPanel
                element={selectedElement}
                aiExplanation={elementExplanation}
                isLoadingAI={isLoadingElementExp}
                onSelectFollowUp={(q) => {
                  setPendingChatQuestion(q);
                  setActiveTab('chat');
                }}
              />
            </section>

            {/* Full 118-Element Interactive Periodic Grid */}
            <section>
              <PeriodicTable
                elements={elementsList}
                selectedElement={selectedElement}
                onSelectElement={handleSelectElement}
              />
            </section>
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MOLECULES STUDIO                                   */}
        {/* ========================================================= */}
        {activeTab === 'molecules' && (
          <>
            <section>
              <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
            </section>

            {explanation && (
              <div className="bg-cyan-950/40 border border-cyan-800/70 rounded-2xl p-4 text-xs text-cyan-200 shadow-xl backdrop-blur-md font-mono">
                <span className="font-bold text-cyan-300">ℹ️ RDKit Geometry Note:</span> {explanation}
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-200 shadow-xl backdrop-blur-md flex items-center gap-2.5 font-mono">
                <span className="text-lg">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 flex flex-col gap-6">
                <section className="relative h-[480px] md:h-[540px] w-full">
                  <MoleculeViewer molecule={molecule} wireframe={wireframe} />
                </section>

                <section>
                  <MoleculeInfoPanel molecule={molecule} />
                </section>

                {molecule && (
                  <section>
                    <ContextualAI
                      title={`AI Chemistry Analysis: ${molecule.name}`}
                      explanation={`**${molecule.name}** (SMILES: \`${molecule.smiles}\`) is rendered in 3D using RDKit force field spatial coordinates. Explicit hydrogens have been embedded to visualize hybridization geometry and bond angles accurately.`}
                      followUpQuestions={[
                        `What are the chemical properties and dipole moment of ${molecule.name}?`,
                        `Explain the synthesis route for ${molecule.name}.`,
                      ]}
                      onSelectFollowUp={(q) => {
                        setPendingChatQuestion(q);
                        setActiveTab('chat');
                      }}
                    />
                  </section>
                )}
              </div>

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

        {/* ========================================================= */}
        {/* TAB 4: REACTIONS SIMULATION STUDIO                        */}
        {/* ========================================================= */}
        {activeTab === 'reactions' && (
          <>
            <section>
              <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
            </section>

            {reaction && (
              <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-800/60 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">⚗️ Reaction Equation:</span>
                  <span className="text-slate-100 font-bold bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                    {reaction.balanced_equation || reaction.name}
                  </span>
                </div>
                <span className="text-[10px] text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-700/60">
                  {reaction.reaction_type}
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-200 shadow-xl backdrop-blur-md flex items-center gap-2.5 font-mono">
                <span className="text-lg">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 flex flex-col gap-6">
                {reaction && (
                  <section className="relative h-[480px] md:h-[540px] w-full">
                    <ReactionAnimationViewer
                      reaction={reaction}
                      progress={animProgress}
                      wireframe={wireframe}
                    />
                  </section>
                )}

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

                {reaction && (
                  <section>
                    <ReactionConditionsControl
                      reaction={reaction}
                      conditions={reactionConditions}
                      kineticsResult={kineticsResult}
                      isLoadingKinetics={isLoadingKinetics}
                      onConditionsChange={(newConds) => setReactionConditions(newConds)}
                    />
                  </section>
                )}

                {reaction && (
                  <section>
                    <ContextualAI
                      title={`AI Reaction Stage Analysis: ${reaction.name}`}
                      explanation={reactionExplanation}
                      isLoading={isLoadingReactionExp}
                      followUpQuestions={[
                        `How does changing catalyst to acid/base alter the transition state of ${reaction.name}?`,
                        `Explain the stereochemistry inversion at step 2.`,
                      ]}
                      onSelectFollowUp={(q) => {
                        setPendingChatQuestion(q);
                        setActiveTab('chat');
                      }}
                    />
                  </section>
                )}
              </div>

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

        {/* ========================================================= */}
        {/* TAB 5: AI ASSISTANT CHAT                                  */}
        {/* ========================================================= */}
        {activeTab === 'chat' && (
          <section className="w-full">
            <ChemistryChatbotView
              onNavigateAndVisualize={handleNavigateAndVisualize}
              initialPrompt={pendingChatQuestion}
              onPromptHandled={() => setPendingChatQuestion(null)}
            />
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
