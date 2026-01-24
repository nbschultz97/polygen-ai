
import React, { memo, useMemo, useCallback } from 'react';
import { SpecData } from '../types';
import { FileJson, HelpCircle, Check, AlertTriangle, Cpu } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SpecPreviewProps {
  spec: SpecData | undefined;
  questions: string[] | undefined;
  summary: string[] | undefined;
  onApprove: () => void;
  isLoading: boolean;
}

const LoadingState = memo(() => (
  <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500 gap-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="text-sm font-medium animate-pulse text-indigo-400">Architecting Specification...</p>
  </div>
));

LoadingState.displayName = 'LoadingState';

const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-600 gap-3">
    <Cpu className="w-16 h-16 opacity-20" />
    <p className="text-sm">Describe a part to generate a technical specification.</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

const QuestionItem = memo(({ question, index }: { question: string; index: number }) => (
  <li className="flex gap-3 text-sm text-slate-300">
    <span className="bg-amber-500/20 text-amber-500 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">
      {index + 1}
    </span>
    {question}
  </li>
));

QuestionItem.displayName = 'QuestionItem';

const SummaryItem = memo(({ item }: { item: string }) => (
  <li className="flex items-start gap-2 text-xs bg-slate-900 p-2 rounded border border-slate-800 text-slate-300">
    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
    {item}
  </li>
));

SummaryItem.displayName = 'SummaryItem';

const SpecPreview: React.FC<SpecPreviewProps> = memo(({ spec, questions, summary, onApprove, isLoading }) => {
  const hasUnknowns = useMemo(() => {
    if (!spec) return false;
    return JSON.stringify(spec).includes('"UNKNOWN"');
  }, [spec]);

  const specJson = useMemo(() => {
    if (!spec) return '';
    return JSON.stringify(spec, null, 2);
  }, [spec]);

  const handleApprove = useCallback(() => {
    onApprove();
  }, [onApprove]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!spec && !questions) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-sm">Architecture Blueprint</h2>
        </div>
        {spec && !hasUnknowns && (
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-green-500/20"
          >
            <Check className="w-4 h-4" />
            APPROVE SPEC
          </button>
        )}
        {hasUnknowns && (
          <span className="flex items-center gap-1 px-3 py-1 bg-amber-900/30 text-amber-500 text-xs font-medium rounded-full border border-amber-900/50">
            <AlertTriangle className="w-3 h-3" />
            Clarification Needed
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Questions Section */}
        {questions && questions.length > 0 && (
          <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-amber-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Clarification Questions</h3>
            </div>
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <QuestionItem key={i} question={q} index={i} />
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500 italic">Please answer these in the chat to update the spec.</p>
          </div>
        )}

        {/* Summary Section */}
        {summary && summary.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Summary</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {summary.map((item, i) => (
                <SummaryItem key={i} item={item} />
              ))}
            </ul>
          </div>
        )}

        {/* JSON Spec Section */}
        {spec && (
          <div className="space-y-2 h-full flex flex-col">
            <div className="flex justify-between items-end">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical Specification (JSON)</h3>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e] shadow-inner">
              <SyntaxHighlighter
                language="json"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.8rem', background: 'transparent' }}
                wrapLines={true}
              >
                {specJson}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SpecPreview.displayName = 'SpecPreview';

export default SpecPreview;
