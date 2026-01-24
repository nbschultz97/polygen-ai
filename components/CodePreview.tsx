import React, { useState, useCallback, memo } from 'react';
import { Download, Copy, Check, FileCode, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodePreviewProps {
  code: string;
  sources?: string[];
}

const SourceLink = memo(({ src, index }: { src: string; index: number }) => {
  let hostname = '';
  try {
    hostname = new URL(src).hostname;
  } catch {
    hostname = src;
  }

  return (
    <a
      key={index}
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 px-2 py-1 rounded border border-indigo-900/50 truncate max-w-[200px]"
    >
      <ExternalLink className="w-3 h-3" />
      {hostname}
    </a>
  );
});

SourceLink.displayName = 'SourceLink';

const CodePreview: React.FC<CodePreviewProps> = memo(({ code, sources }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${Date.now()}.scad`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-slate-200">OpenSCAD Source</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors"
          >
            <Download className="w-3 h-3" />
            Download .SCAD
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <SyntaxHighlighter
          language="openscad"
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem', lineHeight: '1.5', background: 'transparent' }}
          showLineNumbers={true}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {sources && sources.length > 0 && (
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <p className="text-xs text-slate-500 font-medium mb-2">Sources Referenced:</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((src, i) => (
              <SourceLink key={i} src={src} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

CodePreview.displayName = 'CodePreview';

export default CodePreview;
