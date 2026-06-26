import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, Send, Trash2, RefreshCw, Database, 
  HelpCircle, MessageSquare, Info, BrainCircuit, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatbotPageProps {
  setActivePage: (page: any) => void;
  setSelectedDatasetId: (id: string | null) => void;
}

export const ChatbotPage: React.FC<ChatbotPageProps> = ({ 
  setActivePage,
  setSelectedDatasetId 
}) => {
  const { user, addToast, refreshUser } = useAuth();
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDataset] = useState<string>('');
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Retrieve user's datasets to populate the contextual grounding dropdown
  useEffect(() => {
    const fetchDatasetsList = async () => {
      try {
        setLoadingDatasets(true);
        const res = await api.getDatasets();
        setDatasets(res.datasets || []);
      } catch (error: any) {
        console.error('Failed to load datasets for copilot:', error);
      } finally {
        setLoadingDatasets(false);
      }
    };
    fetchDatasetsList();
  }, []);

  // Smooth scroll to the bottom of the chat log when history updates
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [user?.copilotChatHistory, chatLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const messageToSend = chatMessage;
    setChatMessage('');
    setChatLoading(true);

    try {
      const res = await api.sendCopilotChat(messageToSend, selectedDatasetId || null);
      if (res.success) {
        // Refresh local user context to capture updated chat history
        await refreshUser();
      }
    } catch (error: any) {
      addToast(error.message || 'An error occurred during communication.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear your conversation history with DataSage Copilot?')) {
      return;
    }
    try {
      setChatLoading(true);
      const res = await api.clearCopilotChat();
      if (res.success) {
        await refreshUser();
        addToast('Chat history cleared.', 'info');
      }
    } catch (error: any) {
      addToast(error.message || 'Failed to clear chat history.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const activeHistory = user?.copilotChatHistory || [];

  const suggestedQuestions = [
    "What is standard deviation, and when should I use it?",
    "Explain the difference between supervised and unsupervised learning.",
    "Give me 5 strategies to handle extreme outliers in a financial dataset.",
    "Show me an example python pandas cleaning script for missing timestamps."
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full w-full max-w-7xl mx-auto" id="datasage-copilot-container">
      {/* LEFT COLUMN: Controls, Guidance and Grounding Selectors */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
        
        {/* Grounding Selector Card */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-semibold text-zinc-100 text-sm">Context Grounding</h3>
          </div>
          
          <p className="text-zinc-400 text-xs leading-relaxed">
            Ground Copilot's intelligence in one of your uploaded datasets. Select a dataset below to feed its statistics directly to the AI model.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              Select Dataset Context
            </label>
            {loadingDatasets ? (
              <div className="flex items-center gap-2 py-2 px-3 bg-zinc-900/40 border border-white/5 rounded-xl text-xs text-zinc-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                Loading datasets...
              </div>
            ) : (
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="">None – General DataSage Assistance</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    📊 {d.name} ({d.rows} rows)
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedDatasetId && (
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-3.5 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-indigo-200 leading-relaxed">
                <strong>Context Active:</strong> Copilot will reference column counts, null statistics, and descriptive distributions for the active dataset to formulate highly accurate mathematical replies.
              </div>
            </div>
          )}
        </div>

        {/* System capabilities / help */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl hidden lg:flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-semibold text-zinc-100 text-sm">Copilot Capabilities</h3>
          </div>

          <ul className="flex flex-col gap-3 text-xs text-zinc-400">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>Statistical Distribution advice</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>Formatting cleaning strategies</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>Machine Learning pipeline layout</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>Pandas, NumPy, and SQL scripts</span>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Log & Input Window */}
      <div className="flex-1 flex flex-col gap-6 min-h-[550px]">
        <div className="glass-card rounded-3xl border border-white/5 shadow-xl p-6 flex flex-col h-[600px] relative overflow-hidden bg-zinc-950/45">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-500 to-cyan-400 p-2 rounded-xl shadow-md">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="font-sans font-bold text-sm text-zinc-100">DataSage Copilot</h2>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">AI Analytics Assistant</span>
              </div>
            </div>

            {activeHistory.length > 0 && (
              <button
                onClick={handleClearChat}
                disabled={chatLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Chat
              </button>
            )}
          </div>

          {/* Active Chat Logs */}
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 pb-4">
            
            {/* Initial welcome message if history is empty */}
            {activeHistory.length === 0 && (
              <div className="flex flex-col gap-5 py-6">
                <div className="flex gap-4 items-start bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10 text-xs text-left max-w-2xl">
                  <div className="p-2.5 rounded-xl bg-indigo-500 text-white shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-indigo-300">Welcome to DataSage Copilot!</h5>
                    <p className="text-zinc-300 mt-2 leading-relaxed">
                      I am your expert AI data science copilot, fully integrated with your workspace data.
                    </p>
                    <p className="text-zinc-400 mt-1.5 leading-relaxed">
                      Ask me anything about mathematics, data engineering pipelines, machine learning models, or python scripting. You can also select one of your uploaded datasets in the left sidebar to ground my questions in your data!
                    </p>
                  </div>
                </div>

                {/* Suggestions list */}
                <div className="flex flex-col gap-2 max-w-2xl">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Suggested Prompt Ideas:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setChatMessage(q)}
                        className="text-left p-3.5 rounded-xl bg-zinc-900/40 hover:bg-indigo-500/5 border border-white/5 hover:border-indigo-500/20 text-xs text-zinc-300 hover:text-indigo-300 transition-all leading-relaxed cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat List Messages */}
            {activeHistory.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const text = msg.parts?.[0]?.text || '';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 items-start max-w-[85%] ${isUser ? 'self-end flex-row-reverse text-right' : 'self-start text-left'}`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 text-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-indigo-400'}`}>
                    {isUser ? '👤' : '🤖'}
                  </div>
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200' 
                      : 'bg-zinc-900/90 border border-white/5 text-zinc-300'
                  }`}>
                    <div className="whitespace-pre-wrap">{text}</div>
                    <span className="text-[9px] font-mono text-zinc-500 block mt-1.5">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {chatLoading && (
              <div className="flex gap-3 items-start self-start text-left">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400 text-sm">
                  🤖
                </div>
                <div className="p-4 rounded-2xl text-xs bg-zinc-900/90 border border-white/5 text-zinc-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  Generating responses based on context...
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Form Input Area */}
          <form onSubmit={handleSend} className="border-t border-white/5 pt-4 mt-2 flex gap-3">
            <input
              type="text"
              placeholder={selectedDatasetId ? "Ask a question about the active dataset..." : "Ask Copilot a question (e.g., 'What is standard deviation?')..."}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              disabled={chatLoading}
              className="flex-1 px-4 py-3 rounded-xl border border-white/5 bg-zinc-900/50 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatMessage.trim()}
              className="p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all shadow-md shadow-indigo-500/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
