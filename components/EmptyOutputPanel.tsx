import React from 'react';
import { Box } from 'lucide-react';

const EmptyOutputPanel: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="p-3 bg-white/[0.03] rounded-xl mb-4">
        <Box className="w-10 h-10 text-gray-700" />
      </div>
      <h2 className="text-sm font-medium text-gray-500 mb-1">No Model Yet</h2>
      <p className="text-xs text-gray-600 max-w-[200px]">
        Describe what you want to create in the chat.
      </p>
    </div>
  );
};

export default EmptyOutputPanel;
