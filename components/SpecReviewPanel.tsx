import React from 'react';
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { SpecData } from '../types';

interface SpecReviewPanelProps {
  spec: SpecData;
  isProcessing: boolean;
  onApprove: () => void;
}

const SpecReviewPanel: React.FC<SpecReviewPanelProps> = ({ spec, isProcessing, onApprove }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="p-3 bg-amber-500/10 rounded-xl mb-5 inline-block">
          <Sparkles className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-lg font-medium text-white mb-2">Specification Ready</h2>
        <p className="text-sm text-gray-500 mb-5">
          Review the design and generate code when ready.
        </p>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-3 mb-5 text-left">
          <pre className="text-[11px] text-gray-500 overflow-auto max-h-[180px] leading-relaxed">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </div>

        <button
          onClick={onApprove}
          disabled={isProcessing}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-all mx-auto disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Generate Code
        </button>
      </div>
    </div>
  );
};

export default SpecReviewPanel;
