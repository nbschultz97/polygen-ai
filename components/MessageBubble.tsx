import React from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-violet-600' : message.isError ? 'bg-red-500/20' : 'bg-white/[0.06]'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className={`w-3.5 h-3.5 ${message.isError ? 'text-red-400' : 'text-violet-400'}`} />
        )}
      </div>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : message.isError
              ? 'bg-red-500/10 text-red-300 border border-red-500/20 rounded-bl-sm'
              : 'bg-white/[0.04] text-gray-300 border border-white/[0.06] rounded-bl-sm'
        }`}
      >
        <ReactMarkdown
          components={{
            strong: ({ children }) => <span className="font-semibold text-white">{children}</span>,
          }}
        >
          {message.text}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MessageBubble;
