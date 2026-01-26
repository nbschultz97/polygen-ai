/**
 * Main App Component
 * Authenticated app experience with usage tracking and limits
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Message, GeneratedAsset, WorkflowStep } from '../types';
import { processArchitectRequest, APP_VERSION, APP_BUILD_DATE, ImageData } from '../services/geminiService';
import { orchestrateGeneration, isMultiAgentAvailable } from '../services/agentOrchestrator';
import { exportToOpenSCAD, copyToClipboard } from '../services/openscadExport';
import ScadRenderer from './ScadRenderer';
import SettingsPanel from './SettingsPanel';
import DesignTemplates from './DesignTemplates';
import SmartQuickFixes from './SmartQuickFixes';
import AuthModal from './AuthModal';
import UsageLimitModal from './UsageLimitModal';
import { useAuth } from './AuthContext';
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
  ExternalLink,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Loader2,
  Eye,
  Code,
  RotateCcw,
  Settings,
  ImagePlus,
  X,
  LogOut,
  Crown,
  Zap,
  BarChart3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Check if multi-agent pipeline is enabled
const USE_MULTI_AGENT = import.meta.env.VITE_USE_MULTI_AGENT === 'true' || process.env.USE_MULTI_AGENT === 'true';

interface MainAppProps {
  onShowPricing: () => void;
  onShowLanding: () => void;
  onShowDashboard?: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ onShowPricing, onShowLanding, onShowDashboard }) => {
  const { user, profile, signOut, canGenerate, recordGeneration, isProUser } = useAuth();

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
  const [conceptPreview, setConceptPreview] = useState<string | null>(null);

  // Auth modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState({ remaining: 0, limit: 0 });

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check usage on mount
  useEffect(() => {
    const checkUsage = async () => {
      if (user) {
        const usage = await canGenerate();
        setUsageInfo({ remaining: usage.remaining, limit: usage.limit });
      }
    };
    checkUsage();
  }, [user, canGenerate]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setAttachedImage({
        base64: base64Data,
        mimeType: file.type
      });
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);

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

    // Check usage limits only if user is logged in
    if (user) {
      const usage = await canGenerate();
      if (!usage.allowed) {
        setUsageInfo({ remaining: usage.remaining, limit: usage.limit });
        setShowLimitModal(true);
        return;
      }
    }

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
    clearAttachedImage();

    if (currentAsset?.clarifications) {
      setCurrentAsset(prev => prev ? { ...prev, clarifications: undefined } : null);
    }

    if (!currentAsset?.scadCode) {
      setConceptPreview(null);
    }

    setWorkflowStep('processing');

    try {
      const history = messages.map(m => m.text);

      if (USE_MULTI_AGENT && isMultiAgentAvailable()) {
        const asset = await orchestrateGeneration(
          {
            userPrompt: sanitizedInput,
            existingAsset: currentAsset || undefined,
            isEdit: !!currentAsset?.scadCode,
            imageData: imageToSend || undefined,
            conversationHistory: history
          },
          {
            onStepChange: (step) => setWorkflowStep(step),
            onGSTGenerated: (gst) => {
              console.log('GST generated:', gst.name);
              setConceptPreview(null);
            },
            onPreviewImageGenerated: (imageUrl) => {
              console.log('Preview image generated');
              setConceptPreview(imageUrl);
            },
            onCodeGenerated: (code) => console.log('Code generated:', code.length, 'chars'),
            onValidationComplete: (result) => {
              if (result.success) {
                setMessages(prev => [...prev, { role: 'model', text: "Done! Your OpenSCAD code is ready. Click **Open in OpenSCAD** to edit and render it." }]);
              } else {
                setMessages(prev => [...prev, { role: 'model', text: `Validation issues: ${result.errors.join(', ')}` }]);
              }
            },
            onSmartFixesGenerated: (fixes) => console.log('Smart fixes generated:', fixes.length),
            onError: (error, step) => {
              console.error(`Error in ${step}:`, error);
              setMessages(prev => [...prev, { role: 'model', text: `Error during ${step}: ${error.message}`, isError: true }]);
            }
          },
          abortControllerRef.current.signal
        );

        if (abortControllerRef.current?.signal.aborted) return;
        setCurrentAsset(asset);

        // Record generation usage (only if logged in)
        if (asset.scadCode && user) {
          await recordGeneration();
          const newUsage = await canGenerate();
          setUsageInfo({ remaining: newUsage.remaining, limit: newUsage.limit });
        }

      } else {
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

          // Record generation usage (only if logged in)
          if (user) {
            await recordGeneration();
            const newUsage = await canGenerate();
            setUsageInfo({ remaining: newUsage.remaining, limit: newUsage.limit });
          }
        } else if (asset.questions && asset.questions.length > 0) {
          setWorkflowStep('spec-review');
          setMessages(prev => [...prev, { role: 'model', text: "I have a few questions to finalize the design:" }]);
        } else {
          setWorkflowStep('spec-review');
          setMessages(prev => [...prev, { role: 'model', text: "I've drafted the specification. Click **Generate Code** when you're ready." }]);
        }
      }

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Error:", e);
      setWorkflowStep('idle');
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message || 'Something went wrong'}`, isError: true }]);
    }
  }, [input, workflowStep, currentAsset, messages, attachedImage, clearAttachedImage, user, canGenerate, recordGeneration]);

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

  const handleSignOut = async () => {
    await signOut();
    onShowLanding();
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-[#09090b] border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button onClick={onShowLanding} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">
                  PolyGen <span className="text-violet-400">AI</span>
                </h1>
                <span className="text-[10px] text-gray-500 font-mono">v{APP_VERSION}</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Usage Badge */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                {isProUser ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : (
                  <Zap className="w-4 h-4 text-violet-400" />
                )}
                <span className="text-xs text-gray-400">
                  {usageInfo.limit === -1 ? 'Unlimited' : `${usageInfo.remaining}/${usageInfo.limit}`}
                </span>
                {!isProUser && (
                  <button
                    onClick={onShowPricing}
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            )}

            <span className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full ${
              USE_MULTI_AGENT && isMultiAgentAvailable()
                ? 'text-violet-400 bg-violet-500/10'
                : 'text-emerald-400 bg-emerald-500/10'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                USE_MULTI_AGENT && isMultiAgentAvailable() ? 'bg-violet-400' : 'bg-emerald-400'
              }`}></span>
              {USE_MULTI_AGENT && isMultiAgentAvailable() ? 'Multi-Agent' : 'Gemini 3 Pro'}
            </span>

            {user && onShowDashboard && (
              <button
                onClick={onShowDashboard}
                className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
                title="Dashboard"
              >
                <BarChart3 className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>

            {user && (
              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )}
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

              {['processing', 'planning', 'coding', 'validating'].includes(workflowStep) && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <span className="text-sm text-gray-500">
                      {workflowStep === 'planning' && 'Planning structure...'}
                      {workflowStep === 'coding' && 'Generating code...'}
                      {workflowStep === 'validating' && 'Validating model...'}
                      {workflowStep === 'processing' && 'Thinking...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Questions Panel */}
            {currentAsset?.clarifications && currentAsset.clarifications.length > 0 && workflowStep !== 'processing' && (
              <div className="mx-3 mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-between text-amber-400 mb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Clarification needed</span>
                  </div>
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
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] rounded-md transition-colors border border-amber-500/30"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Iteration Helpers */}
            {currentAsset?.scadCode && workflowStep !== 'processing' && (
              <div className="mx-3 mb-2 p-2.5 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                <div className="flex items-center gap-2 text-violet-400 mb-2">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Refine Design</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Make it bigger",
                    "Add mounting holes",
                    "Make it thicker",
                    "Round the edges"
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
              {imagePreview && (
                <div className="mb-2 relative inline-block">
                  <img src={imagePreview} alt="Attached" className="h-16 w-auto rounded-lg border border-white/[0.1]" />
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
                  placeholder={currentAsset?.scadCode ? "Describe what to change..." : "Describe what you want to create..."}
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
                    title="Attach image"
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
                    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
                      <button
                        onClick={() => setViewMode('code')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                          viewMode === 'code' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        Code
                      </button>
                      <button
                        onClick={() => setViewMode('3d')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                          viewMode === '3d' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        3D Preview
                      </button>
                    </div>
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
                      {exported ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      {exported ? 'Downloaded' : 'Open in OpenSCAD'}
                    </button>
                  </div>
                </div>

                {/* Content Area */}
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
                    <ScadRenderer code={currentAsset.scadCode} isProUser={isProUser} />
                  )}
                </div>

                {/* Smart Quick Fixes */}
                <SmartQuickFixes
                  fixes={currentAsset.smartFixes || []}
                  onApplyFix={(fix) => handleSend(fix.prompt)}
                  isLoading={['processing', 'planning', 'coding', 'validating'].includes(workflowStep)}
                />
              </>
            ) : conceptPreview ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <img
                  src={conceptPreview}
                  alt="Concept preview"
                  className="w-64 h-64 object-contain rounded-xl border border-white/[0.1] shadow-lg mb-4"
                />
                <h2 className="text-sm font-medium text-white mb-1">Concept Preview</h2>
                {['planning', 'coding', 'validating'].includes(workflowStep) && (
                  <div className="flex items-center gap-2 text-violet-400 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Generating...</span>
                  </div>
                )}
              </div>
            ) : currentAsset?.spec ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="max-w-sm text-center">
                  <div className="p-3 bg-amber-500/10 rounded-xl mb-5 inline-block">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-lg font-medium text-white mb-2">Specification Ready</h2>
                  <button
                    onClick={handleApproveSpec}
                    disabled={workflowStep === 'processing'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-all mx-auto disabled:opacity-50"
                  >
                    {workflowStep === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Generate Code
                  </button>
                </div>
              </div>
            ) : (
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="signup"
      />

      {/* Usage Limit Modal */}
      <UsageLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={onShowPricing}
        remaining={usageInfo.remaining}
        limit={usageInfo.limit}
      />
    </ErrorBoundary>
  );
};

export default MainApp;
