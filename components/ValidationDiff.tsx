import React from 'react';
import type { GeneratedAsset, GSTBoundingBox } from '../types';
import ScadRenderer from './ScadRenderer';
import { AlertTriangle, CheckCircle2, Box, Ruler } from 'lucide-react';

interface ValidationDiffProps {
  asset: GeneratedAsset;
}

interface BoundingBoxComparisonProps {
  expected?: GSTBoundingBox;
  actual?: GSTBoundingBox;
  deviationPercent?: number;
  match?: boolean;
}

const formatDimension = (min: number, max: number): string => {
  const size = Math.abs(max - min);
  return `${size.toFixed(1)}mm`;
};

const BoundingBoxComparison: React.FC<BoundingBoxComparisonProps> = ({
  expected,
  actual,
  deviationPercent,
  match,
}) => {
  if (!expected && !actual) {
    return (
      <div className="text-xs text-gray-500 text-center py-4">No bounding box data available</div>
    );
  }

  const axes = ['X', 'Y', 'Z'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white">Dimension Comparison</span>
        </div>
        {match !== undefined && (
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              match
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {match ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Match
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                {deviationPercent?.toFixed(1)}% deviation
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {axes.map((axis, i) => {
          const expectedSize = expected ? formatDimension(expected.min[i], expected.max[i]) : '--';
          const actualSize = actual ? formatDimension(actual.min[i], actual.max[i]) : '--';

          const expectedNum = expected ? Math.abs(expected.max[i] - expected.min[i]) : 0;
          const actualNum = actual ? Math.abs(actual.max[i] - actual.min[i]) : 0;
          const axisMatch =
            expectedNum > 0 ? Math.abs((actualNum - expectedNum) / expectedNum) < 0.1 : actualNum < 0.1;

          return (
            <div
              key={axis}
              className={`p-2 rounded-lg border ${
                axisMatch
                  ? 'bg-white/[0.02] border-white/[0.06]'
                  : 'bg-amber-500/5 border-amber-500/20'
              }`}
            >
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {axis}-Axis
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Expected:</span>
                  <span className="text-violet-400 font-mono">{expectedSize}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Actual:</span>
                  <span className={`font-mono ${axisMatch ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {actualSize}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ValidationDiff: React.FC<ValidationDiffProps> = ({ asset }) => {
  const hasPreviewImage = !!asset.previewImageUrl;
  const hasCode = !!asset.scadCode;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0c0f]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <Ruler className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-white">Validation Comparison</span>
      </div>

      {/* Side-by-side comparison */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: AI Concept Preview */}
        <div className="flex-1 flex flex-col border-r border-white/[0.06]">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="text-xs font-medium text-violet-400">AI Concept Preview</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-[#0a0a0c]">
            {hasPreviewImage ? (
              <img
                src={asset.previewImageUrl}
                alt="AI Concept Preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center text-gray-500">
                <Box className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No concept preview available</p>
                <p className="text-xs text-gray-600 mt-1">
                  Preview images are generated during planning
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actual 3D Model */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="text-xs font-medium text-emerald-400">Generated 3D Model</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {hasCode ? (
              <ScadRenderer code={asset.scadCode!} isProUser={true} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Box className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No code generated yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Metrics */}
      <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
        <BoundingBoxComparison
          expected={asset.gst?.boundingBox}
          actual={asset.validationResult?.boundingBox}
          deviationPercent={asset.validationResult?.gstDeviationPercent}
          match={
            asset.validationResult?.gstDeviationPercent !== undefined
              ? asset.validationResult.gstDeviationPercent < 10
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default ValidationDiff;
