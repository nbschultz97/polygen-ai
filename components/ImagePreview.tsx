import React from 'react';
import { Image as ImageIcon, Download, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { WorkflowStep } from '../types';

interface ImagePreviewProps {
  imageUrl: string | null;
  workflowStep: WorkflowStep;
  onApprove: () => void;
  onReject: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, workflowStep, onApprove, onReject }) => {
  const isLoading = workflowStep === 'generating-image';
  const isPendingApproval = workflowStep === 'reviewing';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500 gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-medium animate-pulse text-indigo-400">Dreaming up concept...</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-600 gap-3">
        <ImageIcon className="w-12 h-12 opacity-50" />
        <p className="text-sm">Describe an object to start the visual workflow.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 relative group">
      {/* Top Controls (Download) - Only show if completed or reviewing */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
         <a 
            href={imageUrl} 
            download="concept_render.png" 
            className="p-2 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
            title="Download Image"
         >
            <Download className="w-5 h-5" />
         </a>
      </div>
      
      {/* Main Image Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
        <img 
            src={imageUrl} 
            alt="Concept Render" 
            className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black/50 border border-slate-800 transition-all duration-500 ${isPendingApproval ? 'scale-95 ring-2 ring-indigo-500/50' : ''}`}
        />

        {/* Approval Overlay */}
        {isPendingApproval && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 z-20 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-xl flex gap-3 items-center">
                <div className="mr-2">
                   <p className="text-sm font-bold text-white">Review Concept</p>
                   <p className="text-xs text-slate-400">Is this what you want to build?</p>
                </div>
                <button 
                  onClick={onReject}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
                <button 
                  onClick={onApprove}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Check className="w-4 h-4" />
                  Approve & Build Code
                </button>
             </div>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
        <p className="text-xs text-slate-400">
           {isPendingApproval ? "Gemini 3 Pro Image Preview" : "Visual Reference for Code Generation"}
        </p>
        {isPendingApproval && (
          <span className="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50">
             <AlertCircle className="w-3 h-3" />
             Approval Required
          </span>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;