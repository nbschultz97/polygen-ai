/**
 * Onboarding Tour Component
 * Guides new users through the app features
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  MessageSquare,
  Image,
  Code,
  Eye,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface OnboardingTourProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to PolyGen AI!',
    description: 'Create 3D-printable models from text descriptions using AI. Let me show you how it works.',
    icon: <Sparkles className="w-8 h-8" />,
    tip: null
  },
  {
    id: 'describe',
    title: 'Describe Your Model',
    description: 'Type what you want to create in plain English. Be specific about dimensions and features.',
    icon: <MessageSquare className="w-8 h-8" />,
    tip: 'Example: "A desk organizer with 3 pen slots and a phone holder, 150mm wide"'
  },
  {
    id: 'image',
    title: 'Or Upload an Image',
    description: 'Click the image icon to upload a photo. The AI will recreate it as a 3D model.',
    icon: <Image className="w-8 h-8" />,
    tip: 'Great for reverse engineering parts or recreating objects from photos'
  },
  {
    id: 'generate',
    title: 'AI Generates Code',
    description: 'Our multi-agent AI (Gemini + Claude) creates optimized OpenSCAD code for your design.',
    icon: <Code className="w-8 h-8" />,
    tip: 'The code is parametric - you can edit dimensions later in OpenSCAD'
  },
  {
    id: 'preview',
    title: 'Preview in 3D',
    description: 'View and rotate your model in the browser before exporting. Catch issues early!',
    icon: <Eye className="w-8 h-8" />,
    tip: 'Pro tip: Use the 3D preview to check for print issues before slicing'
  },
  {
    id: 'export',
    title: 'Export & Print',
    description: 'Download OpenSCAD code to edit further, or export directly to STL for your 3D printer.',
    icon: <Download className="w-8 h-8" />,
    tip: 'STL export is available on Pro plans'
  }
];

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuth();

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    // Save to localStorage so we don't show again
    if (user) {
      localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
    }
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleSkip} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0c0c0f] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.06]">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-400 mx-auto mb-6">
            {step.icon}
          </div>

          <h2 className="text-xl font-semibold text-white mb-3">
            {step.title}
          </h2>

          <p className="text-gray-400 mb-6 leading-relaxed">
            {step.description}
          </p>

          {step.tip && (
            <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl text-left">
              <p className="text-sm text-violet-300 italic">
                💡 {step.tip}
              </p>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-violet-500'
                    : index < currentStep
                      ? 'bg-violet-500/50'
                      : 'bg-white/[0.1]'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            {isFirstStep ? (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 hover:text-white text-sm transition-colors"
              >
                Skip tour
              </button>
            ) : (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLastStep ? 'Start Creating' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
              {isLastStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if user needs onboarding
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      const completed = localStorage.getItem(`onboarding_complete_${user.id}`);
      setNeedsOnboarding(!completed);
    }
  }, [user]);

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
    }
    setNeedsOnboarding(false);
  };

  const resetOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding_complete_${user.id}`);
    }
    setNeedsOnboarding(true);
  };

  return { needsOnboarding, completeOnboarding, resetOnboarding };
}
