import React, { useRef, useEffect } from 'react';
import type { Message, WorkflowStep, GeneratedAsset, ImageData } from '../types';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import EmptyChat from './EmptyChat';
import ClarificationsPanel from './ClarificationsPanel';
import RefinementHelpers from './RefinementHelpers';
import ChatInput from './ChatInput';

interface ChatPanelProps {
  messages: Message[];
  workflowStep: WorkflowStep;
  currentAsset: GeneratedAsset | null;
  input: string;
  setInput: (value: string | ((prev: string) => string)) => void;
  onSend: (overrideInput?: string) => void;
  attachedImage: ImageData | null;
  imagePreview: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  workflowStep,
  currentAsset,
  input,
  setInput,
  onSend,
  attachedImage,
  imagePreview,
  onImageUpload,
  onClearImage,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isProcessing = ['processing', 'planning', 'coding', 'validating'].includes(workflowStep);
  const showClarifications =
    currentAsset?.clarifications && currentAsset.clarifications.length > 0 && !isProcessing;
  const showRefinements = currentAsset?.scadCode && !isProcessing;

  return (
    <div className="w-[400px] min-w-[360px] flex flex-col border-r border-white/[0.06]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <EmptyChat
            onSelectTemplate={(prompt) => {
              setInput(prompt);
              onSend(prompt);
            }}
          />
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isProcessing && <LoadingIndicator workflowStep={workflowStep} />}

        <div ref={chatEndRef} />
      </div>

      {/* Clarifications Panel */}
      {showClarifications && (
        <ClarificationsPanel
          clarifications={currentAsset!.clarifications!}
          input={input}
          setInput={setInput}
          onSend={() => onSend()}
        />
      )}

      {/* Refinement Helpers */}
      {showRefinements && <RefinementHelpers onSelectSuggestion={setInput} />}

      {/* Input Area */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={() => onSend()}
        isProcessing={isProcessing}
        hasExistingCode={!!currentAsset?.scadCode}
        attachedImage={attachedImage}
        imagePreview={imagePreview}
        onImageUpload={onImageUpload}
        onClearImage={onClearImage}
      />
    </div>
  );
};

export default ChatPanel;
