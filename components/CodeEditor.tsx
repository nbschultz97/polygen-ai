/**
 * Monaco Code Editor Panel
 * OpenSCAD code editor with syntax highlighting, real-time streaming, and export tools.
 */

import Editor, { type OnMount } from '@monaco-editor/react';
import { Check, Copy, Download, Edit3, Eye, Loader2, Lock, Play } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface CodeEditorProps {
  /** Current finalized SCAD code */
  code: string;
  /** Streaming partial code (shown during generation) */
  streamingCode?: string;
  /** Whether code is currently being generated */
  isGenerating?: boolean;
  /** Called when user edits code and it should be applied */
  onCodeChange?: (code: string) => void;
  /** Trigger a re-render of the 3D model */
  onRender?: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  streamingCode,
  isGenerating,
  onCodeChange,
  onRender,
}) => {
  const [editable, setEditable] = useState(false);
  const [localCode, setLocalCode] = useState(code);
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);

  // Sync external code into local state when not editing
  useEffect(() => {
    if (!editable) {
      setLocalCode(code);
    }
  }, [code, editable]);

  // During streaming, always show streaming code
  const displayCode = isGenerating && streamingCode ? streamingCode : localCode;

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register OpenSCAD-like language (based on C)
    monaco.languages.register({ id: 'openscad' });
    monaco.languages.setMonarchTokensProvider('openscad', {
      keywords: [
        'module',
        'function',
        'if',
        'else',
        'for',
        'let',
        'each',
        'intersection_for',
        'assign',
        'use',
        'include',
        'true',
        'false',
        'undef',
      ],
      builtins: [
        'cube',
        'sphere',
        'cylinder',
        'polyhedron',
        'circle',
        'square',
        'polygon',
        'text',
        'surface',
        'import',
        'linear_extrude',
        'rotate_extrude',
        'union',
        'difference',
        'intersection',
        'translate',
        'rotate',
        'scale',
        'mirror',
        'multmatrix',
        'color',
        'minkowski',
        'hull',
        'projection',
        'resize',
        'offset',
        'children',
        'echo',
        'assert',
        'render',
        'abs',
        'ceil',
        'floor',
        'round',
        'sign',
        'min',
        'max',
        'pow',
        'sqrt',
        'exp',
        'log',
        'ln',
        'sin',
        'cos',
        'tan',
        'asin',
        'acos',
        'atan',
        'atan2',
        'len',
        'str',
        'chr',
        'ord',
        'concat',
        'lookup',
        'search',
        'norm',
        'cross',
        'parent_module',
      ],
      specialVars: ['$fn', '$fa', '$fs', '$t', '$vpr', '$vpt', '$vpd', '$vpf', '$children'],
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/\$\w+/, 'variable.predefined'],
          [
            /[a-zA-Z_]\w*/,
            {
              cases: {
                '@keywords': 'keyword',
                '@builtins': 'type.identifier',
                '@default': 'identifier',
              },
            },
          ],
          [/[{}()[\]]/, 'delimiter.bracket'],
          [/[;,.]/, 'delimiter'],
          [/[<>=!]+/, 'operator'],
          [/[+*/%?:-]/, 'operator'],
          [/"[^"]*"/, 'string'],
          [/\d+\.?\d*([eE][-+]?\d+)?/, 'number'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Dark theme matching the app
    monaco.editor.defineTheme('polygen-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c792ea' },
        { token: 'type.identifier', foreground: '82aaff' },
        { token: 'variable.predefined', foreground: 'f78c6c' },
        { token: 'string', foreground: 'c3e88d' },
        { token: 'number', foreground: 'f78c6c' },
        { token: 'comment', foreground: '546e7a' },
        { token: 'operator', foreground: '89ddff' },
        { token: 'delimiter.bracket', foreground: 'ffd700' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#64748b',
        'editor.selectionBackground': '#334155',
        'editor.lineHighlightBackground': '#1e293b50',
        'editorCursor.foreground': '#a78bfa',
        'editorIndentGuide.background': '#1e293b',
      },
    });
    monaco.editor.setTheme('polygen-dark');
  };

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([displayCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.scad';
    a.click();
    URL.revokeObjectURL(url);
  }, [displayCode]);

  const handleToggleEdit = useCallback(() => {
    if (editable) {
      // Saving: push changes up
      if (localCode !== code && onCodeChange) {
        onCodeChange(localCode);
      }
      setEditable(false);
    } else {
      setLocalCode(code);
      setEditable(true);
    }
  }, [editable, localCode, code, onCodeChange]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setLocalCode(value);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#0c0c0f]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">OpenSCAD</span>
          {isGenerating && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleEdit}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors border ${
              editable
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-white/[0.04] text-gray-400 hover:text-white border-white/[0.08]'
            } disabled:opacity-40`}
            title={editable ? 'Save edits' : 'Enable editing'}
          >
            {editable ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            {editable ? 'Save' : 'Edit'}
          </button>
          {editable && localCode !== code && (
            <button
              onClick={() => {
                setLocalCode(code);
                setEditable(false);
              }}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-md transition-colors border border-white/[0.08]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-md transition-colors border border-white/[0.08]"
          >
            <Download className="w-3 h-3" />
            .scad
          </button>
          {onRender && (
            <button
              onClick={onRender}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-md transition-colors font-medium"
            >
              <Play className="w-3 h-3" />
              Render
            </button>
          )}
        </div>
      </div>

      {/* Read-only indicator */}
      {!editable && !isGenerating && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] border-b border-white/[0.04] text-[10px] text-gray-600">
          <Lock className="w-2.5 h-2.5" />
          Read-only — click Edit to modify
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          language="openscad"
          value={displayCode}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="polygen-dark"
          options={{
            readOnly: !editable || isGenerating,
            minimap: { enabled: false },
            lineNumbers: 'on',
            bracketPairColorization: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            padding: { top: 12 },
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
