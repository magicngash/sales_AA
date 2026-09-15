import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, SalesRecord, SalesSummaryMetrics, InventoryItemAnalysis } from '../types';

interface SalesQAChatProps {
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  onClearHistory: () => void;
  recordsCount: number;
  sheetTitle: string;
  externalPrefillQuestion?: string;
  onPrefillHandled?: () => void;
}

const QUICK_QUESTIONS = [
  {
    icon: AlertTriangle,
    label: 'Critical Stockout Risks',
    question: 'Which products are at critical risk of stocking out before new supplier shipments arrive, and how many units should we order immediately?',
  },
  {
    icon: DollarSign,
    label: 'Top Profit Margins',
    question: 'Which products and categories deliver the highest gross profit margins, and what share of total sales do they represent?',
  },
  {
    icon: Sparkles,
    label: 'Sales Velocity by SKU',
    question: 'What is the daily sales velocity for each SKU in the dataset, and how do their current stock levels compare to supplier lead times?',
  },
  {
    icon: TrendingDown,
    label: 'Slow-Moving / Dead Stock',
    question: 'Are there any products with high on-hand stock but low sales velocity that may be tying up unnecessary working capital?',
  },
];

export const SalesQAChat: React.FC<SalesQAChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onClearHistory,
  recordsCount,
  sheetTitle,
  externalPrefillQuestion,
  onPrefillHandled,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalPrefillQuestion) {
      setInputQuestion(externalPrefillQuestion);
      if (onPrefillHandled) onPrefillHandled();
    }
  }, [externalPrefillQuestion, onPrefillHandled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isLoading) return;
    const q = inputQuestion.trim();
    setInputQuestion('');
    await onSendMessage(q);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[750px] max-h-[85vh] overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Sales &amp; Inventory AI Analyst
            </h2>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Grounding:</span>
              <span className="font-medium text-emerald-700">{sheetTitle}</span>
              <span>&bull;</span>
              <span>{recordsCount} rows analyzed</span>
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-6 py-2.5 border-b border-slate-100 bg-white overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> Quick Inquiries:
        </span>
        {QUICK_QUESTIONS.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(chip.question)}
              disabled={isLoading}
              className="text-xs text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-emerald-600" />
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-slate-800">
                Ask anything about your Google Sheets sales data
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You can inquire about sales trajectory, product revenue contribution, profit margins, supplier lead time risks, or request an optimal reorder plan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-lg w-full pt-2">
              {QUICK_QUESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip.question)}
                  className="p-3 text-xs bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-xs transition-all text-slate-700 text-left"
                >
                  <p className="font-semibold text-slate-900 mb-0.5">{chip.label}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{chip.question}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div
                    className={`w-8 h-8 rounded-lg ${
                      msg.isError ? 'bg-rose-600' : 'bg-emerald-600'
                    } text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                  >
                    {msg.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="prose prose-xs max-w-none text-slate-800">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                      {msg.isError && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const lastUserQuestion = [...messages.slice(0, idx)]
                                .reverse()
                                .find((m) => m.sender === 'user')?.text;
                              if (lastUserQuestion) {
                                onSendMessage(lastUserQuestion);
                              }
                            }}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs transition-colors shadow-2xs disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry Question
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`mt-2 flex items-center gap-2 text-[10px] ${isUser ? 'text-slate-400 justify-end' : 'text-slate-400 justify-between'}`}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {!isUser && !msg.isError && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors flex items-center gap-1"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" /> Copy
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
              <span className="ml-1 font-medium text-slate-600">Analyzing live sheet records &amp; calculating inventory velocity...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
          <input
            id="sales-qa-input"
            type="text"
            placeholder="Ask a question about sales records, margins, inventory burn-rate..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden py-1"
          />
          <button
            id="sales-qa-submit-btn"
            type="submit"
            disabled={isLoading || !inputQuestion.trim()}
            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
