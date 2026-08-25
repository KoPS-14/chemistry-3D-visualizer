import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    title: 'Bonding & Geometry',
    prompt: 'Why is carbon tetravalent and what is its hybridization in methane?',
  },
  {
    title: 'Reaction Mechanisms',
    prompt: 'Explain the step-by-step mechanism of an SN2 substitution reaction with stereochemical inversion.',
  },
  {
    title: 'Physical Chemistry Calculation',
    prompt: 'Calculate the pH and pOH of a 0.025 M HCl aqueous solution at 25°C.',
  },
  {
    title: 'Thermodynamics & Kinetics',
    prompt: 'How does activation energy affect reaction rate according to the Arrhenius equation?',
  },
];

export const ChemistryChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textOverride) setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
          message: text,
          history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiAnswer = data.answer || data.reply || 'No response received.';
        const aiMessage: ChatMessageItem = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const aiMessage: ChatMessageItem = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorData.detail || errorData.answer || '⚠️ Error communicating with Gemini API backend service.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch {
      const aiMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Failed to connect to backend server. Please make sure the FastAPI backend is running on `http://localhost:8000`.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setInputMessage('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto w-full bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Chat Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40">
            🧪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Gemini Chemistry Chatbot</h2>
              <span className="text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-700/60 shadow-sm">
                Gemini 1.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">Conversational AI for mechanisms, physical chemistry, calculations & theory</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Start new conversation"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Message Feed Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Welcome / Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/25 mb-4">
              ⚗️
            </div>
            <h3 className="text-lg font-bold text-white">How can I help you with Chemistry today?</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Ask anything from organic reaction mechanisms, periodic trends, and stoichiometry calculations to complex thermodynamics.
            </p>

            {/* Inspiration Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6 text-left">
              {STARTER_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all text-xs group cursor-pointer shadow-md"
                >
                  <span className="font-semibold text-cyan-400 block group-hover:text-cyan-300">{item.title}</span>
                  <span className="text-slate-300 text-[11px] mt-1 line-clamp-2">{item.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white ring-1 ring-cyan-400/50'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white ring-1 ring-emerald-400/40'
                }`}
              >
                {isUser ? '👤' : '🧪'}
              </div>

              {/* Message Content Bubble */}
              <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`relative p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xl border ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/30 rounded-tr-none'
                      : 'bg-slate-950/90 text-slate-100 border-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap prose prose-invert max-w-none text-xs sm:text-sm">
                    {msg.content}
                  </div>

                  {/* Copy Button on AI responses */}
                  {!isUser && (
                    <div className="flex justify-end mt-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {/* Real-time Thinking Animation Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs shrink-0 shadow-md ring-1 ring-emerald-400/40">
              🧪
            </div>
            <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2.5 text-xs text-cyan-300 shadow-xl">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              <span className="font-mono text-slate-300">Gemini is reasoning through chemistry concepts...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700/80 focus-within:border-cyan-500 rounded-2xl p-2 shadow-inner transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a chemistry question (e.g. 'Calculate the mass of 0.5 mol CO2' or 'Why is water polar?')... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm px-3 py-1.5 focus:outline-none resize-none max-h-44 font-sans"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
            title="Send message (Enter)"
          >
            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
          Powered by Google Gemini 1.5 Flash • Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};
