/**
 * FAQ Component
 * Frequently asked questions for landing page SEO
 */

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "What is PolyGen AI?",
    answer: "PolyGen AI is an AI-powered platform that transforms text descriptions and images into 3D-printable models. Using advanced multi-agent AI technology (Gemini + Claude), it generates parametric OpenSCAD code that you can customize and export as STL files for 3D printing."
  },
  {
    question: "How does text-to-3D work?",
    answer: "Simply describe what you want to create in plain English, like 'a desk organizer with three compartments for pens'. Our AI agents analyze your description, plan the geometric structure, and generate optimized OpenSCAD code. You can preview the model in 3D and iterate with natural language refinements."
  },
  {
    question: "What file formats does PolyGen AI support?",
    answer: "PolyGen AI exports to OpenSCAD code format (.scad) which can be edited in any text editor, and STL format (.stl) which is compatible with all 3D printers and slicers like Cura, PrusaSlicer, and Simplify3D."
  },
  {
    question: "Is there a free plan?",
    answer: "Yes! PolyGen AI offers a free plan with 5 generations per month, access to basic design templates, and OpenSCAD code export. No credit card required to get started."
  },
  {
    question: "What's the difference between Free and Pro?",
    answer: "Free tier includes 5 generations/month with basic features. Pro ($19/month) gives you 100 generations, STL export, 3D preview in browser, and priority support. Enterprise ($99/month) offers unlimited generations, API access, and team features."
  },
  {
    question: "Can I use the generated models commercially?",
    answer: "Pro and Enterprise users can use generated models for commercial purposes. Free tier users may use models for personal, non-commercial purposes only. The generated OpenSCAD code is yours to keep and modify."
  },
  {
    question: "What types of models can I create?",
    answer: "You can create any parametric 3D model suitable for 3D printing - from simple brackets and hooks to complex enclosures and organizers. The AI excels at functional parts with defined dimensions. Artistic or organic shapes may require iteration."
  },
  {
    question: "How accurate are the AI-generated models?",
    answer: "Our multi-agent AI produces highly accurate parametric code, but we recommend reviewing models in the 3D preview and testing prints with a few iterations. The AI can refine designs based on your feedback."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-4">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400">
            Everything you need to know about PolyGen AI
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_DATA.map((item, index) => (
            <div
              key={index}
              className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium text-white pr-4">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5">
                  <p className="text-gray-400 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
