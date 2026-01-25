import React from 'react';
import { Loader2 } from 'lucide-react';
import { WorkflowStep } from '../types';

interface ConceptPreviewPanelProps {
  imageUrl: string;
  workflowStep: WorkflowStep;
}

const ConceptPreviewPanel: React.FC<ConceptPreviewPanelProps> = ({ imageUrl, workflowStep }) => {
  const getMessage = () => {
    switch (workflowStep) {
      case 'planning':
        return 'Planning structure...';
      case 'coding':
        return 'Generating code...';
      case 'validating':
        return 'Validating model...';
      default:
        return null;
    }
  };

  const message = getMessage();
  const isLoading = ['planning', 'coding', 'validating'].includes(workflowStep);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mb-4">
          <img
            src={imageUrl}
            alt="Concept preview"
            className="w-64 h-64 object-contain rounded-xl border border-white/[0.1] shadow-lg mx-auto"
          />
        </div>
        <h2 className="text-sm font-medium text-white mb-1">Concept Preview</h2>
        <p className="text-xs text-gray-500 mb-3">
          AI-generated concept of your design
        </p>
        {isLoading && message && (
          <div className="flex items-center justify-center gap-2 text-violet-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptPreviewPanel;
