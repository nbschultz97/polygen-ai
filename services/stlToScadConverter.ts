/**
 * STL-to-OpenSCAD Converter
 * Parses binary/ASCII STL files and outputs OpenSCAD polyhedron() code.
 * Inspired by https://github.com/raviriley/STL-to-OpenSCAD-Converter
 */

export interface StlConversionResult {
  scadCode: string;
  triangleCount: number;
  vertexCount: number;
  estimatedCodeSize: number;
}

export interface StlParseInfo {
  triangleCount: number;
  isBinary: boolean;
  estimatedCodeSize: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  normal: Vec3;
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
}

/**
 * Detect whether STL data is binary or ASCII
 */
function isBinarySTL(data: Uint8Array): boolean {
  // ASCII STL starts with "solid"
  if (data.length < 84) return false;
  const header = new TextDecoder().decode(data.slice(0, 5));
  if (header !== 'solid') return true;

  // Could still be binary with "solid" in header — check if triangle count makes sense
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;
  // If file size matches binary format, it's binary
  if (Math.abs(data.length - expectedSize) <= 1) return true;

  return false;
}

/**
 * Parse binary STL
 */
function parseBinarySTL(data: Uint8Array): Triangle[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const triangleCount = view.getUint32(80, true);
  const triangles: Triangle[] = [];

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    if (offset + 50 > data.length) break;

    const normal: Vec3 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    const v1: Vec3 = {
      x: view.getFloat32(offset + 12, true),
      y: view.getFloat32(offset + 16, true),
      z: view.getFloat32(offset + 20, true),
    };
    const v2: Vec3 = {
      x: view.getFloat32(offset + 24, true),
      y: view.getFloat32(offset + 28, true),
      z: view.getFloat32(offset + 32, true),
    };
    const v3: Vec3 = {
      x: view.getFloat32(offset + 36, true),
      y: view.getFloat32(offset + 40, true),
      z: view.getFloat32(offset + 44, true),
    };

    triangles.push({ normal, v1, v2, v3 });
    offset += 50;
  }

  return triangles;
}

/**
 * Parse ASCII STL
 */
function parseAsciiSTL(data: Uint8Array): Triangle[] {
  const text = new TextDecoder().decode(data);
  const triangles: Triangle[] = [];
  const facetRegex =
    /facet\s+normal\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+outer\s+loop\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+endloop\s+endfacet/gi;

  let match;
  while ((match = facetRegex.exec(text)) !== null) {
    triangles.push({
      normal: { x: parseFloat(match[1]), y: parseFloat(match[2]), z: parseFloat(match[3]) },
      v1: { x: parseFloat(match[4]), y: parseFloat(match[5]), z: parseFloat(match[6]) },
      v2: { x: parseFloat(match[7]), y: parseFloat(match[8]), z: parseFloat(match[9]) },
      v3: { x: parseFloat(match[10]), y: parseFloat(match[11]), z: parseFloat(match[12]) },
    });
  }

  return triangles;
}

/**
 * Deduplicate vertices and build indexed face list
 */
function buildIndexedMesh(triangles: Triangle[]): { points: Vec3[]; faces: number[][] } {
  const points: Vec3[] = [];
  const faces: number[][] = [];
  const vertexMap = new Map<string, number>();
  const PRECISION = 6;

  function getVertexIndex(v: Vec3): number {
    const key = `${v.x.toFixed(PRECISION)},${v.y.toFixed(PRECISION)},${v.z.toFixed(PRECISION)}`;
    let idx = vertexMap.get(key);
    if (idx === undefined) {
      idx = points.length;
      points.push(v);
      vertexMap.set(key, idx);
    }
    return idx;
  }

  for (const tri of triangles) {
    const i1 = getVertexIndex(tri.v1);
    const i2 = getVertexIndex(tri.v2);
    const i3 = getVertexIndex(tri.v3);
    faces.push([i1, i2, i3]);
  }

  return { points, faces };
}

/**
 * Simple mesh decimation using vertex clustering
 * Reduces vertex count by snapping vertices to a grid
 */
function simplifyMesh(triangles: Triangle[], targetReduction: number = 0.5): Triangle[] {
  // Grid-based vertex clustering
  // Calculate bounding box
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const tri of triangles) {
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
      minZ = Math.min(minZ, v.z);
      maxZ = Math.max(maxZ, v.z);
    }
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;

  // Grid resolution based on target reduction
  const gridSize = Math.max(rangeX, rangeY, rangeZ) * targetReduction * 0.05;
  if (gridSize === 0) return triangles;

  function snapVertex(v: Vec3): Vec3 {
    return {
      x: Math.round(v.x / gridSize) * gridSize,
      y: Math.round(v.y / gridSize) * gridSize,
      z: Math.round(v.z / gridSize) * gridSize,
    };
  }

  const simplified: Triangle[] = [];
  for (const tri of triangles) {
    const sv1 = snapVertex(tri.v1);
    const sv2 = snapVertex(tri.v2);
    const sv3 = snapVertex(tri.v3);

    // Skip degenerate triangles
    const k1 = `${sv1.x},${sv1.y},${sv1.z}`;
    const k2 = `${sv2.x},${sv2.y},${sv2.z}`;
    const k3 = `${sv3.x},${sv3.y},${sv3.z}`;
    if (k1 === k2 || k2 === k3 || k1 === k3) continue;

    simplified.push({ normal: tri.normal, v1: sv1, v2: sv2, v3: sv3 });
  }

  return simplified;
}

/**
 * Get STL file info without full conversion
 */
export function getStlInfo(data: Uint8Array): StlParseInfo {
  const binary = isBinarySTL(data);
  let triangleCount: number;

  if (binary) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    triangleCount = view.getUint32(80, true);
  } else {
    const text = new TextDecoder().decode(data);
    triangleCount = (text.match(/facet\s+normal/gi) || []).length;
  }

  // Rough estimate: ~40 chars per vertex, 3 unique vertices avg per triangle (with sharing ~1.5)
  const estimatedVertices = Math.round(triangleCount * 1.5);
  const estimatedCodeSize = estimatedVertices * 45 + triangleCount * 20 + 200;

  return { triangleCount, isBinary: binary, estimatedCodeSize };
}

/**
 * Convert STL data to OpenSCAD polyhedron code
 */
export function convertStlToScad(
  data: Uint8Array,
  options: { simplify?: boolean; modelName?: string } = {}
): StlConversionResult {
  const binary = isBinarySTL(data);
  let triangles = binary ? parseBinarySTL(data) : parseAsciiSTL(data);

  if (options.simplify && triangles.length > 1000) {
    triangles = simplifyMesh(triangles, 0.5);
  }

  const { points, faces } = buildIndexedMesh(triangles);

  // Format number to reasonable precision
  const fmt = (n: number): string => {
    const s = n.toFixed(4);
    // Remove trailing zeros
    return parseFloat(s).toString();
  };

  const name = options.modelName || 'imported_stl';

  let code = `// Converted from STL — ${triangles.length} triangles, ${points.length} vertices\n`;
  code += `// Generated by PolyGen AI STL-to-OpenSCAD Converter\n\n`;
  code += `module ${name}() {\n`;
  code += `  polyhedron(\n`;
  code += `    points = [\n`;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const comma = i < points.length - 1 ? ',' : '';
    code += `      [${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}]${comma}\n`;
  }

  code += `    ],\n`;
  code += `    faces = [\n`;

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const comma = i < faces.length - 1 ? ',' : '';
    code += `      [${f[0]}, ${f[1]}, ${f[2]}]${comma}\n`;
  }

  code += `    ]\n`;
  code += `  );\n`;
  code += `}\n\n`;
  code += `${name}();\n`;

  return {
    scadCode: code,
    triangleCount: faces.length,
    vertexCount: points.length,
    estimatedCodeSize: code.length,
  };
}
