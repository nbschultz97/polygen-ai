import React from 'react';
import { Code, Eye, Copy, Check, ExternalLink, FileJson } from 'lucide-react';

interface OutputToolbarProps {
  viewMode: 'code' | '3d';
  setViewMode: (mode: 'code' | '3d') => void;
  productClass?: string;
  copied: boolean;
  exported: boolean;
  onCopy: () => void;
  onExport: () => void;
  onExportSession?: () => void;
}

const OutputToolbar: React.FC<OutputToolbarProps> = ({
  viewMode,
  setViewMode,
  productClass,
  copied,
  exported,
  onCopy,
  onExport,
  onExportSession,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
              viewMode === 'code' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
              viewMode === '3d' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            3D Preview
          </button>
        </div>
        {productClass && (
          <span className="px-2 py-0.5 bg-white/[0.04] rounded text-xs text-gray-500 border border-white/[0.06]">
            {productClass}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs rounded-lg transition-colors border border-white/[0.08]"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {onExportSession && (
          <button
            onClick={onExportSession}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs rounded-lg transition-colors border border-white/[0.08]"
            title="Export session for debugging"
          >
            <FileJson className="w-3.5 h-3.5" />
            Session
          </button>
        )}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-all"
        >
          {exported ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Downloaded
            </>
          ) : (
            <>
              <ExternalLink className="w-3.5 h-3.5" />
              Open in OpenSCAD
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OutputToolbar;
