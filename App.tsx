
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { Message, GeneratedAsset, WorkflowStep } from './types';
import { processArchitectRequest, APP_VERSION, APP_BUILD_DATE, ImageData } from './services/geminiService';
import { exportToOpenSCAD, copyToClipboard } from './services/openscadExport';
import ScadRenderer from './components/ScadRenderer';
import SettingsPanel from './components/SettingsPanel';
import DesignTemplates from './components/DesignTemplates';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Bot,
  User,
  Cpu,
  Box,
  Copy,
  Check,
  Download,
  ExternalLink,
  HelpCircle,
  ChevronRight,
  Sparkles,
  FileCode,
  Loader2,
  Eye,
  Code,
  Wrench,
  Plus,
  Minus,
  RotateCcw,
  Move,
  Settings,
  ImagePlus,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Quick fix suggestions for common issues
const QUICK_FIXES = [
  { label: "Too tight", prompt: "Increase all tolerances by 0.2mm for a looser fit", icon: Plus },
  { label: "Too loose", prompt: "Decrease all tolerances by 0.15mm for a tighter fit", icon: Minus },
  { label: "Walls too thin", prompt: "Increase all wall thicknesses to at least 2.4mm", icon: Wrench },
  { label: "Make bigger", prompt: "Scale the entire design up by 10%", icon: Plus },
  { label: "Make smaller", prompt: "Scale the entire design down by 10%", icon: Minus },
  { label: "Add clearance", prompt: "Add 0.5mm clearance around all mating surfaces", icon: Move },
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentAsset, setCurrentAsset] = useState<GeneratedAsset | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | '3d'>('code');
  const [showSettings, setShowSettings] = useState(false);
  const [attachedImage, setAttachedImage] = useState<ImageData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data URL prefix
      setAttachedImage({
        base64: base64Data,
        mimeType: file.type
      });
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const clearAttachedImage = useCallback(() => {
    setAttachedImage(null);
    setImagePreview(null);
  }, []);

  const handleSend = useCallback(async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if ((!textToSend.trim() && !attachedImage) || workflowStep === 'processing') return;

    const sanitizedInput = textToSend
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!sanitizedInput) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMsg: Message = { role: 'user', text: attachedImage ? `[Image attached] ${sanitizedInput}` : sanitizedInput };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const imageToSend = attachedImage;
    clearAttachedImage(); // Clear the image preview immediately
    setWorkflowStep('processing');

    try {
      const history = messages.map(m => m.text);
      const asset = await processArchitectRequest(
        sanitizedInput,
        history,
        currentAsset,
        abortControllerRef.current.signal,
        imageToSend || undefined
      );

      if (abortControllerRef.current?.signal.aborted) return;

      setCurrentAsset(asset);

      if (asset.scadCode) {
        setWorkflowStep('complete');
        setMessages(prev => [...prev, { role: 'model', text: "Done! Your OpenSCAD code is ready. Click **Open in OpenSCAD** to edit and render it." }]);
      } else if (asset.questions && asset.questions.length > 0) {
        setWorkflowStep('spec-review');
        setMessages(prev => [...prev, { role: 'model', text: "I have a few questions to finalize the design:" }]);
      } else {
        setWorkflowStep('spec-review');
        setMessages(prev => [...prev, { role: 'model', text: "I've drafted the specification. Click **Generate Code** when you're ready." }]);
      }

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Error:", e);
      setWorkflowStep('idle');
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message || 'Something went wrong'}`, isError: true }]);
    }
  }, [input, workflowStep, currentAsset, messages, attachedImage, clearAttachedImage]);

  const handleApproveSpec = useCallback(() => {
    handleSend("APPROVE_SPEC");
  }, [handleSend]);

  const handleCopy = useCallback(async () => {
    if (currentAsset?.scadCode) {
      const success = await copyToClipboard(currentAsset.scadCode);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [currentAsset]);

  const handleExport = useCallback(async () => {
    if (currentAsset?.scadCode) {
      const result = await exportToOpenSCAD(currentAsset.scadCode, currentAsset.spec);
      if (result.success) {
        setExported(true);
        setTimeout(() => setExported(false), 3000);
      }
    }
  }, [currentAsset]);

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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                PolyGen <span className="text-violet-400">AI</span>
              </h1>
              <span className="text-[10px] text-gray-500 font-mono">v{APP_VERSION}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-[10px] font-mono text-gray-500 bg-white/[0.03] rounded border border-white/[0.06]">
              {APP_BUILD_DATE}
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Gemini 3 Pro
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        </header>

        {/* Settings Panel */}
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

        <main className="flex-1 flex overflow-hidden">
          {/* Left Panel - Chat */}
          <div className="w-[400px] min-w-[360px] flex flex-col border-r border-white/[0.06]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col h-full">
                  <div className="flex flex-col items-center justify-center text-center px-6 py-8">
                    <div className="p-3 bg-violet-500/10 rounded-xl mb-4">
                      <Cpu className="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 className="text-base font-medium text-white mb-1">AI-Powered 3D Modeling</h2>
                    <p className="text-sm text-gray-500">
                      Describe what you want to create, or pick a template below.
                    </p>
                  </div>
                  <DesignTemplates
                    isVisible={true}
                    onSelectTemplate={(prompt) => {
                      setInput(prompt);
                      handleSend(prompt);
                    }}
                  />
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-violet-600'
                      : msg.isError
                        ? 'bg-red-500/20'
                        : 'bg-white/[0.06]'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Bot className={`w-3.5 h-3.5 ${msg.isError ? 'text-red-400' : 'text-violet-400'}`} />
                    )}
                  </div>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-500/10 text-red-300 border border-red-500/20 rounded-bl-sm'
                        : 'bg-white/[0.04] text-gray-300 border border-white/[0.06] rounded-bl-sm'
                  }`}>
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => <span className="font-semibold text-white">{children}</span>
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

              {workflowStep === 'processing' && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Questions Panel with Clickable Suggestions */}
            {currentAsset?.clarifications && currentAsset.clarifications.length > 0 && workflowStep !== 'processing' && (
              <div className="mx-3 mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-between text-amber-400 mb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Clarification needed</span>
                  </div>
                  <span className="text-[10px] text-amber-400/60">Click answers to add to input, then send</span>
                </div>
                <div className="space-y-3">
                  {currentAsset.clarifications.map((clarification, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex gap-2 text-sm text-gray-300">
                        <span className="text-amber-400/60 font-mono text-xs shrink-0">{i + 1}.</span>
                        <span className="text-xs">{clarification.question}</span>
                      </div>
                      {clarification.suggestions && clarification.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 ml-4">
                          {clarification.suggestions.map((suggestion, j) => (
                            <button
                              key={j}
                              onClick={() => setInput(prev => prev ? `${prev}\n${i + 1}. ${suggestion}` : `${i + 1}. ${suggestion}`)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] rounded-md transition-colors border border-amber-500/30 hover:border-amber-400/50"
                            >
                              {suggestion}
                            </button>
                          ))}
                          <button
                            onClick={() => setInput(prev => prev ? `${prev}\n${i + 1}. ` : `${i + 1}. `)}
                            className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 text-[10px] rounded-md transition-colors border border-white/[0.08]"
                          >
                            Custom...
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Send all answers button */}
                {input.trim() && (
                  <button
                    onClick={() => handleSend()}
                    className="mt-3 w-full py-2 bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 text-xs font-medium rounded-lg transition-colors border border-amber-500/40"
                  >
                    Send All Answers
                  </button>
                )}
              </div>
            )}

            {/* Iteration Helpers - Show when there's existing code */}
            {currentAsset?.scadCode && workflowStep !== 'processing' && (
              <div className="mx-3 mb-2 p-2.5 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                <div className="flex items-center gap-2 text-violet-400 mb-2">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Refine Design</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "The hole is too small, increase by 1mm",
                    "Add mounting holes in the corners",
                    "Make it thicker for more strength",
                    "Add ventilation slots",
                    "Round all the edges more"
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="px-2 py-1 bg-white/[0.04] hover:bg-violet-500/20 text-[10px] text-gray-400 hover:text-violet-300 rounded-md transition-colors border border-white/[0.06]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-white/[0.06]">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-2 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Attached"
                    className="h-16 w-auto rounded-lg border border-white/[0.1]"
                  />
                  <button
                    onClick={clearAttachedImage}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-400 rounded-full text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={attachedImage
                    ? "Describe what you want from this image..."
                    : currentAsset?.scadCode
                      ? "Describe what to change..."
                      : "Describe what you want to create..."}
                  className="w-full bg-white/[0.03] text-white text-sm rounded-xl border border-white/[0.08] focus:border-violet-500/50 p-3 pr-20 min-h-[72px] max-h-[140px] resize-none placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  rows={2}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={workflowStep === 'processing'}
                    className="p-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-gray-400 hover:text-white rounded-lg transition-all"
                    title="Attach image to recreate"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={workflowStep === 'processing' || (!input.trim() && !attachedImage)}
                    className="p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-gray-600 text-white rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="flex-1 flex flex-col bg-[#0c0c0f]">
            {currentAsset?.scadCode ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
                      <button
                        onClick={() => setViewMode('code')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                          viewMode === 'code'
                            ? 'bg-violet-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        Code
                      </button>
                      <button
                        onClick={() => setViewMode('3d')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                          viewMode === '3d'
                            ? 'bg-violet-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        3D Preview
                      </button>
                    </div>
                    {currentAsset.spec?.product_class && (
                      <span className="px-2 py-0.5 bg-white/[0.04] rounded text-xs text-gray-500 border border-white/[0.06]">
                        {currentAsset.spec.product_class}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs rounded-lg transition-colors border border-white/[0.08]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-all"
                    >
                      {exported ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Downloaded
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in OpenSCAD
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Area - Code or 3D Preview */}
                <div className="flex-1 overflow-hidden">
                  {viewMode === 'code' ? (
                    <div className="h-full overflow-auto">
                      <SyntaxHighlighter
                        language="openscad"
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          padding: '1rem 1.25rem',
                          background: 'transparent',
                          fontSize: '12px',
                          lineHeight: '1.7',
                        }}
                        showLineNumbers
                        lineNumberStyle={{ color: '#3f3f46', paddingRight: '1.25rem', minWidth: '2.5rem' }}
                      >
                        {currentAsset.scadCode}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <ScadRenderer code={currentAsset.scadCode} isProUser={true} />
                  )}
                </div>

                {/* Quick Fix Bar */}
                <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Quick Adjustments</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_FIXES.map((fix, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(fix.prompt)}
                        disabled={workflowStep === 'processing'}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-[11px] rounded-md transition-colors border border-white/[0.06] disabled:opacity-50"
                      >
                        <fix.icon className="w-3 h-3" />
                        {fix.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-2 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    {currentAsset.spec?.product_class && (
                      <span>Type: <span className="text-gray-500">{currentAsset.spec.product_class}</span></span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">
                    {currentAsset.scadCode.split('\n').length} lines
                  </span>
                </div>
              </>
            ) : currentAsset?.spec ? (
              /* Spec Review State */
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="max-w-sm text-center">
                  <div className="p-3 bg-amber-500/10 rounded-xl mb-5 inline-block">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-lg font-medium text-white mb-2">Specification Ready</h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Review the design and generate code when ready.
                  </p>

                  {/* Spec Preview */}
                  <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-3 mb-5 text-left">
                    <pre className="text-[11px] text-gray-500 overflow-auto max-h-[180px] leading-relaxed">
                      {JSON.stringify(currentAsset.spec, null, 2)}
                    </pre>
                  </div>

                  <button
                    onClick={handleApproveSpec}
                    disabled={workflowStep === 'processing'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-all mx-auto disabled:opacity-50"
                  >
                    {workflowStep === 'processing' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    Generate Code
                  </button>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-3 bg-white/[0.03] rounded-xl mb-4">
                  <Box className="w-10 h-10 text-gray-700" />
                </div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">No Model Yet</h2>
                <p className="text-xs text-gray-600 max-w-[200px]">
                  Describe what you want to create in the chat.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
