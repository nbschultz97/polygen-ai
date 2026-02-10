/**
 * STL Import Modal
 * Upload an STL file and convert it to OpenSCAD polyhedron code
 */

import { AlertTriangle, Box, FileCode, Loader2, Upload, X } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { convertStlToScad, getStlInfo, type StlParseInfo } from '../services/stlToScadConverter';

interface StlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (scadCode: string) => void;
}

const StlImportModal: React.FC<StlImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [stlData, setStlData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileInfo, setFileInfo] = useState<StlParseInfo | null>(null);
  const [simplify, setSimplify] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Please select an STL file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File too large (max 100MB)');
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer);
      setStlData(data);
      try {
        const info = getStlInfo(data);
        setFileInfo(info);
        // Auto-enable simplify for large meshes
        if (info.triangleCount > 10000) {
          setSimplify(true);
        }
      } catch {
        setError('Failed to parse STL file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleConvert = useCallback(() => {
    if (!stlData) return;
    setConverting(true);
    setError(null);

    // Use setTimeout to not block UI
    setTimeout(() => {
      try {
        const modelName = fileName
          .replace(/\.stl$/i, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^(\d)/, '_$1');

        const result = convertStlToScad(stlData, { simplify, modelName });
        onImport(result.scadCode);
        handleReset();
        onClose();
      } catch (e: any) {
        setError(e.message || 'Conversion failed');
      } finally {
        setConverting(false);
      }
    }, 50);
  }, [stlData, simplify, fileName, onImport, onClose]);

  const handleReset = () => {
    setStlData(null);
    setFileName('');
    setFileInfo(null);
    setSimplify(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0c0c0f] border border-white/[0.08] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Import STL as Code</h2>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Upload Area */}
          {!stlData ? (
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/[0.1] hover:border-violet-500/40 rounded-xl cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-gray-500" />
              <div className="text-center">
                <p className="text-sm text-gray-300">Drop STL file or click to browse</p>
                <p className="text-xs text-gray-600 mt-1">Binary and ASCII STL supported</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <>
              {/* File Info */}
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-white font-medium truncate">{fileName}</span>
                </div>
                {fileInfo && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-500">
                      Format:{' '}
                      <span className="text-gray-300">
                        {fileInfo.isBinary ? 'Binary' : 'ASCII'}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      Triangles:{' '}
                      <span className="text-gray-300">
                        {fileInfo.triangleCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      Est. code:{' '}
                      <span className="text-gray-300">
                        {formatSize(fileInfo.estimatedCodeSize)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Large file warning */}
              {fileInfo && fileInfo.triangleCount > 5000 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Large mesh ({fileInfo.triangleCount.toLocaleString()} triangles). Consider
                    enabling simplification to reduce code size.
                  </p>
                </div>
              )}

              {/* Simplify option */}
              <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors">
                <input
                  type="checkbox"
                  checked={simplify}
                  onChange={(e) => setSimplify(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <p className="text-sm text-gray-300">Simplify mesh</p>
                  <p className="text-xs text-gray-600">
                    Reduce vertex count for large STLs (lossy)
                  </p>
                </div>
              </label>

              {/* Change file */}
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Choose different file
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={!stlData || converting}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-all"
          >
            {converting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5" />
                Convert to OpenSCAD
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StlImportModal;
