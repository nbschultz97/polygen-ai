/**
 * Demo App Component
 * Simplified app experience for anonymous users (max 2 generations)
 * No auth required — uses demo API endpoint with localStorage tracking
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Box,
  Code,
  Cpu,
  Eye,
  Loader2,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { canDemoGenerate, recordDemoGeneration } from '../services/demoService';
import { APP_VERSION } from '../services/geminiService';
import type { Message } from '../types';
import ErrorBoundary from './ErrorBoundary';

// Lazy-load heavy components
const CodeEditor = React.lazy(() => import('./CodeEditor'));
const ScadRenderer = React.lazy(() => import('./ScadRenderer'));

interface DemoAppProps {
  onShowPricing: () => void;
  onShowLanding: () => void;
  onSignUp: () => void;
}

const DEMO_TEMPLATES = [
  'A simple phone stand with adjustable angle',
  'A desk cable organizer with 4 slots',
  'A wall-mounted key holder with 3 hooks',
];

const DemoApp: React.FC<DemoAppProps> = ({ onShowPricing, onShowLanding, onSignUp }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [scadCode, setScadCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'code' | 'preview'>('chat');
  const [isMobile] = useState(window.innerWidth < 768);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const demoStatus = canDemoGenerate();

  const handleSend = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput || input).trim();
      if (!text || isGenerating) return;

      // Check demo limit
      const status = canDemoGenerate();
      if (!status.allowed) {
        setShowLimitModal(true);
        return;
      }

      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text }]);
      setIsGenerating(true);

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        // Step 1: Plan with Gemini (simplified)
        setMessages((prev) => [...prev, { role: 'model', text: '🔍 Planning your design...' }]);

        const planResponse = await fetch('/api/demo-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            pipeline: 'planner',
            systemInstruction:
              'You are a 3D modeling assistant. Generate a simple OpenSCAD plan as JSON. Output a GST (Geometric Structure Tree) with components, dimensions, and relationships. Keep it simple and printable. JSON only, no markdown.',
          }),
          signal: abortRef.current.signal,
        });

        if (!planResponse.ok) {
          const err = await planResponse.json().catch(() => ({ error: 'Planning failed' }));
          const errMsg = typeof err.error === 'string' ? err.error : err.error?.message || 'Planning failed';
          throw new Error(errMsg);
        }

        const planData = await planResponse.json();
        const planText =
          planData?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(planData);

        // Step 2: Generate code with Claude
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', text: '⚙️ Generating OpenSCAD code...' };
          return updated;
        });

        const codeResponse = await fetch('/api/demo-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            pipeline: 'coder',
            system: `You are an OpenSCAD code generator. Convert the user's request into valid OpenSCAD code. 
Rules:
- Use only built-in OpenSCAD primitives (cube, cylinder, sphere, linear_extrude, etc.)
- No include/use statements or external libraries
- Add $fn=64 for smooth curves
- Use eps=0.01 for boolean operations
- Add comments explaining the design
- Output ONLY the OpenSCAD code, no markdown fences.`,
            messages: [
              {
                role: 'user',
                content: `Create OpenSCAD code for: "${text}"\n\nPlanning context:\n${planText}`,
              },
            ],
          }),
          signal: abortRef.current.signal,
        });

        if (!codeResponse.ok) {
          const err = await codeResponse.json().catch(() => ({ error: 'Code generation failed' }));
          const codeErrMsg = typeof err.error === 'string' ? err.error : err.error?.message || 'Code generation failed';
          throw new Error(codeErrMsg);
        }

        const codeData = await codeResponse.json();
        let code = codeData?.content?.[0]?.text || '';

        // Strip markdown fences if present
        code = code
          .replace(/^```(?:openscad|scad)?\n?/gm, '')
          .replace(/\n?```$/gm, '')
          .trim();

        if (!code) {
          throw new Error('No code generated');
        }

        setScadCode(code);
        recordDemoGeneration();

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'model',
            text: `✅ Done! Your OpenSCAD model is ready. ${canDemoGenerate().remaining === 0 ? "You've used both demo generations — sign up for more!" : `You have ${canDemoGenerate().remaining} demo generation${canDemoGenerate().remaining === 1 ? '' : 's'} remaining.`}`,
          };
          return updated;
        });

        if (isMobile) setMobileTab('preview');
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'model') {
            updated[updated.length - 1] = {
              role: 'model',
              text: `❌ ${typeof e?.message === 'string' ? e.message : (typeof e === 'string' ? e : 'Generation failed')}`,
              isError: true,
            };
          }
          return updated;
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [input, isGenerating, isMobile]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-[#09090b] border-b border-white/[0.06]">
          <button
            onClick={onShowLanding}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                PolyGen <span className="text-violet-400">AI</span>
              </h1>
              <span className="text-[10px] text-gray-500 font-mono">v{APP_VERSION} • Demo</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300">
                {demoStatus.remaining}/{demoStatus.limit} demo generations
              </span>
            </div>
            <button
              onClick={onSignUp}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign Up Free
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
          {/* Mobile Tab Switcher */}
          {isMobile && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-slate-900/90 backdrop-blur border border-white/10 rounded-full p-1 shadow-xl">
              {(['chat', 'code', 'preview'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                    mobileTab === tab ? 'bg-violet-600 text-white' : 'text-gray-400'
                  }`}
                >
                  {tab === 'chat' && <MessageCircle className="w-3.5 h-3.5" />}
                  {tab === 'code' && <Code className="w-3.5 h-3.5" />}
                  {tab === 'preview' && <Eye className="w-3.5 h-3.5" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Chat Panel */}
          <div
            className={`flex flex-col border-r border-white/[0.06] bg-[#09090b] md:w-[30%] md:min-w-[320px] ${
              isMobile && mobileTab !== 'chat' ? 'hidden' : ''
            }`}
          >
            <div className="flex-1 overflow-y-auto p-4 pt-14 md:pt-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center px-6 py-8">
                  <div className="p-3 bg-violet-500/10 rounded-xl mb-4">
                    <Cpu className="w-8 h-8 text-violet-400" />
                  </div>
                  <h2 className="text-base font-medium text-white mb-1">Try PolyGen AI</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Describe a 3D model to generate, or pick a template:
                  </p>
                  <div className="space-y-2 w-full max-w-sm">
                    {DEMO_TEMPLATES.map((template, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(template)}
                        className="w-full text-left px-4 py-3 bg-white/[0.03] hover:bg-violet-500/10 border border-white/[0.06] hover:border-violet-500/30 rounded-xl text-sm text-gray-300 hover:text-white transition-all"
                      >
                        "{template}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-violet-600'
                        : msg.isError
                          ? 'bg-red-500/20'
                          : 'bg-white/[0.06]'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Bot
                        className={`w-3.5 h-3.5 ${msg.isError ? 'text-red-400' : 'text-violet-400'}`}
                      />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-sm'
                        : msg.isError
                          ? 'bg-red-500/10 text-red-300 border border-red-500/20 rounded-bl-sm'
                          : 'bg-white/[0.04] text-gray-300 border border-white/[0.06] rounded-bl-sm'
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => (
                          <span className="font-semibold text-white">{children}</span>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

              {isGenerating && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <span className="text-sm text-gray-500">Generating...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to create..."
                  className="w-full bg-white/[0.03] text-white text-sm rounded-xl border border-white/[0.08] focus:border-violet-500/50 p-3 pr-12 min-h-[60px] max-h-[120px] resize-none placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  rows={2}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isGenerating || !input.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-gray-600 text-white rounded-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Code Panel */}
          <div
            className={`flex flex-col border-r border-white/[0.06] bg-[#0f172a] md:w-[35%] ${
              isMobile && mobileTab !== 'code' ? 'hidden' : ''
            }`}
          >
            {scadCode ? (
              <React.Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  </div>
                }
              >
                <CodeEditor
                  code={scadCode}
                  streamingCode=""
                  isGenerating={isGenerating}
                  onCodeChange={() => {}}
                  onRender={() => {
                    if (isMobile) setMobileTab('preview');
                  }}
                />
              </React.Suspense>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Code className="w-10 h-10 text-gray-700 mb-4" />
                <p className="text-sm text-gray-500">Generated code will appear here</p>
              </div>
            )}
          </div>

          {/* 3D Preview Panel */}
          <div
            className={`flex-1 flex flex-col bg-[#0c0c0f] ${
              isMobile && mobileTab !== 'preview' ? 'hidden' : ''
            }`}
          >
            {scadCode ? (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-gray-400 font-medium">3D Preview</span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <React.Suspense
                    fallback={
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                      </div>
                    }
                  >
                    <ScadRenderer code={scadCode} isProUser={false} />
                  </React.Suspense>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Box className="w-10 h-10 text-gray-700 mb-4" />
                <p className="text-sm text-gray-500">3D preview will appear here</p>
              </div>
            )}
          </div>
        </main>

        {/* Demo Limit Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#18181b] border border-white/[0.1] rounded-2xl p-8 max-w-md mx-4 text-center">
              <div className="p-3 bg-amber-500/10 rounded-xl mb-5 inline-block">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Demo Limit Reached</h2>
              <p className="text-gray-400 mb-6">
                You've used your 2 free demo generations. Sign up for a free account to get 5
                generations per month, plus access to all features.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={onSignUp}
                  className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onShowPricing}
                  className="w-full px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-xl border border-white/[0.1] transition-colors"
                >
                  View Plans
                </button>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Continue browsing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DemoApp;
