import React from 'react';
import { Cpu } from 'lucide-react';
import DesignTemplates from './DesignTemplates';

interface EmptyChatProps {
  onSelectTemplate: (prompt: string) => void;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onSelectTemplate }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center text-center px-6 py-8">
        <div className="p-3 bg-violet-500/10 rounded-xl mb-4">
          <Cpu className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-base font-medium text-white mb-1">AI-Powered 3D Modeling</h2>
        <p className="text-sm text-gray-500">
          Describe what you want to create, or pick a template below.
        </p>
      </div>
      <DesignTemplates
        isVisible={true}
        onSelectTemplate={onSelectTemplate}
      />
    </div>
  );
};

export default EmptyChat;
