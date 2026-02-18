import React, { useRef, useEffect, memo, useCallback } from 'react';
import { Send, Cpu, Bot, User, Search } from 'lucide-react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

// Memoized message component to prevent re-renders
const ChatMessage = memo(({ msg, idx: _idx }: { msg: Message; idx: number }) => (
  <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    {msg.role === 'model' && (
      <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
        <Bot className="w-4 h-4 text-indigo-400" />
      </div>
    )}

    <div
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        msg.role === 'user'
          ? 'bg-indigo-600 text-white rounded-br-none'
          : msg.isError
            ? 'bg-red-900/30 text-red-300 border border-red-800 rounded-bl-none'
            : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
      }`}
    >
      <ReactMarkdown
        components={{
          code({ node: _node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'openscad') {
              return (
                <div className="text-xs italic text-slate-500 my-1">
                  [Code displayed in preview panel]
                </div>
              );
            }
            return (
              <code className={`${className} bg-slate-800 px-1 py-0.5 rounded text-xs`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {msg.text}
      </ReactMarkdown>
    </div>

    {msg.role === 'user' && (
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shrink-0">
        <User className="w-4 h-4 text-slate-300" />
      </div>
    )}
  </div>
));

ChatMessage.displayName = 'ChatMessage';

const LoadingIndicator = memo(() => (
  <div className="flex gap-3">
    <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
      <Bot className="w-4 h-4 text-indigo-400" />
    </div>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
      </div>
      <span className="text-xs text-indigo-300 font-mono flex items-center gap-2">
        <Search className="w-3 h-3" />
        Reasoning & Searching...
      </span>
    </div>
  </div>
));

LoadingIndicator.displayName = 'LoadingIndicator';

const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
    <Cpu className="w-16 h-16 mb-4" />
    <p className="text-sm">Describe a 3D object to generate SCAD code.</p>
    <p className="text-xs mt-2">Example: "Design a parametric enclosure for an Arduino Uno"</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

const ChatArea: React.FC<ChatAreaProps> = memo(
  ({ messages, input, setInput, onSend, isLoading }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, isLoading]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSend();
        }
      },
      [onSend]
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
      },
      [setInput]
    );

    return (
      <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
          {messages.length === 0 && <EmptyState />}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} msg={msg} idx={idx} />
          ))}

          {isLoading && <LoadingIndicator />}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe the 3D model you need..."
              className="w-full bg-slate-950 text-slate-200 text-sm rounded-xl border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 pr-12 min-h-[60px] max-h-[120px] resize-none scrollbar-hide focus:outline-none"
              rows={2}
            />
            <button
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              Gemini Pro + Search Grounding
            </span>
            <span className="text-[10px] text-slate-500">Press Enter to send</span>
          </div>
        </div>
      </div>
    );
  }
);

ChatArea.displayName = 'ChatArea';

export default ChatArea;
