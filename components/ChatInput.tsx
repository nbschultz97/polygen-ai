import React, { useRef, useCallback } from 'react';
import { Send, ImagePlus, X } from 'lucide-react';
import { ImageData } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isProcessing: boolean;
  hasExistingCode: boolean;
  attachedImage: ImageData | null;
  imagePreview: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  isProcessing,
  hasExistingCode,
  attachedImage,
  imagePreview,
  onImageUpload,
  onClearImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  const placeholder = attachedImage
    ? "Describe what you want from this image..."
    : hasExistingCode
      ? "Describe what to change..."
      : "Describe what you want to create...";

  return (
    <div className="p-3 border-t border-white/[0.06]">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img
            src={imagePreview}
            alt="Attached"
            className="h-16 w-auto rounded-lg border border-white/[0.1]"
          />
          <button
            onClick={onClearImage}
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
          placeholder={placeholder}
          className="w-full bg-white/[0.03] text-white text-sm rounded-xl border border-white/[0.08] focus:border-violet-500/50 p-3 pr-20 min-h-[72px] max-h-[140px] resize-none placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          rows={2}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-gray-400 hover:text-white rounded-lg transition-all"
            title="Attach image to recreate"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onSend}
            disabled={isProcessing || (!input.trim() && !attachedImage)}
            className="p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-gray-600 text-white rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
