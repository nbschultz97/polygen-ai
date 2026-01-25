import React from 'react';
import { RotateCcw } from 'lucide-react';

interface RefinementHelpersProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const REFINEMENT_SUGGESTIONS = [
  "The hole is too small, increase by 1mm",
  "Add mounting holes in the corners",
  "Make it thicker for more strength",
  "Add ventilation slots",
  "Round all the edges more"
];

const RefinementHelpers: React.FC<RefinementHelpersProps> = ({ onSelectSuggestion }) => {
  return (
    <div className="mx-3 mb-2 p-2.5 bg-violet-500/5 border border-violet-500/10 rounded-xl">
      <div className="flex items-center gap-2 text-violet-400 mb-2">
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wide">Refine Design</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REFINEMENT_SUGGESTIONS.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSelectSuggestion(suggestion)}
            className="px-2 py-1 bg-white/[0.04] hover:bg-violet-500/20 text-[10px] text-gray-400 hover:text-violet-300 rounded-md transition-colors border border-white/[0.06]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RefinementHelpers;
