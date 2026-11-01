import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GraduationCap,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Flame,
  ChevronLeft,
  ChevronRight,
  Layers,
  Award,
  BookOpen,
} from 'lucide-react';
import { fetchQuizQuestions, fetchQuizHint, fetchTeach3D } from '../services/api';
import type {
  QuizQuestionSummary,
  Teach3DResponse,
} from '../types/reaction';
import { ReactionAnimationViewer } from './ReactionAnimationViewer';
import { ReactionTimelineControls } from './ReactionTimelineControls';
import { calculateAnimationFrameState } from '../three/animateReaction';

export const JEEQuizView: React.FC = () => {
  const [questions, setQuestions] = useState<QuizQuestionSummary[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User Answer State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);

  // Progressive Hint State
  const [currentHintStep, setCurrentHintStep] = useState<number>(0);
  const [unlockedHints, setUnlockedHints] = useState<string[]>([]);
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);

  // 3D Teaching State
  const [showTeach3D, setShowTeach3D] = useState<boolean>(false);
  const [teach3DData, setTeach3DData] = useState<Teach3DResponse | null>(null);
  const [isLoading3D, setIsLoading3D] = useState<boolean>(false);
  const [teachProgress, setTeachProgress] = useState<number>(0.0);
  const [isTeachPlaying, setIsTeachPlaying] = useState<boolean>(false);
  const [teachSpeed, setTeachSpeed] = useState<number>(1.0);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Fetch Questions
  useEffect(() => {
    setIsLoading(true);
    fetchQuizQuestions(selectedYear, selectedCategory).then((data) => {
      setQuestions(data.questions || []);
      setAvailableYears(data.available_years || []);
      setAvailableCategories(data.available_categories || []);
      setCurrentIndex(0);
      resetQuestionState();
      setIsLoading(false);
    });
  }, [selectedYear, selectedCategory]);

  const currentQuestion: QuizQuestionSummary | undefined = questions[currentIndex];

  const resetQuestionState = () => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setCurrentHintStep(0);
    setUnlockedHints([]);
    setShowTeach3D(false);
    setTeach3DData(null);
    setTeachProgress(0.0);
    setIsTeachPlaying(false);
  };

  const handleSelectOption = (optLetter: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(optLetter);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQuestion || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    setAnsweredCount((prev) => prev + 1);

    const isCorrect = selectedOption.toUpperCase() === currentQuestion.correct_option.toUpperCase();
    if (isCorrect) {
      setScore((prev) => prev + 4);
      setStreak((prev) => prev + 1);
    } else {
      setScore((prev) => Math.max(0, prev - 1));
      setStreak(0);
    }
  };

  // Step-by-Step Progressive Hint
  const handleRequestNextHint = async () => {
    if (!currentQuestion) return;
    const nextStep = currentHintStep + 1;
    if (nextStep > 3) return;

    setIsLoadingHint(true);
    const hintRes = await fetchQuizHint(currentQuestion.id, nextStep);
    if (hintRes) {
      setCurrentHintStep(hintRes.hint_step);
      setUnlockedHints((prev) => {
        if (prev.includes(hintRes.hint_text)) return prev;
        return [...prev, hintRes.hint_text];
      });
    }
    setIsLoadingHint(false);
  };

  // Teach in 3D Mode
  const handleToggleTeach3D = async () => {
    if (showTeach3D) {
      setShowTeach3D(false);
      setIsTeachPlaying(false);
      return;
    }

    if (!currentQuestion) return;
    setShowTeach3D(true);
    setTeachProgress(0.0);
    setIsTeachPlaying(true);

    if (!teach3DData || teach3DData.question_id !== currentQuestion.id) {
      setIsLoading3D(true);
      const res = await fetchTeach3D(currentQuestion.id);
      setTeach3DData(res);
      setIsLoading3D(false);
    }
  };

  // 3D Teaching Animation Loop
  useEffect(() => {
    if (!isTeachPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const updateFrame = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (currentTime - lastTimeRef.current) / 1000;
        const duration = 6.0 / teachSpeed;
        setTeachProgress((prev) => {
          const next = prev + delta / duration;
          if (next >= 1.0) {
            setIsTeachPlaying(false);
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
  }, [isTeachPlaying, teachSpeed]);

  const teachAnimFrameState = useMemo(() => {
    if (!teach3DData?.reaction_data) return null;
    return calculateAnimationFrameState(teach3DData.reaction_data, teachProgress);
  }, [teach3DData, teachProgress]);

  // Question Navigation
  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState();
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetQuestionState();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                JEE Chemistry Quiz & 3D Tutor
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 uppercase tracking-widest">
                  Past 4 Years (2022–2025)
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Solve authentic JEE Advanced questions. Get progressive hints or inspect molecular reaction mechanisms in 3D!
              </p>
            </div>
          </div>
        </div>

        {/* Score & Streak HUD */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Score:</span>
            <strong className="text-amber-300 text-sm">{score}</strong>
            <span className="text-[10px] text-slate-500">(+4 / -1)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-slate-400">Streak:</span>
            <strong className="text-orange-300 text-sm">{streak}</strong>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-slate-400 hidden sm:block">
            Answered: <strong className="text-slate-200">{answeredCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Row: Year & Category Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Year:
          </span>
          <button
            onClick={() => setSelectedYear(undefined)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              selectedYear === undefined
                ? 'bg-cyan-600 text-white font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Years
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedYear === yr
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Subject:
          </span>
          {['All', ...(availableCategories.length > 0 ? availableCategories : ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'])].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading or Empty State */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm flex flex-col items-center gap-3">
          <GraduationCap className="w-10 h-10 animate-bounce text-amber-400" />
          Loading authentic JEE Chemistry questions...
        </div>
      ) : !currentQuestion ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm">
          No questions matched the selected filters.
        </div>
      ) : (
        /* Main Question Card */
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold">
                  {currentQuestion.year} {currentQuestion.paper}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                  {currentQuestion.category}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">
                  {currentQuestion.topic}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <span>
                  Question <strong className="text-white">{currentIndex + 1}</strong> of {questions.length}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold">
                  {currentQuestion.difficulty}
                </span>
              </div>
            </div>

            {/* Question Statement */}
            <div className="space-y-3">
              <p className="text-base sm:text-lg text-slate-100 font-sans leading-relaxed whitespace-pre-line font-medium">
                {currentQuestion.question}
              </p>
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {currentQuestion.options.map((optText, idx) => {
                const optLetter = ['A', 'B', 'C', 'D'][idx];
                const isSelected = selectedOption === optLetter;
                const isCorrect = isAnswerSubmitted && optLetter === currentQuestion.correct_option;
                const isWrongSelected = isAnswerSubmitted && isSelected && !isCorrect;

                let cardStyle = 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-cyan-500/60 hover:bg-slate-900';
                if (isSelected && !isAnswerSubmitted) {
                  cardStyle = 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/20';
                } else if (isCorrect) {
                  cardStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-500/20';
                } else if (isWrongSelected) {
                  cardStyle = 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-lg shadow-rose-500/20';
                }

                return (
                  <button
                    key={optLetter}
                    onClick={() => handleSelectOption(optLetter)}
                    disabled={isAnswerSubmitted}
                    className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${cardStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : isWrongSelected
                          ? 'bg-rose-500 text-white'
                          : isSelected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {optLetter}
                    </span>
                    <span className="text-sm font-sans flex-1 mt-0.5">{optText}</span>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                    {isWrongSelected && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Actions Bar: Submit, Step-by-Step Hint, Teach in 3D */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Submit Answer */}
                {!isAnswerSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOption}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold font-mono text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {selectedOption === currentQuestion.correct_option ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-600/60">
                        <CheckCircle2 className="w-4 h-4" /> Correct! (+4 Marks)
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1.5 bg-rose-950/80 px-3 py-1.5 rounded-xl border border-rose-600/60">
                        <XCircle className="w-4 h-4" /> Incorrect (-1 Mark). Correct: Option {currentQuestion.correct_option}
                      </span>
                    )}
                  </div>
                )}

                {/* Progressive Step-by-Step Hint Button */}
                <button
                  onClick={handleRequestNextHint}
                  disabled={currentHintStep >= 3 || isLoadingHint}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-600/60 hover:border-amber-500 hover:bg-amber-950/30 text-amber-300 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Unlock step-by-step chemical hints"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  {currentHintStep === 0
                    ? '💡 Get Step 1 Hint'
                    : currentHintStep < 3
                    ? `💡 Next Hint (${currentHintStep + 1}/3)`
                    : '💡 All Hints Unlocked'}
                </button>

                {/* Teach me in 3D Button */}
                <button
                  onClick={handleToggleTeach3D}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    showTeach3D
                      ? 'bg-indigo-600 text-white shadow-indigo-600/40 border border-indigo-400'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white shadow-indigo-500/25'
                  }`}
                  title="Visualize this chemical reaction or geometry in full interactive 3D!"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                  {showTeach3D ? 'Hide 3D Classroom' : 'Teach me in 3D 🧪'}
                </button>
              </div>

              {/* Prev / Next Pagination */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={currentIndex === questions.length - 1}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Unlocked Progressive Hints Panel */}
            {unlockedHints.length > 0 && (
              <div className="bg-amber-950/25 border border-amber-600/40 rounded-2xl p-4.5 space-y-2.5 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4" /> Step-by-Step Chemical Hints ({unlockedHints.length}/3)
                </div>
                <div className="space-y-2 text-xs text-amber-200/90 font-mono">
                  {unlockedHints.map((hintText, hIdx) => (
                    <div key={hIdx} className="bg-slate-950/70 p-2.5 rounded-xl border border-amber-900/60 leading-relaxed">
                      {hintText}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In-depth Chemical Explanation (revealed after submission) */}
            {isAnswerSubmitted && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Comprehensive Chemical Solution & Mechanism
                </h4>
                <div className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800 font-normal">
                  {currentQuestion.explanation}
                </div>
              </div>
            )}
          </div>

          {/* 3D Classroom View (Teach in 3D Mode) */}
          {showTeach3D && (
            <div className="bg-slate-900/90 border border-indigo-500/60 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black font-sans text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    {teach3DData?.title || 'Interactive 3D Chemistry Lesson'}
                  </h3>
                  <p className="text-xs text-indigo-300 font-mono mt-0.5">
                    Spatial 3D stereochemistry and reaction pathway for {currentQuestion.topic}
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    onClick={() => setWireframe(!wireframe)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      wireframe
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {wireframe ? '🌐 Wireframe ON' : '🌐 Wireframe'}
                  </button>
                  <button
                    onClick={() => setShowTeach3D(false)}
                    className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                  >
                    ✕ Close 3D
                  </button>
                </div>
              </div>

              {/* 3D Canvas Box */}
              <div className="relative h-[480px] md:h-[520px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
                {isLoading3D ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-indigo-300 font-mono text-xs gap-3">
                    <Sparkles className="w-10 h-10 animate-spin text-indigo-400" />
                    Computing 3D geometry force fields via RDKit...
                  </div>
                ) : teach3DData?.reaction_data ? (
                  <ReactionAnimationViewer
                    reaction={teach3DData.reaction_data}
                    progress={teachProgress}
                    wireframe={wireframe}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
                    Could not construct 3D scene for this question.
                  </div>
                )}
              </div>

              {/* Timeline Controls */}
              {teach3DData?.reaction_data && (
                <ReactionTimelineControls
                  isPlaying={isTeachPlaying}
                  progress={teachProgress}
                  speed={teachSpeed}
                  currentStageName={teachAnimFrameState?.currentStageName || 'Reaction Stage'}
                  stageDescription={teachAnimFrameState?.stageDescription || ''}
                  stages={teach3DData.stages || ['Reactants', 'Transition State', 'Products']}
                  currentStageIndex={teachAnimFrameState?.currentStageIndex || 0}
                  onTogglePlay={() => setIsTeachPlaying((prev) => !prev)}
                  onReset={() => {
                    setIsTeachPlaying(false);
                    setTeachProgress(0.0);
                  }}
                  onProgressChange={(val: number) => setTeachProgress(val)}
                  onSpeedChange={(s: number) => setTeachSpeed(s)}
                />
              )}

              {/* Spatial 3D Insight Box */}
              {teach3DData?.spatial_insight && (
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-indigo-900/60 text-xs font-mono space-y-1.5 shadow">
                  <span className="text-indigo-400 font-bold block uppercase tracking-wider">
                    🔬 Spatial & Stereochemical Insight:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{teach3DData.spatial_insight}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
