import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewProps {
  code: string;
}

const CodeView: React.FC<CodeViewProps> = ({ code }) => {
  return (
    <div className="h-full overflow-auto">
      <SyntaxHighlighter
        language="openscad"
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          background: 'transparent',
          fontSize: '12px',
          lineHeight: '1.7',
        }}
        showLineNumbers
        lineNumberStyle={{ color: '#3f3f46', paddingRight: '1.25rem', minWidth: '2.5rem' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeView;
