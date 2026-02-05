/**
 * GST Template Library
 * Pre-built Geometric Structure Tree templates for common tactical/military parts.
 * The planner references these templates to produce accurate GSTs without generating from scratch.
 */

import type { GeometricStructureTree } from '../types';

export interface GSTTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  gst: GeometricStructureTree;
}

/**
 * All available GST templates, keyed by ID for quick lookup.
 */
export const GST_TEMPLATES: Record<string, GSTTemplate> = {

  'picatinny-rail-section': {
    id: 'picatinny-rail-section',
    name: 'Picatinny Rail Section',
    description: 'MIL-STD-1913 rail section with configurable slot count',
    keywords: ['picatinny', 'rail', '1913', 'weaver', 'accessory rail'],
    gst: {
      version: '1.0',
      name: 'Picatinny Rail Section',
      description: 'MIL-STD-1913 compliant rail segment',
      globalParameters: [
        { name: 'slots', value: 5, unit: 'count', description: 'Number of slots' },
        { name: 'rail_width', value: 20.6, unit: 'mm', description: 'MIL-STD-1913 width' },
        { name: 'slot_spacing', value: 5.23, unit: 'mm', description: 'Center-to-center slot spacing' },
        { name: 'slot_width', value: 3.05, unit: 'mm', description: 'Slot width' },
        { name: 'slot_depth', value: 1.5, unit: 'mm', description: 'Slot depth' },
        { name: 'rail_height', value: 9.5, unit: 'mm', description: 'Total rail height' },
      ],
      root: {
        id: 'rail-assembly',
        name: 'Rail Assembly',
        type: 'difference',
        children: [
          {
            id: 'rail-body',
            name: 'Rail Body',
            type: 'cuboid',
            parameters: [
              { name: 'width', value: 20.6, unit: 'mm' },
              { name: 'depth', value: 26.15, unit: 'mm', description: 'slots * slot_spacing' },
              { name: 'height', value: 9.5, unit: 'mm' },
            ],
          },
          {
            id: 'rail-slots',
            name: 'Slot Array',
            type: 'slot',
            booleanOp: 'subtract',
            parameters: [
              { name: 'count', value: 5, unit: 'count' },
              { name: 'width', value: 3.05, unit: 'mm' },
              { name: 'depth', value: 1.5, unit: 'mm' },
              { name: 'spacing', value: 5.23, unit: 'mm' },
            ],
          },
        ],
      },
      printOrientation: 'flat',
    },
  },

  'molle-clip': {
    id: 'molle-clip',
    name: 'MOLLE Clip',
    description: 'Single MOLLE/PALS hook-style retention clip',
    keywords: ['molle', 'pals', 'clip', 'webbing', 'attachment'],
    gst: {
      version: '1.0',
      name: 'MOLLE Clip',
      description: 'Hook-style MOLLE clip for PALS webbing attachment',
      globalParameters: [
        { name: 'clip_width', value: 28, unit: 'mm', description: 'Slightly wider than 25.4mm webbing' },
        { name: 'clip_height', value: 40, unit: 'mm', description: 'Spans one MOLLE row' },
        { name: 'clip_thickness', value: 2.5, unit: 'mm', description: 'Minimum for FDM strength' },
        { name: 'hook_depth', value: 5, unit: 'mm', description: 'Hook catch depth' },
        { name: 'webbing_gap', value: 4, unit: 'mm', description: 'Gap for webbing pass-through' },
      ],
      root: {
        id: 'clip-assembly',
        name: 'Clip Assembly',
        type: 'union',
        children: [
          {
            id: 'clip-spine',
            name: 'Spine',
            type: 'cuboid',
            parameters: [
              { name: 'width', value: 28, unit: 'mm' },
              { name: 'depth', value: 2.5, unit: 'mm' },
              { name: 'height', value: 40, unit: 'mm' },
            ],
          },
          {
            id: 'clip-top-hook',
            name: 'Top Hook',
            type: 'hulled_connection',
            parameters: [
              { name: 'width', value: 28, unit: 'mm' },
              { name: 'depth', value: 5, unit: 'mm' },
              { name: 'height', value: 6, unit: 'mm' },
              { name: 'radius', value: 1, unit: 'mm' },
            ],
          },
          {
            id: 'clip-bottom-hook',
            name: 'Bottom Hook',
            type: 'hulled_connection',
            parameters: [
              { name: 'width', value: 28, unit: 'mm' },
              { name: 'depth', value: 5, unit: 'mm' },
              { name: 'height', value: 6, unit: 'mm' },
              { name: 'radius', value: 1, unit: 'mm' },
            ],
          },
        ],
      },
      printOrientation: 'flat',
    },
  },

  'mounting-plate': {
    id: 'mounting-plate',
    name: 'Mounting Plate with Holes',
    description: 'Rectangular plate with configurable M3/M4 mounting holes and optional corner radii',
    keywords: ['plate', 'mount', 'base', 'bracket', 'holes', 'mounting'],
    gst: {
      version: '1.0',
      name: 'Mounting Plate',
      description: 'Rectangular mounting plate with corner holes',
      globalParameters: [
        { name: 'plate_width', value: 60, unit: 'mm' },
        { name: 'plate_depth', value: 40, unit: 'mm' },
        { name: 'plate_thickness', value: 4, unit: 'mm' },
        { name: 'hole_diameter', value: 3.4, unit: 'mm', description: 'M3 clearance' },
        { name: 'hole_inset', value: 6, unit: 'mm', description: 'Distance from edge to hole center' },
        { name: 'corner_radius', value: 3, unit: 'mm' },
      ],
      root: {
        id: 'plate-assembly',
        name: 'Plate Assembly',
        type: 'difference',
        children: [
          {
            id: 'plate-body',
            name: 'Plate Body',
            type: 'rcube',
            parameters: [
              { name: 'width', value: 60, unit: 'mm' },
              { name: 'depth', value: 40, unit: 'mm' },
              { name: 'height', value: 4, unit: 'mm' },
              { name: 'radius', value: 3, unit: 'mm' },
            ],
          },
          {
            id: 'hole-tl',
            name: 'Hole Top-Left',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 3.4, unit: 'mm' },
              { name: 'depth', value: 4, unit: 'mm' },
            ],
          },
          {
            id: 'hole-tr',
            name: 'Hole Top-Right',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 3.4, unit: 'mm' },
              { name: 'depth', value: 4, unit: 'mm' },
            ],
          },
          {
            id: 'hole-bl',
            name: 'Hole Bottom-Left',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 3.4, unit: 'mm' },
              { name: 'depth', value: 4, unit: 'mm' },
            ],
          },
          {
            id: 'hole-br',
            name: 'Hole Bottom-Right',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 3.4, unit: 'mm' },
              { name: 'depth', value: 4, unit: 'mm' },
            ],
          },
        ],
      },
      printOrientation: 'flat',
    },
  },

  'picatinny-molle-adapter': {
    id: 'picatinny-molle-adapter',
    name: 'Picatinny-to-MOLLE Adapter',
    description: 'Adapter plate with Picatinny rail on top and MOLLE clips on back',
    keywords: ['picatinny', 'molle', 'adapter', 'rail', 'mount', 'converter'],
    gst: {
      version: '1.0',
      name: 'Picatinny-MOLLE Adapter',
      description: 'Connects Picatinny accessories to MOLLE/PALS webbing',
      globalParameters: [
        { name: 'plate_width', value: 60, unit: 'mm' },
        { name: 'plate_height', value: 50, unit: 'mm' },
        { name: 'plate_thickness', value: 5, unit: 'mm' },
        { name: 'rail_slots', value: 5, unit: 'count' },
        { name: 'molle_columns', value: 2, unit: 'count' },
      ],
      root: {
        id: 'adapter-assembly',
        name: 'Adapter Assembly',
        type: 'union',
        children: [
          {
            id: 'adapter-plate',
            name: 'Base Plate',
            type: 'rcube',
            parameters: [
              { name: 'width', value: 60, unit: 'mm' },
              { name: 'depth', value: 5, unit: 'mm' },
              { name: 'height', value: 50, unit: 'mm' },
              { name: 'radius', value: 2, unit: 'mm' },
            ],
          },
          {
            id: 'adapter-rail',
            name: 'Picatinny Rail (top)',
            type: 'difference',
            children: [
              {
                id: 'rail-body',
                name: 'Rail Body',
                type: 'cuboid',
                parameters: [
                  { name: 'width', value: 20.6, unit: 'mm' },
                  { name: 'depth', value: 26.15, unit: 'mm' },
                  { name: 'height', value: 9.5, unit: 'mm' },
                ],
              },
              {
                id: 'rail-slots',
                name: 'Rail Slots',
                type: 'slot',
                booleanOp: 'subtract',
                parameters: [
                  { name: 'count', value: 5, unit: 'count' },
                  { name: 'width', value: 3.05, unit: 'mm' },
                  { name: 'depth', value: 1.5, unit: 'mm' },
                  { name: 'spacing', value: 5.23, unit: 'mm' },
                ],
              },
            ],
          },
          {
            id: 'molle-clip-left',
            name: 'MOLLE Clip Left',
            type: 'hulled_connection',
            parameters: [
              { name: 'width', value: 28, unit: 'mm' },
              { name: 'depth', value: 5, unit: 'mm' },
              { name: 'height', value: 40, unit: 'mm' },
            ],
          },
          {
            id: 'molle-clip-right',
            name: 'MOLLE Clip Right',
            type: 'hulled_connection',
            parameters: [
              { name: 'width', value: 28, unit: 'mm' },
              { name: 'depth', value: 5, unit: 'mm' },
              { name: 'height', value: 40, unit: 'mm' },
            ],
          },
        ],
      },
      printOrientation: 'upright',
    },
  },

  'rail-riser-mount': {
    id: 'rail-riser-mount',
    name: 'Picatinny Rail Riser',
    description: 'Elevates a Picatinny rail by a configurable height for optics co-witness',
    keywords: ['riser', 'optic', 'sight', 'rail', 'picatinny', 'elevation', 'co-witness'],
    gst: {
      version: '1.0',
      name: 'Rail Riser Mount',
      description: 'Picatinny-to-Picatinny riser for optics height adjustment',
      globalParameters: [
        { name: 'riser_height', value: 20, unit: 'mm' },
        { name: 'rail_slots', value: 5, unit: 'count' },
        { name: 'body_width', value: 24, unit: 'mm' },
        { name: 'bolt_diameter', value: 4.5, unit: 'mm', description: 'M4 clearance' },
      ],
      root: {
        id: 'riser-assembly',
        name: 'Riser Assembly',
        type: 'difference',
        children: [
          {
            id: 'riser-body',
            name: 'Riser Block',
            type: 'cuboid',
            parameters: [
              { name: 'width', value: 24, unit: 'mm' },
              { name: 'depth', value: 26.15, unit: 'mm' },
              { name: 'height', value: 29.5, unit: 'mm', description: 'riser_height + rail_height' },
            ],
          },
          {
            id: 'top-slots',
            name: 'Top Rail Slots',
            type: 'slot',
            booleanOp: 'subtract',
            parameters: [
              { name: 'count', value: 5, unit: 'count' },
              { name: 'width', value: 3.05, unit: 'mm' },
              { name: 'depth', value: 1.5, unit: 'mm' },
              { name: 'spacing', value: 5.23, unit: 'mm' },
            ],
          },
          {
            id: 'bottom-dovetail',
            name: 'Bottom Dovetail Groove',
            type: 'cuboid',
            booleanOp: 'subtract',
            parameters: [
              { name: 'width', value: 20.6, unit: 'mm' },
              { name: 'depth', value: 26.15, unit: 'mm' },
              { name: 'height', value: 5, unit: 'mm', description: 'Clamping groove depth' },
            ],
          },
          {
            id: 'bolt-hole-front',
            name: 'Front Bolt Hole',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 4.5, unit: 'mm' },
              { name: 'depth', value: 29.5, unit: 'mm' },
            ],
          },
          {
            id: 'bolt-hole-rear',
            name: 'Rear Bolt Hole',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 4.5, unit: 'mm' },
              { name: 'depth', value: 29.5, unit: 'mm' },
            ],
          },
        ],
      },
      printOrientation: 'upright',
    },
  },

  'arc-rail-adapter': {
    id: 'arc-rail-adapter',
    name: 'Ops-Core ARC Rail Adapter',
    description: 'Adapter for mounting accessories to Ops-Core ARC helmet rails',
    keywords: ['arc', 'ops-core', 'helmet', 'rail', 'adapter', 'headset', 'light'],
    gst: {
      version: '1.0',
      name: 'ARC Rail Adapter',
      description: 'Slide-on adapter for Ops-Core ARC helmet rail system',
      globalParameters: [
        { name: 'adapter_length', value: 40, unit: 'mm' },
        { name: 'adapter_width', value: 18, unit: 'mm' },
        { name: 'adapter_height', value: 14, unit: 'mm' },
        { name: 'rail_channel_width', value: 12, unit: 'mm', description: 'ARC rail profile' },
        { name: 'rail_channel_height', value: 8, unit: 'mm' },
        { name: 'retention_screw', value: 3.4, unit: 'mm', description: 'M3 clearance' },
      ],
      root: {
        id: 'arc-adapter-assembly',
        name: 'ARC Adapter',
        type: 'difference',
        children: [
          {
            id: 'adapter-body',
            name: 'Adapter Body',
            type: 'rcube',
            parameters: [
              { name: 'width', value: 18, unit: 'mm' },
              { name: 'depth', value: 40, unit: 'mm' },
              { name: 'height', value: 14, unit: 'mm' },
              { name: 'radius', value: 2, unit: 'mm' },
            ],
          },
          {
            id: 'rail-channel',
            name: 'Rail Channel',
            type: 'cuboid',
            booleanOp: 'subtract',
            parameters: [
              { name: 'width', value: 12, unit: 'mm' },
              { name: 'depth', value: 40, unit: 'mm' },
              { name: 'height', value: 8, unit: 'mm' },
            ],
          },
          {
            id: 'retention-hole',
            name: 'Retention Screw Hole',
            type: 'screw_hole',
            booleanOp: 'subtract',
            parameters: [
              { name: 'diameter', value: 3.4, unit: 'mm' },
              { name: 'depth', value: 18, unit: 'mm' },
            ],
          },
        ],
      },
      printOrientation: 'flat',
    },
  },
};

/**
 * Find templates matching a user prompt by keyword overlap.
 * Returns templates sorted by relevance (most keyword matches first).
 */
export function findMatchingTemplates(prompt: string, maxResults = 3): GSTTemplate[] {
  const lower = prompt.toLowerCase();
  const scored = Object.values(GST_TEMPLATES).map(template => {
    const hits = template.keywords.filter(kw => lower.includes(kw)).length;
    const nameHit = lower.includes(template.name.toLowerCase()) ? 2 : 0;
    return { template, score: hits + nameHit };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.template);
}

/**
 * Returns a compact text summary of all templates for embedding in the planner system prompt.
 */
export function getTemplateIndex(): string {
  const lines = Object.values(GST_TEMPLATES).map(t =>
    `- **${t.id}**: ${t.description} [keywords: ${t.keywords.join(', ')}]`
  );
  return `## AVAILABLE GST TEMPLATES
When the user's request closely matches a template below, use it as a starting point.
Customize parameter values to match user specifications, but preserve the structure.

${lines.join('\n')}

To use a template: copy its GST structure, adjust globalParameters and component parameters to match the user's dimensions, add/remove children as needed.`;
}
