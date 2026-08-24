import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  keyConcepts?: string[];
  suggestedVisualizePrompt?: string;
  suggestedFollowups?: string[];
  timestamp: string;
}

interface ChemistryTutorChatProps {
  isOpen: boolean;
  onClose: () => void;
  onVisualizePrompt: (prompt: string) => void;
}

export const ChemistryTutorChat: React.FC<ChemistryTutorChatProps> = ({
  isOpen,
  onClose,
  onVisualizePrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hello! I am your **AI Chemistry Tutor**. Ask me anything about theoretical organic, physical, or general chemistry concepts!',
      keyConcepts: ['Theoretical Chemistry', 'Mechanism Q&A', '3D Integration'],
      suggestedFollowups: [
        'What is a nucleophile?',
        'Explain SN1 vs SN2 mechanisms',
        'Why is water polar?',
        'What is activation energy?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const tutorMsg: ChatMessageData = {
          id: `tutor-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Thank you for your question.',
          keyConcepts: data.key_concepts || [],
          suggestedVisualizePrompt: data.suggested_visualize_prompt,
          suggestedFollowups: data.suggested_followups || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, tutorMsg]);
      } else {
        throw new Error('Failed to reach AI Tutor server.');
      }
    } catch {
      const errorMsg: ChatMessageData = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Unable to connect to AI Tutor API. Please make sure the backend FastAPI service is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            🧪
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">AI Chemistry Tutor</h3>
            <p className="text-[11px] text-cyan-400 font-mono">Conceptual Q&A & 3D Router</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-lg p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3.5 shadow-lg border transition-all ${
                  isUser
                    ? 'bg-cyan-600 text-white border-cyan-500 rounded-br-none'
                    : 'bg-slate-800/90 text-slate-100 border-slate-700/80 rounded-bl-none'
                }`}
              >
                {/* Message Content */}
                <div className="whitespace-pre-wrap leading-relaxed prose prose-invert prose-xs">
                  {msg.content}
                </div>

                {/* Key Concepts Badges */}
                {msg.keyConcepts && msg.keyConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-700/60">
                    {msg.keyConcepts.map((concept, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-[10px] font-mono bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700/60"
                      >
                        🏷️ {concept}
                      </span>
                    ))}
                  </div>
                )}

                {/* 3D Visualization Action Button */}
                {msg.suggestedVisualizePrompt && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60">
                    <button
                      onClick={() => {
                        if (msg.suggestedVisualizePrompt) {
                          onVisualizePrompt(msg.suggestedVisualizePrompt);
                        }
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📷</span>
                      <span>Visualize &quot;{msg.suggestedVisualizePrompt}&quot; in 3D</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                {msg.timestamp}
              </span>

              {/* Suggested Followups */}
              {!isUser && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                <div className="mt-2 space-y-1 w-full max-w-[90%]">
                  <span className="text-[10px] font-mono text-slate-400">Suggested Questions:</span>
                  <div className="flex flex-col gap-1">
                    {msg.suggestedFollowups.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSendMessage(q)}
                        className="text-left text-[11px] text-cyan-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        💡 {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 w-fit animate-pulse">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
            <span>AI Tutor is formulating explanation...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a chemistry question..."
            className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl transition font-semibold flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
