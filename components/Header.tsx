import React from 'react';
import { Box, Settings, Sparkles } from 'lucide-react';

interface HeaderProps {
    isProUser: boolean;
    onTogglePro: () => void;
}

const Header: React.FC<HeaderProps> = ({ isProUser, onTogglePro }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            PolyGen <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">Gemini 3 Pro // OpenSCAD Architect</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
         <span className="hidden md:flex px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/50 rounded-full border border-indigo-900/50 items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Thinking Model Active
         </span>
         
         <button 
            onClick={onTogglePro}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isProUser 
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
         >
            <Sparkles className="w-3 h-3" />
            {isProUser ? "PRO ACTIVE" : "GO PRO"}
         </button>
      </div>
    </header>
  );
};

export default Header;