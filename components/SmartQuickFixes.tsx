/**
 * SmartQuickFixes Component
 * Displays context-aware quick fix buttons based on GST and validation results
 */

import React from 'react';
import { Wrench, Maximize2, Target, Layers, AlertTriangle, Printer, Settings2 } from 'lucide-react';
import type { SmartQuickFix, QuickFixCategory } from '../types';

interface SmartQuickFixesProps {
  fixes: SmartQuickFix[];
  onApplyFix: (fix: SmartQuickFix) => void;
  isLoading?: boolean;
}

// Icon mapping by category
const categoryIcons: Record<QuickFixCategory, React.ComponentType<{ className?: string }>> = {
  tolerance: Target,
  dimension: Maximize2,
  structure: Layers,
  print: Printer,
  geometry: AlertTriangle,
};

// Color mapping by category (button styles)
const categoryColors: Record<QuickFixCategory, string> = {
  tolerance: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/30',
  dimension: 'text-green-400 hover:bg-green-500/10 border-green-500/30',
  structure: 'text-purple-400 hover:bg-purple-500/10 border-purple-500/30',
  print: 'text-orange-400 hover:bg-orange-500/10 border-orange-500/30',
  geometry: 'text-red-400 hover:bg-red-500/10 border-red-500/30',
};

// Background dot colors for category legend
const categoryDotColors: Record<QuickFixCategory, string> = {
  tolerance: 'bg-blue-400',
  dimension: 'bg-green-400',
  structure: 'bg-purple-400',
  print: 'bg-orange-400',
  geometry: 'bg-red-400',
};

const SmartQuickFixes: React.FC<SmartQuickFixesProps> = ({
  fixes,
  onApplyFix,
  isLoading = false,
}) => {
  if (!fixes || fixes.length === 0) {
    return null;
  }

  // Group fixes by category
  const groupedFixes = fixes.reduce(
    (acc, fix) => {
      if (!acc[fix.category]) {
        acc[fix.category] = [];
      }
      acc[fix.category].push(fix);
      return acc;
    },
    {} as Record<QuickFixCategory, SmartQuickFix[]>
  );

  return (
    <div className="p-3 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
          Smart Refinements
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {fixes.map((fix) => {
          const Icon = categoryIcons[fix.category] || Wrench;
          const colorClass =
            categoryColors[fix.category] || 'text-gray-400 hover:bg-white/5 border-white/10';

          return (
            <button
              key={fix.id}
              onClick={() => onApplyFix(fix)}
              disabled={isLoading}
              className={`
                group flex items-center gap-1.5 px-2.5 py-1.5
                bg-white/[0.02] border rounded-lg
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${colorClass}
              `}
              title={fix.description}
            >
              <Icon className="w-3 h-3 opacity-70 group-hover:opacity-100" />
              <span className="text-[11px] font-medium text-gray-300 group-hover:text-white">
                {fix.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Show category legend if multiple categories present */}
      {Object.keys(groupedFixes).length > 2 && (
        <div className="mt-2 pt-2 border-t border-white/[0.04] flex flex-wrap gap-3">
          {Object.entries(groupedFixes).map(([category, categoryFixes]) => (
            <div key={category} className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${categoryDotColors[category as QuickFixCategory] || 'bg-gray-400'}`}
              />
              <span className="text-[11px] text-gray-500 capitalize">{category}</span>
              <span className="text-[11px] text-gray-600">({categoryFixes.length})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartQuickFixes;
