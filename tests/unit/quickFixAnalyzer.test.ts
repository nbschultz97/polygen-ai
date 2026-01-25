/**
 * Quick Fix Analyzer Unit Tests
 * Tests the smart quick fix generation logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeForQuickFixes, getDefaultQuickFixes } from '../../services/quickFixAnalyzer';
import {
  mockGST,
  mockGSTWithScrewHolesTree,
  mockGSTWithGearTree,
  mockGSTWithThreadsTree,
  mockGSTWithRoundedCubeTree,
  mockGSTUpright,
  mockGSTLarge,
  mockGSTSmall,
  mockValidationSuccess,
  mockValidationNonManifold,
  mockValidationGSTMismatch,
  mockValidationThinWall,
  mockScadCode
} from '../mocks/types';

describe('QuickFixAnalyzer', () => {
  describe('analyzeForQuickFixes', () => {
    it('should return an array of quick fixes', () => {
      const fixes = analyzeForQuickFixes(mockGST, mockValidationSuccess, mockScadCode);
      
      expect(Array.isArray(fixes)).toBe(true);
      expect(fixes.length).toBeGreaterThan(0);
    });

    it('should return at most 8 fixes', () => {
      const fixes = analyzeForQuickFixes(
        mockGSTWithScrewHolesTree,
        mockValidationNonManifold,
        mockScadCode
      );
      
      expect(fixes.length).toBeLessThanOrEqual(8);
    });

    it('should sort fixes by relevance (highest first)', () => {
      const fixes = analyzeForQuickFixes(
        mockGSTWithScrewHolesTree,
        mockValidationSuccess,
        mockScadCode
      );
      
      for (let i = 1; i < fixes.length; i++) {
        expect(fixes[i - 1].relevance).toBeGreaterThanOrEqual(fixes[i].relevance);
      }
    });

    it('should not contain duplicate fix IDs', () => {
      const fixes = analyzeForQuickFixes(mockGST, mockValidationSuccess, mockScadCode);
      const ids = fixes.map(f => f.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids.length).toBe(uniqueIds.length);
    });

    describe('component-based fixes', () => {
      it('should suggest tolerance fixes for screw holes', () => {
        const fixes = analyzeForQuickFixes(
          mockGSTWithScrewHolesTree,
          mockValidationSuccess,
          mockScadCode
        );
        
        const toleranceFixes = fixes.filter(f => f.category === 'tolerance');
        expect(toleranceFixes.length).toBeGreaterThan(0);
        
        const hasTighterFit = fixes.some(f => f.id === 'tighter-fit');
        const hasLooserFit = fixes.some(f => f.id === 'looser-fit');
        expect(hasTighterFit || hasLooserFit).toBe(true);
      });

      it('should suggest gear-specific fixes for gears', () => {
        const fixes = analyzeForQuickFixes(
          mockGSTWithGearTree,
          mockValidationSuccess,
          mockScadCode
        );
        
        const gearFixes = fixes.filter(f => 
          f.id === 'more-teeth' || f.id === 'thicker-gear'
        );
        expect(gearFixes.length).toBeGreaterThan(0);
      });

      it('should suggest thread pitch fixes for threaded parts', () => {
        const fixes = analyzeForQuickFixes(
          mockGSTWithThreadsTree,
          mockValidationSuccess,
          mockScadCode
        );
        
        const threadFixes = fixes.filter(f =>
          f.id === 'finer-pitch' || f.id === 'coarser-pitch'
        );
        expect(threadFixes.length).toBeGreaterThan(0);
      });

      it('should suggest rounding fixes for rounded cubes', () => {
        const fixes = analyzeForQuickFixes(
          mockGSTWithRoundedCubeTree,
          mockValidationSuccess,
          mockScadCode
        );
        
        const hasRoundingFix = fixes.some(f => f.id === 'more-rounding');
        expect(hasRoundingFix).toBe(true);
      });
    });

    describe('validation-based fixes', () => {
      it('should suggest geometry fix for non-manifold geometry', () => {
        const fixes = analyzeForQuickFixes(
          mockGST,
          mockValidationNonManifold,
          mockScadCode
        );
        
        const manifoldFix = fixes.find(f => f.id === 'fix-manifold');
        expect(manifoldFix).toBeDefined();
        expect(manifoldFix!.relevance).toBe(1.0);
        expect(manifoldFix!.category).toBe('geometry');
      });

      it('should suggest scale fix for GST mismatch', () => {
        const fixes = analyzeForQuickFixes(
          mockGST,
          mockValidationGSTMismatch,
          mockScadCode
        );
        
        const scaleFix = fixes.find(f => f.id === 'scale-to-match');
        expect(scaleFix).toBeDefined();
        expect(scaleFix!.description).toContain('35%');
      });

      it('should suggest thicker walls for thin wall warnings', () => {
        const fixes = analyzeForQuickFixes(
          mockGST,
          mockValidationThinWall,
          mockScadCode
        );
        
        const wallFix = fixes.find(f => f.id === 'thicker-walls');
        expect(wallFix).toBeDefined();
        expect(wallFix!.category).toBe('print');
      });
    });

    describe('bounding box-based fixes', () => {
      it('should suggest scale down for large models', () => {
        const largeValidation = {
          ...mockValidationSuccess,
          boundingBox: {
            min: [0, 0, 0] as [number, number, number],
            max: [300, 300, 200] as [number, number, number]
          }
        };
        
        const fixes = analyzeForQuickFixes(
          mockGSTLarge,
          largeValidation,
          mockScadCode
        );
        
        const scaleDownFix = fixes.find(f => f.id === 'scale-down');
        expect(scaleDownFix).toBeDefined();
        expect(scaleDownFix!.description).toContain('300');
      });

      it('should suggest scale up for very small models', () => {
        const smallValidation = {
          ...mockValidationSuccess,
          boundingBox: {
            min: [0, 0, 0] as [number, number, number],
            max: [10, 8, 3] as [number, number, number]
          }
        };
        
        const fixes = analyzeForQuickFixes(
          mockGSTSmall,
          smallValidation,
          mockScadCode
        );
        
        const scaleUpFix = fixes.find(f => f.id === 'scale-up');
        expect(scaleUpFix).toBeDefined();
      });
    });

    describe('print orientation-based fixes', () => {
      it('should suggest flat print orientation for upright models', () => {
        const fixes = analyzeForQuickFixes(
          mockGSTUpright,
          mockValidationSuccess,
          mockScadCode
        );
        
        const orientationFix = fixes.find(f => f.id === 'flat-orientation');
        expect(orientationFix).toBeDefined();
        expect(orientationFix!.category).toBe('print');
      });

      it('should always include bed chamfer suggestion', () => {
        const fixes = analyzeForQuickFixes(
          mockGST,
          mockValidationSuccess,
          mockScadCode
        );
        
        const chamferFix = fixes.find(f => f.id === 'add-chamfer');
        expect(chamferFix).toBeDefined();
      });
    });

    describe('parameter-based fixes', () => {
      it('should suggest double walls when wall_thickness parameter exists', () => {
        const gstWithWallThickness = {
          ...mockGST,
          globalParameters: [
            { name: 'wall_thickness', value: 2, unit: 'mm' as const }
          ]
        };
        
        const fixes = analyzeForQuickFixes(
          gstWithWallThickness,
          mockValidationSuccess,
          mockScadCode
        );
        
        const wallFix = fixes.find(f => f.id === 'double-walls');
        expect(wallFix).toBeDefined();
        expect(wallFix!.category).toBe('structure');
      });

      it('should suggest adding clearance when hole_diameter exists without clearance', () => {
        const gstWithHoles = {
          ...mockGST,
          globalParameters: [
            { name: 'hole_diameter', value: 5, unit: 'mm' as const }
          ]
        };
        
        const fixes = analyzeForQuickFixes(
          gstWithHoles,
          mockValidationSuccess,
          mockScadCode
        );
        
        const clearanceFix = fixes.find(f => f.id === 'add-clearance');
        expect(clearanceFix).toBeDefined();
        expect(clearanceFix!.category).toBe('tolerance');
      });
    });
  });

  describe('getDefaultQuickFixes', () => {
    it('should return a non-empty array of default fixes', () => {
      const fixes = getDefaultQuickFixes();
      
      expect(Array.isArray(fixes)).toBe(true);
      expect(fixes.length).toBe(5);
    });

    it('should include scale up and scale down options', () => {
      const fixes = getDefaultQuickFixes();
      
      expect(fixes.some(f => f.id === 'scale-up')).toBe(true);
      expect(fixes.some(f => f.id === 'scale-down')).toBe(true);
    });

    it('should include tolerance fixes', () => {
      const fixes = getDefaultQuickFixes();
      
      expect(fixes.some(f => f.id === 'looser-fit')).toBe(true);
      expect(fixes.some(f => f.id === 'tighter-fit')).toBe(true);
    });

    it('should include structural fix', () => {
      const fixes = getDefaultQuickFixes();
      
      expect(fixes.some(f => f.id === 'thicker-walls')).toBe(true);
    });

    it('should have all required properties on each fix', () => {
      const fixes = getDefaultQuickFixes();
      
      for (const fix of fixes) {
        expect(fix).toHaveProperty('id');
        expect(fix).toHaveProperty('label');
        expect(fix).toHaveProperty('description');
        expect(fix).toHaveProperty('prompt');
        expect(fix).toHaveProperty('category');
        expect(fix).toHaveProperty('relevance');
        expect(typeof fix.id).toBe('string');
        expect(typeof fix.label).toBe('string');
        expect(typeof fix.relevance).toBe('number');
        expect(fix.relevance).toBeGreaterThanOrEqual(0);
        expect(fix.relevance).toBeLessThanOrEqual(1);
      }
    });

    it('should have valid categories', () => {
      const validCategories = ['tolerance', 'dimension', 'structure', 'print', 'geometry'];
      const fixes = getDefaultQuickFixes();
      
      for (const fix of fixes) {
        expect(validCategories).toContain(fix.category);
      }
    });
  });

  describe('fix prompt quality', () => {
    it('should have actionable prompts', () => {
      const fixes = analyzeForQuickFixes(
        mockGSTWithScrewHolesTree,
        mockValidationSuccess,
        mockScadCode
      );
      
      for (const fix of fixes) {
        expect(fix.prompt.length).toBeGreaterThan(10);
        // Prompts should be instructions, not questions
        expect(fix.prompt.endsWith('?')).toBe(false);
      }
    });

    it('should have descriptive labels', () => {
      const fixes = analyzeForQuickFixes(mockGST, mockValidationSuccess, mockScadCode);
      
      for (const fix of fixes) {
        expect(fix.label.length).toBeGreaterThan(3);
        expect(fix.label.length).toBeLessThan(30);
      }
    });
  });
});
