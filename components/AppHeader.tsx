import React from 'react';
import { Box, Settings } from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE } from '../services/geminiService';
import { isMultiAgentAvailable } from '../services/agentOrchestrator';

interface AppHeaderProps {
  useMultiAgent: boolean;
  onOpenSettings: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ useMultiAgent, onOpenSettings }) => {
  const isMultiAgentActive = useMultiAgent && isMultiAgentAvailable();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#09090b] border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white">
            PolyGen <span className="text-violet-400">AI</span>
          </h1>
          <span className="text-[10px] text-gray-500 font-mono">v{APP_VERSION}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 text-[10px] font-mono text-gray-500 bg-white/[0.03] rounded border border-white/[0.06]">
          {APP_BUILD_DATE}
        </span>
        <span className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full ${
          isMultiAgentActive
            ? 'text-violet-400 bg-violet-500/10'
            : 'text-emerald-400 bg-emerald-500/10'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isMultiAgentActive ? 'bg-violet-400' : 'bg-emerald-400'
          }`}></span>
          {isMultiAgentActive ? 'Multi-Agent' : 'Gemini 3 Pro'}
        </span>
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
