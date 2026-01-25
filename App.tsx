import React, { useState, useCallback, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader from './components/AppHeader';
import ChatPanel from './components/ChatPanel';
import OutputPanel from './components/OutputPanel';
import SettingsPanel from './components/SettingsPanel';
import { Message, GeneratedAsset, WorkflowStep } from './types';
import { processArchitectRequest, ImageData } from './services/geminiService';
import { orchestrateGeneration, isMultiAgentAvailable } from './services/agentOrchestrator';
import { exportToOpenSCAD, copyToClipboard } from './services/openscadExport';
import { useImageUpload } from './hooks/useImageUpload';

const USE_MULTI_AGENT = process.env.USE_MULTI_AGENT === 'true';

const App: React.FC = () => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentAsset, setCurrentAsset] = useState<GeneratedAsset | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');

  // UI state
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conceptPreview, setConceptPreview] = useState<string | null>(null);

  // Image upload hook
  const {
    attachedImage,
    imagePreview,
    handleImageUpload,
    clearAttachedImage
  } = useImageUpload();

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Send message handler
  const handleSend = useCallback(async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if ((!textToSend.trim() && !attachedImage) || workflowStep === 'processing') return;

    // Sanitize input
    const sanitizedInput = textToSend
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!sanitizedInput) return;

    // Setup abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMsg: Message = {
      role: 'user',
      text: attachedImage ? `[Image attached] ${sanitizedInput}` : sanitizedInput
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Store image and clear preview
    const imageToSend = attachedImage;
    clearAttachedImage();

    // Clear clarifications when user responds
    if (currentAsset?.clarifications) {
      setCurrentAsset(prev => prev ? { ...prev, clarifications: undefined } : null);
    }

    // Clear concept preview for fresh generation
    if (!currentAsset?.scadCode) {
      setConceptPreview(null);
    }

    setWorkflowStep('processing');

    try {
      const history = messages.map(m => m.text);

      if (USE_MULTI_AGENT && isMultiAgentAvailable()) {
        // Multi-agent pipeline
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
                setMessages(prev => [...prev, {
                  role: 'model',
                  text: "Done! Your OpenSCAD code is ready. Click **Open in OpenSCAD** to edit and render it."
                }]);
              } else {
                setMessages(prev => [...prev, {
                  role: 'model',
                  text: `Validation issues: ${result.errors.join(', ')}`
                }]);
              }
            },
            onSmartFixesGenerated: (fixes) => console.log('Smart fixes generated:', fixes.length),
            onError: (error, step) => {
              console.error(`Error in ${step}:`, error);
              setMessages(prev => [...prev, {
                role: 'model',
                text: `Error during ${step}: ${error.message}`,
                isError: true
              }]);
            }
          },
          abortControllerRef.current.signal
        );

        if (abortControllerRef.current?.signal.aborted) return;
        setCurrentAsset(asset);

      } else {
        // Legacy single-agent flow
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
          setMessages(prev => [...prev, {
            role: 'model',
            text: "Done! Your OpenSCAD code is ready. Click **Open in OpenSCAD** to edit and render it."
          }]);
        } else if (asset.questions && asset.questions.length > 0) {
          setWorkflowStep('spec-review');
          setMessages(prev => [...prev, {
            role: 'model',
            text: "I have a few questions to finalize the design:"
          }]);
        } else {
          setWorkflowStep('spec-review');
          setMessages(prev => [...prev, {
            role: 'model',
            text: "I've drafted the specification. Click **Generate Code** when you're ready."
          }]);
        }
      }

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Error:", e);
      setWorkflowStep('idle');
      setMessages(prev => [...prev, {
        role: 'model',
        text: `Error: ${e.message || 'Something went wrong'}`,
        isError: true
      }]);
    }
  }, [input, workflowStep, currentAsset, messages, attachedImage, clearAttachedImage]);

  // Approve spec handler
  const handleApproveSpec = useCallback(() => {
    handleSend("APPROVE_SPEC");
  }, [handleSend]);

  // Copy handler
  const handleCopy = useCallback(async () => {
    if (currentAsset?.scadCode) {
      const success = await copyToClipboard(currentAsset.scadCode);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [currentAsset]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (currentAsset?.scadCode) {
      const result = await exportToOpenSCAD(currentAsset.scadCode, currentAsset.spec);
      if (result.success) {
        setExported(true);
        setTimeout(() => setExported(false), 3000);
      }
    }
  }, [currentAsset]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 font-sans">
        <AppHeader
          useMultiAgent={USE_MULTI_AGENT}
          onOpenSettings={() => setShowSettings(true)}
        />

        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

        <main className="flex-1 flex overflow-hidden">
          <ChatPanel
            messages={messages}
            workflowStep={workflowStep}
            currentAsset={currentAsset}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            attachedImage={attachedImage}
            imagePreview={imagePreview}
            onImageUpload={handleImageUpload}
            onClearImage={clearAttachedImage}
          />

          <OutputPanel
            currentAsset={currentAsset}
            workflowStep={workflowStep}
            conceptPreview={conceptPreview}
            copied={copied}
            exported={exported}
            onCopy={handleCopy}
            onExport={handleExport}
            onApproveSpec={handleApproveSpec}
            onApplyFix={(prompt) => handleSend(prompt)}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
