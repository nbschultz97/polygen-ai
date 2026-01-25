/**
 * Smart Quick Fix Analyzer
 * Analyzes GST and validation results to generate context-aware fix suggestions
 */

import {
  GeometricStructureTree,
  GSTComponent,
  ValidationResult,
  SmartQuickFix,
  QuickFixCategory
} from '../types';

/**
 * Analyze GST and validation to generate relevant quick fixes
 */
export function analyzeForQuickFixes(
  gst: GeometricStructureTree,
  validation: ValidationResult,
  scadCode: string
): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];

  // Analyze GST components
  const componentFixes = analyzeComponents(gst);
  fixes.push(...componentFixes);

  // Analyze validation results
  const validationFixes = analyzeValidation(validation, gst);
  fixes.push(...validationFixes);

  // Analyze parameters
  const parameterFixes = analyzeParameters(gst);
  fixes.push(...parameterFixes);

  // Analyze print considerations
  const printFixes = analyzePrintability(gst, validation);
  fixes.push(...printFixes);

  // Sort by relevance and deduplicate
  const uniqueFixes = deduplicateFixes(fixes);
  return uniqueFixes.sort((a, b) => b.relevance - a.relevance).slice(0, 8);
}

/**
 * Analyze GST components for relevant fixes
 */
function analyzeComponents(gst: GeometricStructureTree): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];
  const componentTypes = new Set<string>();

  // Collect all component types
  function scanComponent(comp: GSTComponent) {
    componentTypes.add(comp.type);
    comp.children?.forEach(scanComponent);
  }
  scanComponent(gst.root);

  // Generate fixes based on component types
  if (componentTypes.has('screw_hole') || componentTypes.has('bearing_pocket')) {
    fixes.push({
      id: 'tighter-fit',
      label: 'Tighter fit',
      description: 'Reduce hole clearance for press fit',
      prompt: 'Make all holes and pockets have a tighter fit by reducing clearance by 0.1mm',
      category: 'tolerance',
      relevance: 0.9
    });
    fixes.push({
      id: 'looser-fit',
      label: 'Looser fit',
      description: 'Increase hole clearance for easier assembly',
      prompt: 'Make all holes and pockets have a looser fit by increasing clearance by 0.2mm',
      category: 'tolerance',
      relevance: 0.85
    });
  }

  if (componentTypes.has('spur_gear') || componentTypes.has('rack_gear')) {
    fixes.push({
      id: 'more-teeth',
      label: 'More teeth',
      description: 'Increase tooth count for finer resolution',
      prompt: 'Increase the number of gear teeth by 25% while keeping the overall diameter similar',
      category: 'dimension',
      relevance: 0.7
    });
    fixes.push({
      id: 'thicker-gear',
      label: 'Thicker gear',
      description: 'Increase gear thickness for more strength',
      prompt: 'Make the gear 50% thicker for increased strength',
      category: 'structure',
      relevance: 0.65
    });
  }

  if (componentTypes.has('ext_thread') || componentTypes.has('int_thread')) {
    fixes.push({
      id: 'finer-pitch',
      label: 'Finer thread pitch',
      description: 'Use finer thread pitch for better hold',
      prompt: 'Use a finer thread pitch (reduce pitch value by 25%)',
      category: 'dimension',
      relevance: 0.7
    });
    fixes.push({
      id: 'coarser-pitch',
      label: 'Coarser thread pitch',
      description: 'Use coarser pitch for easier printing',
      prompt: 'Use a coarser thread pitch (increase pitch value by 50%) for better printability',
      category: 'print',
      relevance: 0.65
    });
  }

  if (componentTypes.has('rcube') || componentTypes.has('cuboid')) {
    fixes.push({
      id: 'more-rounding',
      label: 'Rounder corners',
      description: 'Increase corner rounding for smoother feel',
      prompt: 'Increase the corner rounding radius by 50%',
      category: 'dimension',
      relevance: 0.5
    });
  }

  return fixes;
}

/**
 * Analyze validation results for fix suggestions
 */
function analyzeValidation(validation: ValidationResult, gst: GeometricStructureTree): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];

  // Non-manifold geometry - enhanced with specific issues
  if (!validation.isManifold) {
    // Check for specific manifold issues from the extended validation
    const hasBoundaryEdges = validation.warnings?.some(w => w.includes('boundary edge'));
    const hasNonManifoldEdges = validation.warnings?.some(w => w.includes('non-manifold edge'));
    const hasDegenerateTriangles = validation.warnings?.some(w => w.includes('degenerate triangle'));

    if (hasBoundaryEdges) {
      fixes.push({
        id: 'fix-boundary-edges',
        label: 'Close holes',
        description: 'Mesh has open edges (not watertight)',
        prompt: 'Fix the open edges by ensuring all boolean operations (difference, union) use epsilon overlap. Add eps = 0.01 and extend all cutting geometry by eps*2 past the surfaces being cut.',
        category: 'geometry',
        relevance: 1.0
      });
    }

    if (hasNonManifoldEdges) {
      fixes.push({
        id: 'fix-nonmanifold-edges',
        label: 'Fix overlapping faces',
        description: 'Multiple faces share the same edge',
        prompt: 'Fix the non-manifold geometry by separating overlapping faces. Check for coincident surfaces and add small offsets (eps = 0.01) between touching geometry.',
        category: 'geometry',
        relevance: 1.0
      });
    }

    if (hasDegenerateTriangles) {
      fixes.push({
        id: 'fix-degenerate-triangles',
        label: 'Fix thin geometry',
        description: 'Model has zero-area triangles',
        prompt: 'Fix degenerate triangles by ensuring all geometry has minimum thickness of 0.5mm. Remove any infinitely thin walls or zero-volume elements.',
        category: 'geometry',
        relevance: 0.95
      });
    }

    // Generic manifold fix if no specific issue detected
    if (!hasBoundaryEdges && !hasNonManifoldEdges && !hasDegenerateTriangles) {
      fixes.push({
        id: 'fix-manifold',
        label: 'Fix geometry',
        description: 'Repair non-manifold (non-watertight) geometry',
        prompt: 'Fix the non-manifold geometry by ensuring all boolean operations fully penetrate and there are no floating or disconnected pieces',
        category: 'geometry',
        relevance: 1.0
      });
    }
  }

  // GST bounding box mismatch
  if (validation.gstMatch === false) {
    fixes.push({
      id: 'scale-to-match',
      label: 'Match intended size',
      description: `Output deviated ${validation.gstDeviationPercent?.toFixed(0)}% from intended size`,
      prompt: 'Scale the model to match the originally intended dimensions from the specification',
      category: 'dimension',
      relevance: 0.95
    });
  }

  // Check for thin wall warnings
  const thinWallWarning = validation.warnings.find(w =>
    w.toLowerCase().includes('thin') || w.toLowerCase().includes('wall')
  );
  if (thinWallWarning) {
    fixes.push({
      id: 'thicker-walls',
      label: 'Thicker walls',
      description: 'Increase wall thickness for printability',
      prompt: 'Increase all wall thicknesses to at least 1.5mm for better print quality',
      category: 'print',
      relevance: 0.9
    });
  }

  // Large bounding box warning
  if (validation.boundingBox) {
    const size = [
      validation.boundingBox.max[0] - validation.boundingBox.min[0],
      validation.boundingBox.max[1] - validation.boundingBox.min[1],
      validation.boundingBox.max[2] - validation.boundingBox.min[2]
    ];
    const maxDim = Math.max(...size);

    if (maxDim > 200) {
      fixes.push({
        id: 'scale-down',
        label: 'Scale down',
        description: `Model is ${maxDim.toFixed(0)}mm - may not fit on print bed`,
        prompt: 'Scale the model down to fit within a 200mm x 200mm x 200mm build volume',
        category: 'print',
        relevance: 0.85
      });
    }

    if (maxDim < 20) {
      fixes.push({
        id: 'scale-up',
        label: 'Scale up',
        description: 'Model may be too small for practical use',
        prompt: 'Scale the model up by 2x to make it more practical',
        category: 'dimension',
        relevance: 0.6
      });
    }
  }

  return fixes;
}

/**
 * Analyze GST parameters for fix suggestions
 */
function analyzeParameters(gst: GeometricStructureTree): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];
  const params = gst.globalParameters || [];

  // Look for common parameters
  const hasWallThickness = params.some(p =>
    p.name.includes('wall') && p.name.includes('thickness')
  );
  const hasHoleDiameter = params.some(p =>
    p.name.includes('hole') && p.name.includes('diameter')
  );
  const hasClearance = params.some(p =>
    p.name.includes('clearance') || p.name.includes('tolerance')
  );

  if (hasWallThickness) {
    fixes.push({
      id: 'double-walls',
      label: 'Double wall thickness',
      description: 'Make walls twice as thick for strength',
      prompt: 'Double all wall thickness values for increased structural strength',
      category: 'structure',
      relevance: 0.6
    });
  }

  if (hasHoleDiameter && !hasClearance) {
    fixes.push({
      id: 'add-clearance',
      label: 'Add clearance',
      description: 'Add 0.2mm clearance to holes',
      prompt: 'Add 0.2mm clearance to all hole diameters for easier part insertion',
      category: 'tolerance',
      relevance: 0.7
    });
  }

  return fixes;
}

/**
 * Analyze printability considerations
 */
function analyzePrintability(gst: GeometricStructureTree, validation: ValidationResult): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];

  // Print orientation suggestions
  if (gst.printOrientation === 'upright') {
    fixes.push({
      id: 'flat-orientation',
      label: 'Print flat',
      description: 'Reorient for flat printing (less supports)',
      prompt: 'Redesign the model to print flat on its largest face to minimize supports',
      category: 'print',
      relevance: 0.55
    });
  }

  // Always offer some universal fixes
  fixes.push({
    id: 'add-chamfer',
    label: 'Add bed chamfer',
    description: 'Add chamfer to bottom edges for better bed adhesion',
    prompt: 'Add a 1mm chamfer to all edges that touch the print bed',
    category: 'print',
    relevance: 0.4
  });

  return fixes;
}

/**
 * Remove duplicate fixes
 */
function deduplicateFixes(fixes: SmartQuickFix[]): SmartQuickFix[] {
  const seen = new Set<string>();
  return fixes.filter(fix => {
    if (seen.has(fix.id)) {
      return false;
    }
    seen.add(fix.id);
    return true;
  });
}

/**
 * Get default quick fixes for when GST is not available
 */
export function getDefaultQuickFixes(): SmartQuickFix[] {
  return [
    {
      id: 'scale-up',
      label: 'Make bigger',
      description: 'Scale up by 25%',
      prompt: 'Scale the entire model up by 25%',
      category: 'dimension',
      relevance: 0.5
    },
    {
      id: 'scale-down',
      label: 'Make smaller',
      description: 'Scale down by 25%',
      prompt: 'Scale the entire model down by 25%',
      category: 'dimension',
      relevance: 0.5
    },
    {
      id: 'thicker-walls',
      label: 'Thicker walls',
      description: 'Increase wall thickness',
      prompt: 'Increase all wall thicknesses by 50%',
      category: 'structure',
      relevance: 0.5
    },
    {
      id: 'looser-fit',
      label: 'Looser tolerances',
      description: 'Add clearance for easier assembly',
      prompt: 'Add 0.2mm clearance to all mating surfaces and holes',
      category: 'tolerance',
      relevance: 0.5
    },
    {
      id: 'tighter-fit',
      label: 'Tighter tolerances',
      description: 'Reduce clearance for snug fit',
      prompt: 'Reduce clearance on mating surfaces by 0.1mm for a tighter fit',
      category: 'tolerance',
      relevance: 0.5
    }
  ];
}

export default {
  analyzeForQuickFixes,
  getDefaultQuickFixes
};
