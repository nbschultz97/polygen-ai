import {
  AlertTriangle,
  Download,
  Info,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Zap,
  ZapOff,
} from 'lucide-react';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls, STLLoader } from 'three-stdlib';
import { cleanupInstance, loadOpenSCAD } from '../services/openscadLoader';

interface ScadRendererProps {
  code: string;
  isProUser: boolean;
}

const ScadRenderer: React.FC<ScadRendererProps> = memo(({ code, isProUser }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevCodeRef = useRef<string>('');
  const hasAutoRenderedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [isDirty, setIsDirty] = useState(true);
  const [renderStats, setRenderStats] = useState<{ time: number; vertices: number } | null>(null);
  const [stlData, setStlData] = useState<Uint8Array | null>(null);
  const [complexityWarning, setComplexityWarning] = useState<string | null>(null);

  const downloadSTL = useCallback(() => {
    if (!stlData) return;
    const blob = new Blob([stlData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polygen-model.stl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stlData]);

  // Mark as dirty when code changes
  useEffect(() => {
    setIsDirty(true);
  }, [code]);

  // Initialize ThreeJS Scene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');

    const gridHelper = new THREE.GridHelper(200, 20, '#334155', '#1e293b');
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x6366f1, 0.8);
    backLight.position.set(-50, -20, -50);
    scene.add(backLight);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(100, 100, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Dispose of Three.js resources
      if (rendererRef.current) {
        if (containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }

      // Dispose of scene objects
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            } else if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            }
          }
        });
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);

  // Mobile detection for "Safe Mode" rendering
  const isMobile = useCallback(() => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    );
  }, []);

  // Complexity analysis to prevent browser hangs
  const analyzeComplexity = useCallback(
    (
      scadCode: string
    ): {
      hasDangerousComplexity: boolean;
      hasThreading: boolean;
      maxFn: number;
      warning?: string;
    } => {
      // Detect explicit high $fn values (e.g., $fn=128, $fn = 200)
      const fnMatches = scadCode.match(/\$fn\s*[=:]\s*(\d+)/gi) || [];
      const fnValues = fnMatches.map((m) => parseInt(m.replace(/\$fn\s*[=:]\s*/i, ''), 10));
      const maxFn = fnValues.length > 0 ? Math.max(...fnValues) : 0;

      // Detect threading patterns that generate many triangles
      const hasThreading = /thread|screw_thread|metric_thread|knurl|gear_tooth/i.test(scadCode);

      // Detect high sphere/cylinder counts with high $fn
      const hasManyCircularOps =
        (scadCode.match(/sphere|cylinder|circle|rotate_extrude/gi) || []).length > 20;

      const hasDangerousComplexity =
        maxFn > 100 || (hasThreading && maxFn > 64) || (hasManyCircularOps && maxFn > 64);

      let warning: string | undefined;
      if (hasDangerousComplexity) {
        if (maxFn > 100) {
          warning = `High resolution detected ($fn=${maxFn}). Rendering may be slow.`;
        } else if (hasThreading) {
          warning = 'Threading detected with high resolution. Applying safe settings.';
        }
      }

      return { hasDangerousComplexity, hasThreading, maxFn, warning };
    },
    []
  );

  const compileAndRender = useCallback(async () => {
    if (!code || !code.trim() || loading) return;

    // Analyze complexity before rendering
    const complexity = analyzeComplexity(code);
    const mobile = isMobile();

    // Smart complexity guard: Apply safe settings based on device AND code complexity
    let renderCode = code;
    let activeWarning: string | null = null;

    if (mobile) {
      // Mobile: Always use safe settings, extra conservative for threading
      const safeFn = complexity.hasThreading ? 24 : 32;
      renderCode = `$fn=${safeFn}; $fs=0.5; $fa=5; // MOBILE GUARD ACTIVE\n` + code;
      if (complexity.hasThreading) {
        activeWarning = 'Mobile + threading: using $fn=24 for stability';
      }
    } else if (complexity.hasDangerousComplexity) {
      // Desktop with dangerous complexity: Cap at reasonable values
      const cappedFn = complexity.hasThreading ? 48 : 64;
      renderCode = `$fn=${cappedFn}; $fs=0.3; $fa=3; // COMPLEXITY GUARD ACTIVE\n` + code;
      activeWarning = complexity.warning || 'Complexity reduced for stability';
      console.warn('Complexity guard activated:', activeWarning);
    }

    const startTime = performance.now();
    setLoading(true);
    setError(null);
    setComplexityWarning(activeWarning);

    let errorLog = '';
    let instance: any = null;

    // Remove existing model
    const existingModel = sceneRef.current?.getObjectByName('modelGroup');
    if (existingModel) {
      // Dispose of existing model resources
      existingModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      sceneRef.current?.remove(existingModel);
    }

    try {
      const loaderResult = await loadOpenSCAD();
      const { OpenSCAD } = loaderResult;

      if (!OpenSCAD || typeof OpenSCAD !== 'function') {
        throw new Error('OpenSCAD engine not available. Please refresh the page.');
      }

      // Create OpenSCAD instance - ES module import handles WASM location automatically
      const wrapper = await OpenSCAD({
        noInitialRun: true,
        print: () => {},
        printErr: (text: string) => {
          // Filter benign GL errors often seen in WASM
          if (
            text &&
            text.toLowerCase().includes('error') &&
            !text.includes('GL_INVALID_OPERATION') &&
            !text.includes('GL_INVALID_ENUM')
          ) {
            errorLog += text + '\n';
          }
        },
      });

      // Get the low-level instance with FS and callMain
      instance =
        'getInstance' in wrapper && typeof wrapper.getInstance === 'function'
          ? wrapper.getInstance()
          : wrapper;

      if (!instance?.FS) {
        console.error('OpenSCAD getInstance() returned:', instance);
        throw new Error('OpenSCAD WASM failed to initialize. Try refreshing the page.');
      }

      instance.FS.writeFile('/input.scad', renderCode);
      const exitCode = instance.callMain(['/input.scad', '-o', 'output.stl']);

      if (exitCode !== 0 || (errorLog.includes('ERROR') && !errorLog.includes('GL_INVALID'))) {
        throw new Error(`Compiler Error:\n${errorLog || 'Exit Code ' + exitCode}`);
      }

      // Safely read STL data
      let stlData: Uint8Array | null = null;
      try {
        stlData = instance.FS.readFile('/output.stl');
      } catch {
        throw new Error(
          'Failed to read output STL. Check for infinite recursion or empty geometry.'
        );
      }

      if (!stlData || stlData.length <= 84) {
        throw new Error(
          'Render Successful, but scene is empty. Check boolean/difference operations.'
        );
      }

      // Store STL data for download
      setStlData(stlData);

      const loader = new STLLoader();
      const geometry = loader.parse(stlData.buffer as ArrayBuffer);

      if (!geometry || !geometry.attributes.position) {
        throw new Error('Failed to parse STL geometry');
      }

      geometry.center();

      const group = new THREE.Group();
      group.name = 'modelGroup';

      const material = new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        roughness: 0.4,
        metalness: 0.2,
        flatShading: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(geometry, 20);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.15, transparent: true })
      );
      group.add(line);

      group.rotation.x = -Math.PI / 2;
      sceneRef.current?.add(group);

      // Auto-focus camera
      if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0 && isFinite(maxDim)) {
          const fov = cameraRef.current.fov * (Math.PI / 180);
          let cameraZ = Math.abs((maxDim / 2) * Math.tan(fov * 2));
          cameraZ *= 2.8;

          const center = box.getCenter(new THREE.Vector3());
          if (isFinite(center.x) && isFinite(center.y) && isFinite(center.z)) {
            cameraRef.current.position.set(
              center.x + cameraZ,
              center.y + cameraZ,
              center.z + cameraZ
            );
            cameraRef.current.lookAt(center);
            controlsRef.current.target.copy(center);
            controlsRef.current.update();
          }
        }
      }

      setRenderStats({
        time: Math.round(performance.now() - startTime),
        vertices: geometry.attributes.position.count,
      });
      setIsDirty(false);
    } catch (err: any) {
      console.error('Renderer Error:', err);
      setError(err?.message || 'Failed to render. Please check your code.');
    } finally {
      // Clean up OpenSCAD instance
      if (instance) {
        cleanupInstance(instance);
      }
      setLoading(false);
    }
  }, [code, loading]);

  // Auto-update logic with debounce
  useEffect(() => {
    if (!autoUpdate || !isDirty) return;

    const timer = setTimeout(() => {
      compileAndRender();
    }, 2000); // 2 second delay to wait for user to finish typing

    return () => clearTimeout(timer);
  }, [code, autoUpdate, isDirty, compileAndRender]);

  // Auto-render on first code generation (when code goes from empty to having content)
  // This makes the 3D preview show automatically after initial generation
  useEffect(() => {
    const prevCode = prevCodeRef.current;
    prevCodeRef.current = code;

    // Only auto-render once when we first receive code
    if (code && code.trim() && !prevCode && !hasAutoRenderedRef.current && !loading) {
      hasAutoRenderedRef.current = true;
      // Small delay to ensure scene is ready
      const timer = setTimeout(() => {
        compileAndRender();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [code, loading, compileAndRender]);

  return (
    <div className="relative w-full h-full bg-[#0f172a] overflow-hidden group font-sans">
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur border border-white/10 rounded-xl p-1 shadow-2xl">
            <button
              onClick={() => setAutoUpdate(!autoUpdate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                autoUpdate
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={autoUpdate ? 'Disable Auto-Render' : 'Enable Auto-Render (Experimental)'}
            >
              {autoUpdate ? (
                <Zap className="w-3 h-3 fill-current" />
              ) : (
                <ZapOff className="w-3 h-3" />
              )}
              {autoUpdate ? 'LIVE' : 'MANUAL'}
            </button>

            <button
              onClick={compileAndRender}
              disabled={loading || (!isDirty && !error)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDirty || error
                  ? 'bg-white text-slate-950 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-500 cursor-default'
              }`}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              RENDER MODEL
            </button>
          </div>

          {!isProUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 backdrop-blur border border-white/10 rounded-full w-fit">
              <Lock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                Free Tier Preview
              </span>
            </div>
          )}
        </div>

        {renderStats && !loading && !error && (
          <div className="bg-slate-900/80 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl pointer-events-auto text-[10px] space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between gap-4 text-slate-400">
                <span>Compile Time:</span>
                <span className="text-emerald-400 font-mono">{renderStats.time}ms</span>
              </div>
              <div className="flex justify-between gap-4 text-slate-400">
                <span>Mesh Vertices:</span>
                <span className="text-indigo-400 font-mono">
                  {renderStats.vertices.toLocaleString()}
                </span>
              </div>
              {complexityWarning && (
                <div className="flex items-center gap-1.5 text-amber-400 pt-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[9px]">{complexityWarning}</span>
                </div>
              )}
            </div>
            {stlData && (
              <button
                onClick={downloadSTL}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-colors"
              >
                <Download className="w-3 h-3" />
                Download STL
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm z-20 transition-all">
          <div className="relative">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            <Loader2 className="w-12 h-12 text-indigo-500 opacity-20" />
          </div>
          <p className="mt-4 text-sm font-bold text-white tracking-widest uppercase">
            Calculating CSG...
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Initializing OpenSCAD Engine</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-30 p-8 text-center">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-xl">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            {error.includes('Network error') || error.includes('could not be retrieved') ? (
              <>
                <h3 className="text-xl font-bold text-white mb-2">3D Preview Unavailable</h3>
                <p className="text-sm text-slate-400 mb-4">
                  The OpenSCAD engine couldn't load from CDN. This is usually a network restriction.
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs text-amber-300 font-medium mb-2">Workarounds:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Use "Open in OpenSCAD" to view in the desktop app</li>
                    <li>• Try a different network (not VPN/corporate)</li>
                    <li>• The code generation still works - just preview is unavailable</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Geometric Conflict</h3>
                <p className="text-sm text-slate-400 mb-6">
                  The code produced an invalid or empty mesh. This often happens if a{' '}
                  <code>difference()</code> operation removes the entire base object.
                </p>
                <pre className="text-xs text-left bg-black/40 p-4 rounded-xl text-red-300 overflow-auto max-h-[150px] whitespace-pre-wrap font-mono border border-red-900/30 mb-6">
                  {error}
                </pre>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={compileAndRender}
                    className="px-6 py-2 bg-white text-slate-950 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry Render
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State */}
      {!renderStats && !loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 z-0 text-center pointer-events-none">
          <div className="p-6 rounded-full bg-slate-800/50 mb-4">
            <Play className="w-10 h-10 text-indigo-400 opacity-40 fill-current translate-x-1" />
          </div>
          <h3 className="text-lg font-medium text-slate-400">3D Preview Ready</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-xs">
            Click "Render Model" to compile the current code into 3D geometry.
          </p>
        </div>
      )}

      {/* Navigation Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-[9px] text-slate-400 px-4 py-2 rounded-full border border-white/5 flex gap-4 shadow-2xl">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-indigo-400" /> LEFT: ROTATE
          </span>
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-indigo-400" /> RIGHT: PAN
          </span>
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-indigo-400" /> SCROLL: ZOOM
          </span>
        </div>
      </div>
    </div>
  );
});

ScadRenderer.displayName = 'ScadRenderer';

export default ScadRenderer;
