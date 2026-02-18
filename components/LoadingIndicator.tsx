import React from 'react';
import { Bot, Loader2 } from 'lucide-react';
import type { WorkflowStep } from '../types';

interface LoadingIndicatorProps {
  workflowStep: WorkflowStep;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ workflowStep }) => {
  const getMessage = () => {
    switch (workflowStep) {
      case 'planning':
        return 'Planning structure...';
      case 'coding':
        return 'Generating code...';
      case 'validating':
        return 'Validating model...';
      default:
        return 'Thinking...';
    }
  };

  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
        <span className="text-sm text-gray-500">{getMessage()}</span>
      </div>
    </div>
  );
};

export default LoadingIndicator;
