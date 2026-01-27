import React from 'react';
import {
  Smartphone,
  Box,
  Wrench,
  Cable,
  Grip,
  Frame,
  Cylinder,
  CircleDot,
  Layers,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'phone-stand',
    name: 'Phone Stand',
    icon: Smartphone,
    description: 'Adjustable phone/tablet holder',
    prompt:
      'A phone stand that holds my phone at a comfortable viewing angle for watching videos. Should work with a phone in a case (about 10mm thick). Needs to be stable and not tip over.',
  },
  {
    id: 'box-lid',
    name: 'Box with Lid',
    icon: Box,
    description: 'Storage container with snap lid',
    prompt:
      'A small storage box with a snap-fit lid. Inside dimensions roughly 80x60x40mm. The lid should click on securely but be easy to remove. Include a small lip so the lid sits flush.',
  },
  {
    id: 'cable-clip',
    name: 'Cable Organizer',
    icon: Cable,
    description: 'Desk cable management clips',
    prompt:
      'Cable management clips that stick to the desk (with adhesive pad recess on bottom). Should hold 2-3 cables of various sizes (USB, power cords). Needs slots for different cable diameters.',
  },
  {
    id: 'bracket',
    name: 'L-Bracket',
    icon: Frame,
    description: 'Mounting bracket with holes',
    prompt:
      'A sturdy L-bracket for mounting something to a wall or surface. About 50mm on each side. Include countersunk screw holes for M4 screws, 2 holes per side. Add ribs for strength.',
  },
  {
    id: 'knob',
    name: 'Control Knob',
    icon: CircleDot,
    description: 'Replacement knob with set screw',
    prompt:
      'A control knob for a 6mm D-shaft (flat side). About 25mm diameter, 15mm tall. Knurled grip on the outside, set screw hole (M3) on the side to secure to shaft. Include a pointer line on top.',
  },
  {
    id: 'container',
    name: 'Divided Tray',
    icon: Layers,
    description: 'Organizer with compartments',
    prompt:
      'A desk organizer tray with multiple compartments for small items. About 150x100mm total, with 6 compartments of varying sizes. Rounded corners, 30mm tall walls.',
  },
  {
    id: 'hook',
    name: 'Wall Hook',
    icon: Grip,
    description: 'Coat/bag hook with screws',
    prompt:
      'A wall-mounted hook for hanging coats or bags. Should support decent weight (5kg+). Include screw holes for mounting. Modern minimal design with smooth curves.',
  },
  {
    id: 'spacer',
    name: 'Custom Spacer',
    icon: Cylinder,
    description: 'Standoff or spacer ring',
    prompt:
      'A set of spacers/standoffs: outer diameter 10mm, inner hole 4.2mm (for M4 bolt). Make versions in heights: 3mm, 5mm, 10mm, 15mm. Chamfered edges.',
  },
  {
    id: 'tool-holder',
    name: 'Tool Holder',
    icon: Wrench,
    description: 'Pegboard or wall mount',
    prompt:
      'A wall-mounted holder for small hand tools (screwdrivers, pliers). Should mount to pegboard (standard 25mm hole spacing) or have screw holes for direct wall mount. Hold 4-5 tools.',
  },
];

interface DesignTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
  isVisible: boolean;
}

const DesignTemplates: React.FC<DesignTemplatesProps> = ({ onSelectTemplate, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="p-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Quick Start Templates
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.prompt)}
            className="flex flex-col items-center p-3 bg-white/[0.02] hover:bg-violet-500/10 border border-white/[0.06] hover:border-violet-500/30 rounded-xl transition-all group text-center"
          >
            <template.icon className="w-5 h-5 text-gray-500 group-hover:text-violet-400 mb-1.5 transition-colors" />
            <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors">
              {template.name}
            </span>
            <span className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DesignTemplates;
