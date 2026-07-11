import { ArrowRight, Check, Code2, Cpu, Sparkles } from 'lucide-react';

interface ProductStageProps {
  onTryDemo: () => void;
}

export default function ProductStage({ onTryDemo }: ProductStageProps) {
  return (
    <div className="product-stage mt-14 md:mt-20 text-left" aria-label="PolyGen generation workflow preview">
      <div className="product-stage__glow" aria-hidden="true" />
      <div className="product-stage__shell">
        <div className="product-stage__topbar">
          <div className="flex items-center gap-2">
            <span className="product-stage__dot bg-red-400/70" />
            <span className="product-stage__dot bg-amber-300/70" />
            <span className="product-stage__dot bg-emerald-400/70" />
          </div>
          <span>POLYGEN WORKSPACE</span>
          <span className="product-stage__status"><i /> MANIFOLD</span>
        </div>

        <div className="product-stage__grid">
          <section className="product-stage__prompt">
            <div className="product-stage__label">
              <Sparkles className="w-3.5 h-3.5" />
              Design prompt
            </div>
            <p className="product-stage__input">
              Create a rugged electronics enclosure with a removable vented lid,
              four M3 mounting posts, and rounded corners.
            </p>
            <div className="product-stage__chips">
              <span>120 × 80 × 32 mm</span>
              <span>PETG</span>
              <span>0.25 mm tolerance</span>
            </div>
            <div className="product-stage__pipeline">
              <div><Check className="w-3.5 h-3.5" /><span>Geometry planned</span></div>
              <div><Check className="w-3.5 h-3.5" /><span>OpenSCAD generated</span></div>
              <div><Check className="w-3.5 h-3.5" /><span>Mesh validated</span></div>
            </div>
          </section>

          <section className="product-stage__model">
            <div className="product-stage__model-grid" aria-hidden="true" />
            <img
              src="/images/marketing/v2-openscad-enclosure.png"
              alt="AI-generated printable electronics enclosure"
              className="product-stage__model-image"
            />
            <span className="product-stage__axis product-stage__axis--x">X</span>
            <span className="product-stage__axis product-stage__axis--y">Y</span>
            <span className="product-stage__axis product-stage__axis--z">Z</span>
            <div className="product-stage__model-meta">
              <strong>enclosure_v4</strong>
              <span>42.8 cm³ · 18m print</span>
            </div>
          </section>

          <section className="product-stage__code">
            <div className="product-stage__label">
              <Code2 className="w-3.5 h-3.5" />
              Parametric output
            </div>
            <pre><code><span>module</span> enclosure() {'{'}
  rounded_box([120, 80, 32], r=6);
  <em>mounting_posts</em>(m3, inset=8);
  vent_array(rows=4, spacing=6);
{'}'}

difference() {'{'}
  enclosure();
  inner_cavity(wall=2.4);
{'}'}</code></pre>
            <div className="product-stage__verified">
              <Cpu className="w-4 h-4" />
              <div><strong>Printability verified</strong><span>Closed mesh · no errors</span></div>
            </div>
          </section>
        </div>
      </div>

      <div className="product-stage__footer">
        <div>
          <strong>From sentence to validated geometry</strong>
          <span>Prompt, refine, preview, and export without leaving the browser.</span>
        </div>
        <button onClick={onTryDemo} className="group">
          Build your first model
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
