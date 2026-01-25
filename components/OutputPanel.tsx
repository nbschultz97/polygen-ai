import React, { useState } from 'react';
import { GeneratedAsset, WorkflowStep } from '../types';
import OutputToolbar from './OutputToolbar';
import CodeView from './CodeView';
import ScadRenderer from './ScadRenderer';
import SmartQuickFixes from './SmartQuickFixes';
import SpecReviewPanel from './SpecReviewPanel';
import ConceptPreviewPanel from './ConceptPreviewPanel';
import EmptyOutputPanel from './EmptyOutputPanel';

interface OutputPanelProps {
  currentAsset: GeneratedAsset | null;
  workflowStep: WorkflowStep;
  conceptPreview: string | null;
  copied: boolean;
  exported: boolean;
  onCopy: () => void;
  onExport: () => void;
  onApproveSpec: () => void;
  onApplyFix: (prompt: string) => void;
}

const OutputPanel: React.FC<OutputPanelProps> = ({
  currentAsset,
  workflowStep,
  conceptPreview,
  copied,
  exported,
  onCopy,
  onExport,
  onApproveSpec,
  onApplyFix
}) => {
  const [viewMode, setViewMode] = useState<'code' | '3d'>('code');

  const isProcessing = ['processing', 'planning', 'coding', 'validating'].includes(workflowStep);

  // Code view
  if (currentAsset?.scadCode) {
    return (
      <div className="flex-1 flex flex-col bg-[#0c0c0f]">
        <OutputToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          productClass={currentAsset.spec?.product_class}
          copied={copied}
          exported={exported}
          onCopy={onCopy}
          onExport={onExport}
        />

        <div className="flex-1 overflow-hidden">
          {viewMode === 'code' ? (
            <CodeView code={currentAsset.scadCode} />
          ) : (
            <ScadRenderer code={currentAsset.scadCode} isProUser={true} />
          )}
        </div>

        <SmartQuickFixes
          fixes={currentAsset.smartFixes || []}
          onApplyFix={(fix) => onApplyFix(fix.prompt)}
          isLoading={isProcessing}
        />

        <div className="px-5 py-2 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {currentAsset.spec?.product_class && (
              <span>Type: <span className="text-gray-500">{currentAsset.spec.product_class}</span></span>
            )}
          </div>
          <span className="text-xs text-gray-600">
            {currentAsset.scadCode.split('\n').length} lines
          </span>
        </div>
      </div>
    );
  }

  // Spec review view
  if (currentAsset?.spec) {
    return (
      <div className="flex-1 flex flex-col bg-[#0c0c0f]">
        <SpecReviewPanel
          spec={currentAsset.spec}
          isProcessing={isProcessing}
          onApprove={onApproveSpec}
        />
      </div>
    );
  }

  // Concept preview view
  if (conceptPreview) {
    return (
      <div className="flex-1 flex flex-col bg-[#0c0c0f]">
        <ConceptPreviewPanel imageUrl={conceptPreview} workflowStep={workflowStep} />
      </div>
    );
  }

  // Empty state
  return (
    <div className="flex-1 flex flex-col bg-[#0c0c0f]">
      <EmptyOutputPanel />
    </div>
  );
};

export default OutputPanel;
