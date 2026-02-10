/**
 * STL-to-OpenSCAD Converter Tests
 */
import { describe, expect, it } from 'vitest';
import { convertStlToScad, getStlInfo } from '../../services/stlToScadConverter';

// Helper: create a minimal binary STL with N triangles
function createBinaryStl(triangles: Array<{ normal: number[]; v1: number[]; v2: number[]; v3: number[] }>): Uint8Array {
  const size = 84 + triangles.length * 50;
  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  const arr = new Uint8Array(buf);

  // 80-byte header (zeros)
  view.setUint32(80, triangles.length, true);

  let offset = 84;
  for (const tri of triangles) {
    for (const vec of [tri.normal, tri.v1, tri.v2, tri.v3]) {
      view.setFloat32(offset, vec[0], true); offset += 4;
      view.setFloat32(offset, vec[1], true); offset += 4;
      view.setFloat32(offset, vec[2], true); offset += 4;
    }
    view.setUint16(offset, 0, true); offset += 2; // attribute byte count
  }

  return arr;
}

// Helper: create ASCII STL
function createAsciiStl(triangles: Array<{ normal: number[]; v1: number[]; v2: number[]; v3: number[] }>): Uint8Array {
  let text = 'solid test\n';
  for (const tri of triangles) {
    text += `  facet normal ${tri.normal[0]} ${tri.normal[1]} ${tri.normal[2]}\n`;
    text += `    outer loop\n`;
    text += `      vertex ${tri.v1[0]} ${tri.v1[1]} ${tri.v1[2]}\n`;
    text += `      vertex ${tri.v2[0]} ${tri.v2[1]} ${tri.v2[2]}\n`;
    text += `      vertex ${tri.v3[0]} ${tri.v3[1]} ${tri.v3[2]}\n`;
    text += `    endloop\n`;
    text += `  endfacet\n`;
  }
  text += 'endsolid test\n';
  return new TextEncoder().encode(text);
}

const singleTriangle = [
  { normal: [0, 0, 1], v1: [0, 0, 0], v2: [1, 0, 0], v3: [0, 1, 0] }
];

const twoTrianglesSharedEdge = [
  { normal: [0, 0, 1], v1: [0, 0, 0], v2: [1, 0, 0], v3: [0, 1, 0] },
  { normal: [0, 0, 1], v1: [1, 0, 0], v2: [1, 1, 0], v3: [0, 1, 0] },
];

describe('STL to SCAD Converter', () => {
  describe('getStlInfo', () => {
    it('detects binary STL info', () => {
      const data = createBinaryStl(singleTriangle);
      const info = getStlInfo(data);
      expect(info.isBinary).toBe(true);
      expect(info.triangleCount).toBe(1);
      expect(info.estimatedCodeSize).toBeGreaterThan(0);
    });

    it('detects ASCII STL info', () => {
      const data = createAsciiStl(singleTriangle);
      const info = getStlInfo(data);
      expect(info.isBinary).toBe(false);
      expect(info.triangleCount).toBe(1);
    });

    it('handles empty/tiny data as ASCII with 0 triangles', () => {
      const data = new TextEncoder().encode('solid empty\nendsolid empty\n');
      const info = getStlInfo(data);
      expect(info.triangleCount).toBe(0);
    });
  });

  describe('convertStlToScad - binary', () => {
    it('converts single triangle', () => {
      const data = createBinaryStl(singleTriangle);
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(1);
      expect(result.vertexCount).toBe(3);
      expect(result.scadCode).toContain('polyhedron(');
      expect(result.scadCode).toContain('module imported_stl()');
      expect(result.scadCode).toContain('imported_stl();');
    });

    it('deduplicates shared vertices', () => {
      const data = createBinaryStl(twoTrianglesSharedEdge);
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(2);
      // 2 triangles sharing an edge = 4 unique vertices
      expect(result.vertexCount).toBe(4);
    });

    it('uses custom model name', () => {
      const data = createBinaryStl(singleTriangle);
      const result = convertStlToScad(data, { modelName: 'my_model' });
      expect(result.scadCode).toContain('module my_model()');
      expect(result.scadCode).toContain('my_model();');
    });
  });

  describe('convertStlToScad - ASCII', () => {
    it('converts single ASCII triangle', () => {
      const data = createAsciiStl(singleTriangle);
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(1);
      expect(result.vertexCount).toBe(3);
      expect(result.scadCode).toContain('polyhedron(');
    });

    it('converts multiple ASCII triangles with dedup', () => {
      const data = createAsciiStl(twoTrianglesSharedEdge);
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(2);
      expect(result.vertexCount).toBe(4);
    });

    it('handles scientific notation in vertex coords', () => {
      const tri = [{ normal: [0, 0, 1], v1: [1e-5, 2.5e3, -3.14], v2: [0, 0, 0], v3: [1, 1, 1] }];
      const data = createAsciiStl(tri);
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(1);
    });
  });

  describe('simplification', () => {
    it('does not simplify when triangle count <= 1000', () => {
      const data = createBinaryStl(singleTriangle);
      const result = convertStlToScad(data, { simplify: true });
      expect(result.triangleCount).toBe(1);
    });

    it('simplifies large meshes when requested', () => {
      // Create 1001+ triangles
      const triangles = [];
      for (let i = 0; i < 1100; i++) {
        triangles.push({
          normal: [0, 0, 1],
          v1: [i * 0.1, 0, 0],
          v2: [i * 0.1 + 0.05, 1, 0],
          v3: [i * 0.1 + 0.1, 0, 0],
        });
      }
      const data = createBinaryStl(triangles);
      const withSimplify = convertStlToScad(data, { simplify: true });
      const withoutSimplify = convertStlToScad(data, { simplify: false });
      // Simplified should have fewer or equal triangles
      expect(withSimplify.triangleCount).toBeLessThanOrEqual(withoutSimplify.triangleCount);
    });
  });

  describe('output format', () => {
    it('includes header comment', () => {
      const data = createBinaryStl(singleTriangle);
      const result = convertStlToScad(data);
      expect(result.scadCode).toContain('Converted from STL');
      expect(result.scadCode).toContain('PolyGen AI');
    });

    it('has correct points and faces arrays', () => {
      const data = createBinaryStl(singleTriangle);
      const result = convertStlToScad(data);
      expect(result.scadCode).toContain('points = [');
      expect(result.scadCode).toContain('faces = [');
    });

    it('estimatedCodeSize matches actual code length', () => {
      const data = createBinaryStl(twoTrianglesSharedEdge);
      const result = convertStlToScad(data);
      expect(result.estimatedCodeSize).toBe(result.scadCode.length);
    });
  });

  describe('edge cases', () => {
    it('handles file smaller than 84 bytes', () => {
      const data = new Uint8Array(10);
      // Should treat as ASCII (not binary since < 84 bytes)
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(0);
      expect(result.vertexCount).toBe(0);
    });

    it('handles binary STL with 0 triangles', () => {
      const data = createBinaryStl([]);
      const result = convertStlToScad(data);
      expect(result.triangleCount).toBe(0);
      expect(result.vertexCount).toBe(0);
      expect(result.scadCode).toContain('polyhedron(');
    });
  });
});
