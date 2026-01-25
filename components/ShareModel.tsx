/**
 * Share Model Component
 * Social sharing for generated 3D models
 */

import React, { useState } from 'react';
import { Share2, Twitter, Linkedin, Copy, Check, Download, X, Link } from 'lucide-react';

interface ShareModelProps {
  isOpen: boolean;
  onClose: () => void;
  modelName?: string;
  modelDescription?: string;
  previewImageUrl?: string;
}

export default function ShareModel({
  isOpen,
  onClose,
  modelName = 'My 3D Model',
  modelDescription = 'Created with PolyGen AI',
  previewImageUrl
}: ShareModelProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // In production, this would be a unique shareable URL
  const shareUrl = `${window.location.origin}/gallery/model-${Date.now()}`;

  const shareText = `Check out this 3D model I created with PolyGen AI: "${modelName}"`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareOnReddit = () => {
    const title = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.reddit.com/submit?title=${title}&url=${url}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0c0c0f] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Share2 className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Share Model</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5">
          {previewImageUrl && (
            <div className="mb-4 aspect-video bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
              <img
                src={previewImageUrl}
                alt={modelName}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-white font-medium mb-1">{modelName}</h3>
            <p className="text-sm text-gray-500">{modelDescription}</p>
          </div>

          {/* Share Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Share link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                <Link className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-300 truncate">{shareUrl}</span>
              </div>
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-400">Share on</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={shareOnTwitter}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-xl border border-[#1DA1F2]/20 transition-colors"
              >
                <Twitter className="w-5 h-5" />
                <span className="text-sm font-medium">Twitter</span>
              </button>
              <button
                onClick={shareOnLinkedIn}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] rounded-xl border border-[#0A66C2]/20 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
                <span className="text-sm font-medium">LinkedIn</span>
              </button>
              <button
                onClick={shareOnReddit}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FF4500]/10 hover:bg-[#FF4500]/20 text-[#FF4500] rounded-xl border border-[#FF4500]/20 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                <span className="text-sm font-medium">Reddit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white/[0.02] border-t border-white/[0.06]">
          <p className="text-xs text-gray-500 text-center">
            Share your creation and inspire others to build with AI
          </p>
        </div>
      </div>
    </div>
  );
}
