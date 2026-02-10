/**
 * Main App Component
 * Authenticated app experience with usage tracking and limits
 */

import {
  BarChart3,
  Bot,
  Box,
  Check,
  ChevronRight,
  Code,
  Cpu,
  Crown,
  ExternalLink,
  Eye,
  FileJson,
  HelpCircle,
  ImagePlus,
  Loader2,
  LogOut,
  MessageCircle,
  Redo2,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Undo2,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  isMultiAgentAvailable,
  orchestrateGeneration,
  redoHistory,
  runVisualCritique,
  undoHistory,
} from '../services/agentOrchestrator';
import type { ImageData } from '../services/geminiService';
import { APP_VERSION, processArchitectRequest } from '../services/geminiService';
import { exportSession, exportToOpenSCAD } from '../services/openscadExport';
import type { GeneratedAsset, Message, STLFileData, WorkflowStep } from '../types';
import { useAuth } from './AuthContext';
import AuthModal from './AuthModal';
import DesignTemplates from './DesignTemplates';
import ErrorBoundary from './ErrorBoundary';
import SettingsPanel from './SettingsPanel';
import SmartQuickFixes from './SmartQuickFixes';
import StlImportModal from './StlImportModal';
import UsageLimitModal from './UsageLimitModal';

// Lazy-load heavy components (Monaco editor ~800KB, Three.js viewer ~500KB)
const CodeEditor = React.lazy(() => import('./CodeEditor'));
const ScadRenderer = React.lazy(() => import('./ScadRenderer'));

// Check if multi-agent pipeline is enabled
const USE_MULTI_AGENT =
  import.meta.env.VITE_USE_MULTI_AGENT === 'true' || process.env.USE_MULTI_AGENT === 'true';

interface MainAppProps {
  onShowPricing: () => void;
  onShowLanding: () => void;
  onShowDashboard?: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ onShowPricing, onShowLanding, onShowDashboard }) => {
  const { user, profile: _profile, signOut, canGenerate, recordGeneration, isProUser } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentAsset, setCurrentAsset] = useState<GeneratedAsset | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [exported, setExported] = useState(false);
  const [_viewMode, setViewMode] = useState<'code' | '3d'>('code');

  // Mobile UI States
  const [mobileTab, setMobileTab] = useState<'chat' | 'code' | 'preview'>('chat');
  const [showStlImport, setShowStlImport] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [attachedImage, setAttachedImage] = useState<ImageData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [conceptPreview, setConceptPreview] = useState<string | null>(null);

  // Auth modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState({ remaining: 0, limit: 0 });

  // Streaming code state - shows progressive generation
  const [streamingCode, setStreamingCode] = useState('');

  // STL Remix: Uploaded STL file for modification workflow
  const [attachedSTL, setAttachedSTL] = useState<STLFileData | null>(null);

  // Debug trace: black-box recorder for session exports
  const [debugTrace, setDebugTrace] = useState<
    { timestamp: number; type: 'stdout' | 'stderr' | 'system'; message: string }[]
  >([]);
  const pushTrace = useCallback((type: 'stdout' | 'stderr' | 'system', message: string) => {
    setDebugTrace((prev) => [...prev.slice(-200), { timestamp: Date.now(), type, message }]);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stlInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Visual Critic: auto-trigger after render when _pendingVisualCritique is set
  const visualCriticRunningRef = useRef(false);
  const handleSendRef = useRef<(text: string) => void>(() => {});
  const handleRenderComplete = useCallback(
    async (screenshotBase64: string) => {
      const asset = currentAsset;
      if (!asset || !(asset as any)._pendingVisualCritique || visualCriticRunningRef.current)
        return;

      // Clear the flag and prevent re-entry
      (asset as any)._pendingVisualCritique = false;
      visualCriticRunningRef.current = true;

      try {
        console.log('Visual Critic: auto-triggering post-render analysis');
        const prompt = messages.find((m) => m.role === 'user')?.text || '';
        const result = await runVisualCritique(screenshotBase64, prompt);

        if (!result.approved) {
          console.log(`Visual Critic: disapproved with ${result.feedback.length} issues`);
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: `Visual Critic detected issues:\n${result.feedback.map((f) => `- ${f}`).join('\n')}\n\nAttempting automatic repair...`,
            },
          ]);
          // Feed feedback back as a refinement prompt
          const feedbackPrompt = `VISUAL CRITIC REPAIR: Fix these issues in the current model:\n${result.feedback.join('\n')}`;
          handleSendRef.current(feedbackPrompt);
        } else {
          console.log('Visual Critic: render approved');
        }
      } catch (err) {
        console.warn('Visual Critic: auto-trigger failed (non-blocking):', err);
      } finally {
        visualCriticRunningRef.current = false;
      }
    },
    [currentAsset, messages]
  );

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        mimeType: file.type,
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

  // STL Remix: Handle STL file upload
  const handleSTLUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.stl')) {
      alert('Please upload an STL file (.stl)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('STL file must be less than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      setAttachedSTL({
        data: new Uint8Array(arrayBuffer),
        filename: file.name,
        size: file.size,
      });
    };
    reader.readAsArrayBuffer(file);

    if (stlInputRef.current) {
      stlInputRef.current.value = '';
    }
  }, []);

  const clearAttachedSTL = useCallback(() => {
    setAttachedSTL(null);
  }, []);

  const handleSend = useCallback(
    async (overrideInput?: string) => {
      const textToSend = overrideInput || input;
      if ((!textToSend.trim() && !attachedImage) || workflowStep === 'processing') return;

      // SECURITY: Require authentication for all generations
      // This prevents anonymous API abuse
      if (!user) {
        // Show error message prompting login
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Please sign in to generate 3D models. Your designs will be saved and you get 5 free generations to start!',
          },
        ]);
        return;
      }

      // Check usage limits
      const usage = await canGenerate();
      if (!usage.allowed) {
        setUsageInfo({ remaining: usage.remaining, limit: usage.limit });
        setShowLimitModal(true);
        return;
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

      const userMsg: Message = {
        role: 'user',
        text: attachedSTL
          ? `[STL: ${attachedSTL.filename}] ${sanitizedInput}`
          : attachedImage
            ? `[Image attached] ${sanitizedInput}`
            : sanitizedInput,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      const imageToSend = attachedImage;
      const stlToSend = attachedSTL;
      clearAttachedImage();
      clearAttachedSTL();

      // Clear clarifications synchronously for the asset we'll pass to orchestrator
      // This avoids race condition with async state update
      const assetForOrchestrator = currentAsset
        ? { ...currentAsset, clarifications: undefined }
        : undefined;

      if (currentAsset?.clarifications) {
        setCurrentAsset((prev) => (prev ? { ...prev, clarifications: undefined } : null));
      }

      if (!currentAsset?.scadCode) {
        setConceptPreview(null);
      }

      // Clear streaming state for new generation
      setStreamingCode('');

      setWorkflowStep('processing');

      try {
        const history = messages.map((m) => m.text);

        if (USE_MULTI_AGENT && isMultiAgentAvailable()) {
          const asset = await orchestrateGeneration(
            {
              userPrompt: sanitizedInput,
              existingAsset: assetForOrchestrator,
              isEdit: !!currentAsset?.scadCode,
              imageData: imageToSend || undefined,
              stlFile: stlToSend || undefined,
              conversationHistory: history,
            },
            {
              onStepChange: (step) => {
                setWorkflowStep(step);
                pushTrace('system', `Pipeline step: ${step}`);
              },
              onGSTGenerated: (gst) => {
                console.log('GST generated:', gst.name);
                setConceptPreview(null);
              },
              onPreviewImageGenerated: (imageUrl) => {
                console.log('Preview image generated');
                setConceptPreview(imageUrl);
              },
              onCodeGenerated: (code) => {
                setStreamingCode(''); // Clear streaming state on completion
                console.log('Code generated:', code.length, 'chars');
                pushTrace('system', `Code generated: ${code.length} chars`);
              },
              onCodeChunk: (_chunk, fullText) => {
                // Update streaming code display in real-time
                setStreamingCode(fullText);
              },
              onValidationComplete: (result) => {
                pushTrace(
                  'system',
                  `Validation: success=${result.success}, manifold=${result.isManifold}, errors=${result.errors?.length ?? 0}`
                );
                // SOTA: P_succ calculation for quality gating
                // P_succ = M * (0.65 * Sv + 0.35 * Sd)
                const manifoldFactor = result.isManifold ? 1.0 : 0.0;
                const sv = result.volume ? Math.min(1.0, 1.0) : 0.8; // Placeholder for Sv similarity
                const sd = result.gstMatch ? 1.0 : 0.6; // Placeholder for Sd match

                // Composite score
                const pSucc = manifoldFactor * (0.65 * sv + 0.35 * sd);

                console.log(
                  `Validation Complete: P_succ = ${pSucc.toFixed(2)} (M:${manifoldFactor}, Sv:${sv}, Sd:${sd})`
                );

                if (result.success && pSucc >= 0.8) {
                  // Only add message if it's the first time or something changed significantly
                  // To avoid "Done!" loops
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (
                      lastMsg?.role === 'model' &&
                      lastMsg.text.includes('3D model is rendering now')
                    ) {
                      return prev;
                    }
                    return [
                      ...prev,
                      {
                        role: 'model',
                        text: 'Geometric validation passed. Your 3D model is rendering now.',
                      },
                    ];
                  });
                } else if (!result.isManifold) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'model',
                      text: '⚠️ NON-MANIFOLD GEOMETRY: The model has "holes" or self-intersections. I will attempt a repair.',
                      isError: true,
                    },
                  ]);
                } else {
                  setMessages((prev) => [
                    ...prev,
                    { role: 'model', text: `Design feedback: ${result.errors.join(', ')}` },
                  ]);
                }
              },
              onSmartFixesGenerated: (fixes) => console.log('Smart fixes generated:', fixes.length),
              onError: (error, step) => {
                pushTrace('stderr', `Error in ${step}: ${error.message}`);
                console.error(`Error in ${step}:`, error);
                setMessages((prev) => [
                  ...prev,
                  { role: 'model', text: `Error during ${step}: ${error.message}`, isError: true },
                ]);
              },
            },
            abortControllerRef.current.signal
          );

          if (abortControllerRef.current?.signal.aborted) return;
          setCurrentAsset(asset);

          // Auto-switch to 3D view AFTER asset is set (avoids race condition)
          if (asset.scadCode && !asset.clarifications) {
            setViewMode('3d');
            if (isMobile) {
              setMobileTab('preview');
            }
          }

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
            setMessages((prev) => [
              ...prev,
              {
                role: 'model',
                text: 'Done! Your OpenSCAD code is ready. Click **Open in OpenSCAD** to edit and render it.',
              },
            ]);

            // Record generation usage (only if logged in)
            if (user) {
              await recordGeneration();
              const newUsage = await canGenerate();
              setUsageInfo({ remaining: newUsage.remaining, limit: newUsage.limit });
            }
          } else if (asset.questions && asset.questions.length > 0) {
            setWorkflowStep('spec-review');
            setMessages((prev) => [
              ...prev,
              { role: 'model', text: 'I have a few questions to finalize the design:' },
            ]);
          } else {
            setWorkflowStep('spec-review');
            setMessages((prev) => [
              ...prev,
              {
                role: 'model',
                text: "I've drafted the specification. Click **Generate Code** when you're ready.",
              },
            ]);
          }
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.error('Error:', e);
        setWorkflowStep('idle');
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: `Error: ${e.message || 'Something went wrong'}`, isError: true },
        ]);
      }
    },
    [
      input,
      workflowStep,
      currentAsset,
      messages,
      attachedImage,
      clearAttachedImage,
      user,
      canGenerate,
      recordGeneration,
    ]
  );

  // Keep ref in sync for Visual Critic auto-trigger
  handleSendRef.current = handleSend;

  const handleApproveSpec = useCallback(() => {
    handleSend('APPROVE_SPEC');
  }, [handleSend]);

  const handleExport = useCallback(async () => {
    if (currentAsset?.scadCode) {
      const result = await exportToOpenSCAD(currentAsset.scadCode, currentAsset.spec);
      if (result.success) {
        setExported(true);
        setTimeout(() => setExported(false), 3000);
      }
    }
  }, [currentAsset]);

  // Export session for debugging and back-briefs
  // SOTA Diagnostic Export: Includes all quantitative metrics for analysis
  const handleExportSession = useCallback(async () => {
    const vr = currentAsset?.validationResult;
    const result = await exportSession({
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      conversation: messages.map((m) => ({
        role: m.role,
        text: m.text,
      })),
      generatedCode: currentAsset?.scadCode,
      gst: currentAsset?.gst,
      validationResult: vr
        ? {
            success: vr.success,
            errors: vr.errors,
            warnings: vr.warnings,
            triangleCount: vr.triangleCount,
            isManifold: vr.isManifold,
            // SOTA Quantitative Metrics
            volume: vr.volume,
            boundingBox: vr.boundingBox as {
              min: [number, number, number];
              max: [number, number, number];
            },
            gstMatch: vr.gstMatch,
            gstDeviationPercent: vr.gstDeviationPercent,
            pSucc: vr.pSucc,
            sv: vr.sv,
            sd: vr.sd,
          }
        : undefined,
      // SOTA Visual Critic results (if available)
      visualCritique: (vr as any)?.visualCritique
        ? {
            approved: (vr as any).visualCritique.approved,
            confidence: (vr as any).visualCritique.confidence,
            issues: (vr as any).visualCritique.issues,
            suggestions: (vr as any).visualCritique.suggestions,
          }
        : undefined,
      // Pipeline diagnostics
      pipeline: {
        mode: currentAsset?.gst ? 'multi-agent' : 'unified',
        smartFixCount: currentAsset?.smartFixes?.length ?? 0,
      },
      // Code history with GST for each version
      codeHistory: currentAsset?.history?.map((h) => ({
        code: h.code,
        prompt: h.prompt,
        timestamp: h.timestamp,
        gst: h.gst,
      })),
      // Black-box debug trace
      debug_trace: debugTrace,
    });
    if (result.success) {
      console.log('Session exported:', result.filePath);
    }
  }, [messages, currentAsset]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (!currentAsset) return;
    const previousState = undoHistory(currentAsset);
    if (previousState) {
      setCurrentAsset(previousState);
      setMessages((prev) => [...prev, { role: 'model', text: 'Reverted to previous version.' }]);
    }
  }, [currentAsset]);

  const handleRedo = useCallback(() => {
    if (!currentAsset) return;
    const nextState = redoHistory(currentAsset);
    if (nextState) {
      setCurrentAsset(nextState);
      setMessages((prev) => [...prev, { role: 'model', text: 'Restored next version.' }]);
    }
  }, [currentAsset]);

  // Check if undo/redo are available
  const canUndo = currentAsset?.history && (currentAsset.currentHistoryIndex ?? 0) > 0;
  const canRedo =
    currentAsset?.history &&
    (currentAsset.currentHistoryIndex ?? 0) < currentAsset.history.length - 1;

  // Code editor: bidirectional sync
  const handleCodeEditorChange = useCallback(
    (newCode: string) => {
      if (currentAsset) {
        setCurrentAsset({
          ...currentAsset,
          scadCode: newCode,
          history: [
            ...(currentAsset.history || []),
            {
              code: newCode,
              gst: currentAsset.gst,
              prompt: 'Manual code edit',
              timestamp: Date.now(),
            },
          ],
          currentHistoryIndex: currentAsset.history?.length ?? 0,
        });
      }
    },
    [currentAsset]
  );

  // Code editor: trigger render
  const handleCodeEditorRender = useCallback(() => {
    setViewMode('3d');
    if (isMobile) setMobileTab('preview');
  }, [isMobile]);

  // STL Import: insert converted code
  const handleStlImport = useCallback(
    (scadCode: string) => {
      const newAsset: GeneratedAsset = {
        ...(currentAsset || {}),
        scadCode,
        history: [
          ...(currentAsset?.history || []),
          {
            code: scadCode,
            gst: currentAsset?.gst,
            prompt: 'STL import conversion',
            timestamp: Date.now(),
          },
        ],
        currentHistoryIndex: currentAsset?.history?.length ?? 0,
      };
      setCurrentAsset(newAsset);
      setViewMode('code');
      if (isMobile) setMobileTab('code');
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'STL file converted to OpenSCAD polyhedron code. You can edit it in the code editor or render the 3D preview.',
        },
      ]);
    },
    [currentAsset, isMobile]
  );

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
                  {usageInfo.limit === -1
                    ? 'Unlimited'
                    : `${usageInfo.remaining}/${usageInfo.limit}`}
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

            <span
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full ${
                USE_MULTI_AGENT && isMultiAgentAvailable()
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-emerald-400 bg-emerald-500/10'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  USE_MULTI_AGENT && isMultiAgentAvailable() ? 'bg-violet-400' : 'bg-emerald-400'
                }`}
              ></span>
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

        <main className="flex-1 flex overflow-hidden relative">
          {/* Mobile Tab Switcher (Floating) */}
          <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-slate-900/90 backdrop-blur border border-white/10 rounded-full p-1 shadow-xl">
            <button
              onClick={() => setMobileTab('chat')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all ${mobileTab === 'chat' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setMobileTab('code')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all ${mobileTab === 'code' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}
            >
              <Code className="w-3.5 h-3.5" />
              Code
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all ${mobileTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              3D
            </button>
          </div>

          {/* Left Panel - Chat */}
          <div
            className={`
             flex flex-col border-r border-white/[0.06] bg-[#09090b] transition-all duration-300
             md:w-[30%] md:min-w-[320px] md:relative
             ${isMobile ? 'absolute inset-0 z-10' : ''}
             ${isMobile && mobileTab !== 'chat' ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
          `}
          >
            {/* Messages - add top padding on mobile for floating tab switcher */}
            <div className="flex-1 overflow-y-auto p-4 pt-14 md:pt-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col h-full">
                  <div className="flex flex-col items-center justify-center text-center px-6 py-8">
                    <div className="p-3 bg-violet-500/10 rounded-xl mb-4">
                      <Cpu className="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 className="text-base font-medium text-white mb-1">
                      AI-Powered 3D Modeling
                    </h2>
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
            {currentAsset?.clarifications &&
              currentAsset.clarifications.length > 0 &&
              workflowStep !== 'processing' && (
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
                          <span className="text-amber-400/60 font-mono text-xs shrink-0">
                            {i + 1}.
                          </span>
                          <span className="text-xs">{clarification.question}</span>
                        </div>
                        {clarification.suggestions && clarification.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 ml-4">
                            {clarification.suggestions.map((suggestion, j) => (
                              <button
                                key={j}
                                onClick={() =>
                                  setInput((prev) =>
                                    prev
                                      ? `${prev}\n${i + 1}. ${suggestion}`
                                      : `${i + 1}. ${suggestion}`
                                  )
                                }
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
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    Refine Design
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Make it bigger',
                    'Add mounting holes',
                    'Make it thicker',
                    'Round the edges',
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
              {attachedSTL && (
                <div className="mb-2 relative inline-flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <Box className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-violet-300 font-medium">
                    {attachedSTL.filename} ({(attachedSTL.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    onClick={clearAttachedSTL}
                    className="p-0.5 bg-red-500 hover:bg-red-400 rounded-full text-white transition-colors ml-1"
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
                  placeholder={
                    currentAsset?.scadCode
                      ? 'Describe what to change...'
                      : 'Describe what you want to create...'
                  }
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
                  <input
                    ref={stlInputRef}
                    type="file"
                    accept=".stl"
                    onChange={handleSTLUpload}
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
                    onClick={() => stlInputRef.current?.click()}
                    disabled={workflowStep === 'processing'}
                    className="p-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-gray-400 hover:text-white rounded-lg transition-all"
                    title="Upload STL to remix"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowStlImport(true)}
                    disabled={workflowStep === 'processing'}
                    className="p-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-gray-400 hover:text-violet-300 rounded-lg transition-all"
                    title="Import STL as Code"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={
                      workflowStep === 'processing' ||
                      (!input.trim() && !attachedImage && !attachedSTL)
                    }
                    className="p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-gray-600 text-white rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Code Editor */}
          <div
            className={`
             flex flex-col border-r border-white/[0.06] bg-[#0f172a] transition-all duration-300
             md:w-[35%] md:relative
             ${isMobile ? 'absolute inset-0 z-10' : ''}
             ${isMobile && mobileTab !== 'code' ? 'hidden' : ''}
          `}
          >
            {currentAsset?.scadCode || streamingCode ? (
              <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}>
              <CodeEditor
                code={currentAsset?.scadCode || ''}
                streamingCode={streamingCode}
                isGenerating={['processing', 'planning', 'coding', 'validating'].includes(
                  workflowStep
                )}
                onCodeChange={handleCodeEditorChange}
                onRender={handleCodeEditorRender}
              />
              </React.Suspense>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center pt-14 md:pt-8">
                <div className="p-3 bg-white/[0.03] rounded-xl mb-4">
                  <Code className="w-10 h-10 text-gray-700" />
                </div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Code Editor</h2>
                <p className="text-xs text-gray-600 max-w-[200px]">
                  Generated OpenSCAD code will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - 3D Preview */}
          <div
            className={`
             flex-1 flex flex-col bg-[#0c0c0f] transition-all duration-300
             ${isMobile ? 'absolute inset-0 z-10' : ''}
             ${isMobile && mobileTab !== 'preview' ? 'translate-x-[100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
          `}
          >
            {currentAsset?.scadCode ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 pt-14 md:pt-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-gray-400 font-medium">3D Preview</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* History Navigation */}
                    {currentAsset?.history && currentAsset.history.length > 1 && (
                      <div className="flex items-center gap-1 mr-1 border-r border-white/[0.08] pr-2">
                        <button
                          onClick={handleUndo}
                          disabled={!canUndo}
                          className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white rounded-lg transition-colors border border-white/[0.08]"
                          title="Undo"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleRedo}
                          disabled={!canRedo}
                          className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white rounded-lg transition-colors border border-white/[0.08]"
                          title="Redo"
                        >
                          <Redo2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-gray-500 ml-1 hidden sm:inline">
                          {(currentAsset.currentHistoryIndex ?? 0) + 1}/
                          {currentAsset.history.length}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={handleExportSession}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs rounded-lg transition-colors border border-white/[0.08]"
                      title="Export session"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-all"
                      title="Download for OpenSCAD"
                    >
                      {exported ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {exported ? 'Downloaded' : 'OpenSCAD'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3D Content */}
                <div className="flex-1 overflow-hidden">
                  <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}>
                  <ScadRenderer
                    code={currentAsset.scadCode}
                    isProUser={isProUser}
                    uploadedStlData={currentAsset.uploadedStlData}
                    onRenderComplete={handleRenderComplete}
                  />
                  </React.Suspense>
                </div>

                {/* Smart Quick Fixes */}
                <SmartQuickFixes
                  fixes={currentAsset.smartFixes || []}
                  onApplyFix={(fix) => handleSend(fix.prompt)}
                  isLoading={['processing', 'planning', 'coding', 'validating'].includes(
                    workflowStep
                  )}
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

      {/* STL Import Modal */}
      <StlImportModal
        isOpen={showStlImport}
        onClose={() => setShowStlImport(false)}
        onImport={handleStlImport}
      />

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
