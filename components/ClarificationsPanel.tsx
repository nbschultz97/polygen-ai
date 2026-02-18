import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { ClarificationQuestion } from '../types';

interface ClarificationsPanelProps {
  clarifications: ClarificationQuestion[];
  input: string;
  setInput: (value: string | ((prev: string) => string)) => void;
  onSend: () => void;
}

const ClarificationsPanel: React.FC<ClarificationsPanelProps> = ({
  clarifications,
  input,
  setInput,
  onSend,
}) => {
  return (
    <div className="mx-3 mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-center justify-between text-amber-400 mb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          <span className="text-xs font-medium">Clarification needed</span>
        </div>
        <span className="text-[10px] text-amber-400/60">
          Click answers to add to input, then send
        </span>
      </div>
      <div className="space-y-3">
        {clarifications.map((clarification, i) => (
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
                    onClick={() =>
                      setInput((prev) => {
                        const entry = `${i + 1}. ${suggestion}`;
                        if (prev.includes(entry)) return prev;
                        return prev ? `${prev}\n${entry}` : entry;
                      })
                    }
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] rounded-md transition-colors border border-amber-500/30 hover:border-amber-400/50"
                  >
                    {suggestion}
                  </button>
                ))}
                <button
                  onClick={() => setInput((prev) => (prev ? `${prev}\n${i + 1}. ` : `${i + 1}. `))}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 text-[10px] rounded-md transition-colors border border-white/[0.08]"
                >
                  Custom...
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {input.trim() && (
        <button
          onClick={onSend}
          className="mt-3 w-full py-2 bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 text-xs font-medium rounded-lg transition-colors border border-amber-500/40"
        >
          Send All Answers
        </button>
      )}
    </div>
  );
};

export default ClarificationsPanel;
