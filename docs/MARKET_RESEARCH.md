# PolyGen AI — Competitive Market Research Report

**Date:** February 9, 2026  
**Prepared for:** Ceradon Systems / PolyGen AI  
**Product:** Text-to-3D SaaS generating printable OpenSCAD code via Gemini + Claude  
**URL:** https://polygen.ceradonsystems.com

---

## Table of Contents

1. [Direct Competitors](#1-direct-competitors)
2. [Market Size & Opportunity](#2-market-size--opportunity)
3. [Pricing Analysis](#3-pricing-analysis)
4. [Distribution Channels](#4-distribution-channels)
5. [Differentiation Strategy](#5-differentiation-strategy)
6. [Revenue Playbook](#6-revenue-playbook)

---

## 1. Direct Competitors

### Tier 1: Direct Competitors (Text-to-CAD / Parametric Output)

#### Adam (adam.new) — ⚠️ PRIMARY THREAT

- **URL:** https://adam.new
- **Pricing:** Standard $9.99/mo (100 generations), Pro $29.99/mo (unlimited), Enterprise custom
- **What they do:** Text-to-CAD generating OpenSCAD code with parametric sliders. Browser-based via WebAssembly. Exports STL and SCAD files. Includes BOSL, BOSL2, MCAD library support.
- **Tech stack:** LLM-powered code generation → OpenSCAD → WebAssembly rendering. Open-source frontend (CADAM on GitHub).
- **Funding:** $4.1M seed (Oct 2025, TQ Ventures lead), total ~$6.1M raised. YC W25 batch.
- **Traction:** 10M+ social media impressions at launch. "Hundreds of paying customers." Viral on Twitter/X.
- **Strengths vs PolyGen:**
  - YC backing and VC funding gives runway and credibility
  - Open-source codebase (CADAM) builds community trust
  - Parametric slider UI for adjusting dimensions post-generation
  - Moving to AI copilot for professional CAD workflows (enterprise play)
  - Consumer-first strategy already validated
- **Weaknesses vs PolyGen:**
  - Higher price point ($9.99 vs free tier, $29.99 vs $19/mo Pro)
  - No free tier (must pay to use)
  - Consumer-focused — not targeting 3D printing / defense / tactical niche
  - VC-funded means eventual pressure to pivot or raise prices
  - No specific focus on printability or functional parts

#### Zoo.dev / KittyCAD — Enterprise CAD Platform

- **URL:** https://zoo.dev
- **Pricing:** Free tier (20 min AI reasoning time), Pro ~$100/mo, Enterprise $1,000+/yr. API: $10/mo free credits, pay-as-you-go after.
- **What they do:** Full desktop CAD application with AI assistant ("Zookeeper"). Uses their own language (KCL — KittyCAD Language) for parametric modeling. Text-to-CAD converts prompts into KCL code. Cloud-based geometry engine.
- **Tech stack:** Custom geometry engine (cloud), KCL language, native desktop app + web test env. Rust-based.
- **Funding:** Pre-seed from Embedded. NVIDIA Inception program member. Founded by Jessie Frazelle (prominent open-source figure).
- **Traction:** Active community forum. Enterprise-focused. Open-source components.
- **Strengths vs PolyGen:**
  - Full CAD platform (sketch, extrude, revolve, assemblies) — not just generation
  - Custom geometry engine = no dependency on OpenSCAD
  - Strong engineering team and open-source credibility
  - Enterprise pricing validates high-value market
- **Weaknesses vs PolyGen:**
  - Massive price gap for hobbyists ($100+/mo vs $19/mo)
  - Desktop app required (not purely browser-based)
  - Requires internet connection (cloud geometry engine)
  - Steep learning curve — KCL is a new proprietary language
  - Overkill for makers who just want a printable part
  - Community complaints about pricing jump (Free → $1,000/yr)

### Tier 2: Text-to-3D (Mesh Output, Not Parametric)

#### Meshy.ai

- **URL:** https://www.meshy.ai
- **Pricing:** Free (100 credits/mo, 10 downloads), Pro ~$20/mo (1,000 credits, ~50 models), Studio ~$50/mo (4,000 credits, ~400 models), Enterprise custom
- **What they do:** Text-to-3D and image-to-3D mesh generation. Focused on game assets, AR/VR. Produces textured 3D meshes.
- **Funding:** Undisclosed but well-funded. Trusted by leading game studios.
- **Traction:** 4.8/5 rating on review sites. Significant user base among game devs.
- **Strengths vs PolyGen:** Superior visual quality for organic/artistic models; texturing; animation support; large community
- **Weaknesses vs PolyGen:** Mesh output only (not editable/parametric); not optimized for 3D printing; models aren't dimensionally accurate; CC BY 4.0 on free tier (public models)

#### Tripo3D

- **URL:** https://www.tripo3d.ai
- **Pricing:** Free (300 credits/mo), Professional $11.94/mo annual ($19.90 monthly), Advanced $29.94/mo annual ($49.90 monthly)
- **What they do:** Text-to-3D and image-to-3D. Features include rigging, retopology, texturing, stylization, smart low-poly. "Tripo v3.0 Ultra" model.
- **Traction:** Growing platform with studio features. Has 3D printing export mode.
- **Strengths vs PolyGen:** Lower price point; batch generation; rigging/animation; good for game assets
- **Weaknesses vs PolyGen:** Mesh output only; free tier models are public (CC BY 4.0); not parametric; limited dimensional control

#### Luma AI (Genie)

- **URL:** https://lumalabs.ai
- **Pricing:** Freemium (credit-based). Primarily focused on video generation (Dream Machine) now.
- **Funding:** $70M+ total raised (Series B). Backed by Amplify Partners, Nvidia's NVentures, General Catalyst.
- **What they do:** Started as text/image-to-3D (Genie), pivoted heavily toward AI video generation (Dream Machine). 3D generation is secondary.
- **Strengths vs PolyGen:** Massive funding; brand recognition; video + 3D multimodal
- **Weaknesses vs PolyGen:** Pivoted away from 3D focus; mesh-only output; not for 3D printing; enterprise pricing

#### CSM.ai (Common Sense Machines)

- **URL:** https://csm.ai
- **Pricing:** Free "Tinkerer" tier (10 credits one-time, CC BY 4.0), paid tiers for commercial use
- **What they do:** AI 3D asset generation from text, images, video. Sketch-to-3D. World rendering. Focused on game dev.
- **Funding:** Raised from 5+ investors (amount undisclosed).
- **Strengths vs PolyGen:** Multi-modal input (video, sketch); part segmentation; game-ready assets
- **Weaknesses vs PolyGen:** Mesh-only; not parametric; limited free tier; not printability-focused

#### Sloyd.ai

- **URL:** https://www.sloyd.ai
- **Pricing:** Starter (Free, limited), Plus $15/mo (unlimited generations, unlimited downloads, commercial license)
- **What they do:** Parametric 3D asset generator. Visual editing of parametric templates. SDK for developers.
- **Traction:** Positioned as most cost-effective for volume (unlimited at $15/mo flat).
- **Strengths vs PolyGen:** Unlimited generations at flat rate; parametric templates; SDK for integration; game-ready
- **Weaknesses vs PolyGen:** Template-based (not truly generative from arbitrary text); focused on game assets not functional parts; no OpenSCAD output

#### Spline AI

- **URL:** https://spline.design
- **Pricing:** Free, Pro $12/mo, Team pricing available
- **Funding:** $10M Series A (2024, Third Point Ventures lead, YC, Gradient Ventures)
- **What they do:** Collaborative 3D design platform for web. AI features for generating 3D scenes/objects. Browser-based.
- **Strengths vs PolyGen:** Beautiful UI; real-time collaboration; web embedding; animations; lower price
- **Weaknesses vs PolyGen:** Focused on web 3D / design, not engineering/printing; not parametric CAD; no dimensional accuracy

### Tier 3: Research / Open-Source / Deprecated

#### OpenAI Shap-E

- **URL:** GitHub (open-source)
- **Pricing:** Free (open-source)
- **What it does:** Text/image-to-3D neural radiance fields and meshes. Research project.
- **Status:** Released 2023, largely superseded by newer models. No active product.
- **Relevance to PolyGen:** Low. Research curiosity, not a commercial competitor.

#### Google DreamFusion

- **Pricing:** Research paper only, no product
- **What it does:** Text-to-3D using 2D diffusion models (Score Distillation Sampling). Pioneered the approach.
- **Status:** Research only. No commercial offering.
- **Relevance to PolyGen:** Minimal. Academic benchmark.

#### NVIDIA GET3D

- **Pricing:** Research / open-source
- **What it does:** Generates 3D textured shapes from 2D images. Training pipeline.
- **Status:** Research tool, not a consumer product.
- **Relevance to PolyGen:** Minimal. May influence future competitors' tech.

#### 3DFY.ai

- **URL:** https://3dfy.ai
- **Pricing:** Undisclosed / enterprise focus
- **What they do:** Text-to-3D for enterprise (e-commerce product visualization).
- **Funding:** Undisclosed (appears bootstrapped or small raise).
- **Relevance to PolyGen:** Low overlap — enterprise e-commerce focus.

#### Kaedim

- **URL:** https://kaedim3d.com
- **Pricing:** Enterprise / studio pricing (custom)
- **What they do:** AI-powered 3D asset production for game studios. Image-to-3D with human-in-the-loop QA.
- **Funding:** ~$5M+ raised.
- **Relevance to PolyGen:** Low — pure game studio play, not maker/printing market.

### Other Notable Players

#### MecAgent (mecagent.com)

- AI copilot for CAD — mentioned in TechCrunch as competitor to Adam's copilot product.

#### Hyper3D

- Another text-to-3D mesh generator in the pricing comparison space.

#### Autodesk Fusion 360 + AI features

- Incumbent CAD with emerging AI features. $60+/mo. Enterprise dominant.

#### OnShape (PTC)

- Cloud CAD. $1,500/yr+. No AI generation but key competitive reference for "anti-OnShape" positioning.

---

## 2. Market Size & Opportunity

### AI 3D Modeling Market (TAM)

- **2024:** ~$1.5B (AI-specific 3D generation tools)
- **2030 projection:** $5-8B at 23.5% CAGR (Lucintel)
- **Broader 3D mapping/modeling market:** $7.1B (2024) → $16.8B (2030) at 15.4% CAGR (Grand View Research)

### 3D Printing Market (Adjacent TAM)

- **2025:** $16-30B (estimates vary by scope — printers vs. total ecosystem)
- **2030 projection:** $36-66B at 17.2% CAGR (MarketsandMarkets, Mordor Intelligence)
- **Consumer desktop 3D printers:** 1M+ sold in Q1 2025 alone
- **Key insight:** Every 3D printer owner needs 3D models. Most can't use CAD software. This is PolyGen's core market.

### CAD Software Market

- **2025:** $12.2-12.5B
- **2030 projection:** $16-19B at 5.5-6.4% CAGR
- **Dominated by:** Autodesk, Dassault (SolidWorks), Siemens (NX), PTC (OnShape/Creo)
- **Key insight:** The CAD market grows slowly because incumbents have lock-in. AI-native tools could capture the next generation of users who never learn traditional CAD.

### Maker/Hobbyist vs. Enterprise Segments

| Segment                                        | Size            | Willingness to Pay | PolyGen Fit          |
| ---------------------------------------------- | --------------- | ------------------ | -------------------- |
| Hobbyist makers (3D printer owners)            | ~10M worldwide  | $0-20/mo           | ★★★★★ Primary        |
| Prosumer / small biz (Etsy sellers, small mfg) | ~2M             | $20-50/mo          | ★★★★ Strong          |
| Game dev / indie studios                       | ~500K           | $15-50/mo          | ★★ Weak (mesh focus) |
| Professional engineers                         | ~5M             | $50-500/mo         | ★★★ Future           |
| Enterprise manufacturing                       | ~100K companies | $1,000+/mo         | ★★★ SBIR/defense     |

### PolyGen's Addressable Market

- **TAM:** $5B (all AI-assisted 3D creation)
- **SAM:** $500M (AI tools specifically for 3D printing / functional part design)
- **SOM (Year 1):** $2-5M (maker/hobbyist early adopters willing to pay for text-to-printable-3D)

---

## 3. Pricing Analysis

### Competitor Pricing Summary

| Competitor     | Free Tier             | Entry Paid         | Pro/Unlimited         | Enterprise |
| -------------- | --------------------- | ------------------ | --------------------- | ---------- |
| **PolyGen AI** | 5 gen/mo              | —                  | $19/mo                | $99/mo     |
| Adam           | None                  | $9.99/mo (100 gen) | $29.99/mo (unlimited) | Custom     |
| Zoo.dev        | 20 min AI time        | ~$100/mo           | —                     | $1,000+/yr |
| Meshy          | 100 credits/mo        | ~$20/mo            | ~$50/mo               | Custom     |
| Tripo3D        | 300 credits/mo        | $11.94/mo          | $29.94/mo             | Custom     |
| Sloyd          | Limited               | $15/mo (unlimited) | —                     | —          |
| Spline         | Yes                   | $12/mo             | Team pricing          | —          |
| CSM.ai         | 10 credits (one-time) | Paid tiers         | —                     | —          |

### Effective Cost Per Model

From Sloyd's 2026 pricing comparison:
| Platform | Plan | $/model (at ~50 models/mo) |
|----------|------|--------------------------|
| Sloyd | $15/mo | ~$0.015 (unlimited) |
| Tripo | $15.90/mo | ~$0.21 |
| Meshy | $20/mo | ~$0.40 |

**PolyGen at $19/mo:** Need to determine generations included. If unlimited → very competitive. If credit-based, need to beat $0.40/model.

### Is $19/mo Competitive?

**YES — with caveats:**

- ✅ Undercuts Adam Pro ($29.99/mo) significantly
- ✅ Competitive with Meshy Pro ($20/mo) and Tripo Pro ($19.90/mo)
- ✅ Well below Zoo.dev ($100+/mo) for parametric CAD output
- ⚠️ Slightly above Sloyd ($15/mo) and Spline ($12/mo) but those don't output parametric OpenSCAD
- ⚠️ The free tier (5/mo) is thin — Adam has no free tier but Tripo gives 300 credits and Meshy gives 100 credits free

**Recommendation:** $19/mo is the RIGHT price for the parametric/printable niche. Consider:

1. Increasing free tier to 10-15 generations/mo to improve conversion funnel
2. Adding an annual discount ($15/mo billed yearly = $180/yr)
3. The $99/mo Enterprise tier may need more differentiation (team seats, API access, priority support, custom fine-tuning)

### Freemium Conversion Benchmarks

From First Page Sage (2021-2025, 80+ SaaS companies):

- **Visitor → Free signup:** 13-15%
- **Free → Paid conversion:** 3-5% (industry average 3.7%)
- **Opt-in free trial → Paid:** 17.8%
- **Best-in-class freemium → Paid:** 5-7%

**What this means for PolyGen:**

- At 3.7% conversion: Need ~1,350 free users to hit 50 paid ($950/mo MRR)
- At 5% conversion: Need ~1,000 free users for 50 paid
- **To hit $1K MRR:** ~53 Pro subscribers or ~27 free users converting from ~730 free signups

---

## 4. Distribution Channels

### Reddit Communities (Primary Channel for Makers)

| Subreddit                            | Est. Members | Relevance                            |
| ------------------------------------ | ------------ | ------------------------------------ |
| r/3Dprinting                         | ~2.5M+       | ★★★★★ Core audience                  |
| r/functionalprint                    | ~500K+       | ★★★★★ Perfect fit (functional parts) |
| r/OpenSCAD                           | ~15K+        | ★★★★★ Direct audience                |
| r/3Dmodeling                         | ~300K+       | ★★★★                                 |
| r/ender3 (and printer-specific subs) | ~300K+ each  | ★★★★                                 |
| r/fosscad                            | ~100K+       | ★★★★ Defense/tactical overlap        |
| r/maker                              | ~100K+       | ★★★                                  |
| r/SelfReliance                       | ~200K+       | ★★★                                  |
| r/cad                                | ~100K+       | ★★★                                  |

**Strategy:** Post genuine "Show HN"-style demos. "I built a tool that turns text descriptions into printable OpenSCAD files." Show before/after of a prompt → printed part. r/functionalprint is the goldmine.

### Discord Communities

- **Prusa community Discord** — large, active
- **Voron Design Discord** — hardcore printer builders
- **3D Printing Discord servers** — multiple large ones
- **OpenSCAD-related channels**
- **Maker/hackerspace Discord servers**

### YouTube Creators to Target for Reviews/Partnerships

| Creator                      | Subscribers                      | Why                                        |
| ---------------------------- | -------------------------------- | ------------------------------------------ |
| Makers Muse                  | ~1.5M                            | Reviews 3D printing tools, design software |
| Teaching Tech                | ~1M+                             | Tutorials, reviews, practical focus        |
| 3D Printing Nerd             | ~1M+                             | Enthusiast, reviews everything             |
| CNC Kitchen                  | ~700K+                           | Engineering-focused printing               |
| Zack Freedman (Voidstar Lab) | ~500K+                           | Functional prints, OpenSCAD user           |
| Thomas Sanladerer            | ~400K+                           | Technical reviews                          |
| Angus (Maker's Muse)         | Reviews AI tools for 3D printing |
| Lost in Tech                 | Growing, covers AI + making      |

**Strategy:** Send free Pro access to 5-10 YouTubers. Provide a "challenge prompt" they can use on camera. Functional prints work best for video content.

### Product Hunt Strategy

- **Timing:** Launch on Tuesday-Thursday for maximum visibility
- **Tagline options:**
  - "Turn words into 3D-printable parts — no CAD skills needed"
  - "Text-to-OpenSCAD: AI-generated parametric 3D models you actually own"
- **Category:** Developer Tools, Design Tools, 3D Modeling, AI
- **Pre-launch:** Build 200+ followers before launch day
- **Day-of:** Coordinate upvotes from maker communities, Telegram groups
- **Goal:** Top 5 of the day → drives 1,000-5,000 signups in a week

### SEO Keywords & Estimated Search Volume

| Keyword                       | Est. Monthly Volume | Competition | PolyGen Fit |
| ----------------------------- | ------------------- | ----------- | ----------- |
| text to 3D                    | 10K-50K             | High        | ★★★★        |
| AI 3D model generator         | 5K-20K              | High        | ★★★★        |
| text to STL                   | 1K-5K               | Low-Med     | ★★★★★       |
| text to OpenSCAD              | 100-500             | Very Low    | ★★★★★       |
| AI CAD                        | 1K-5K               | Medium      | ★★★★        |
| 3D model from description     | 1K-5K               | Low         | ★★★★★       |
| free 3D model generator       | 10K-50K             | High        | ★★★         |
| custom 3D print design        | 1K-5K               | Medium      | ★★★★★       |
| parametric 3D model generator | 100-1K              | Low         | ★★★★★       |
| OpenSCAD AI                   | 100-500             | Very Low    | ★★★★★       |
| 3D printing design tool       | 1K-5K               | Medium      | ★★★★        |
| make 3D model without CAD     | 500-2K              | Low         | ★★★★★       |

**SEO Strategy:**

1. **Own the long-tail:** "text to OpenSCAD," "AI OpenSCAD generator," "text to STL file" — low competition, high intent
2. **Blog content:** "How to design 3D printable parts without learning CAD," "OpenSCAD for beginners using AI," "10 functional prints designed by AI"
3. **Comparison pages:** "PolyGen vs Adam," "PolyGen vs Meshy for 3D printing"
4. **Gallery/showcase:** Index printable models for SEO (each model = a landing page)

### Other Channels

- **Hacker News:** "Show HN" post — maker audience overlaps strongly
- **Maker Faire / events:** Demo booth at local maker faires
- **Printables.com / Thingiverse:** Share AI-generated models with attribution back to PolyGen
- **3D printing forums:** 3DPrintBoard.com, Prusa forums
- **LinkedIn:** B2B content for the enterprise/defense angle

---

## 5. Differentiation Strategy

### PolyGen's Unique Value Proposition

**"The only AI that gives you real, editable, parametric code — not just a mesh blob."**

| Feature                           | PolyGen            | Adam        | Meshy/Tripo      | Zoo.dev              |
| --------------------------------- | ------------------ | ----------- | ---------------- | -------------------- |
| Parametric output (editable code) | ✅ OpenSCAD        | ✅ OpenSCAD | ❌ Mesh only     | ✅ KCL (proprietary) |
| 3D print optimized                | ✅ Core focus      | Partial     | ❌               | ❌                   |
| Price for hobbyists               | $19/mo             | $29.99/mo   | $20/mo           | $100+/mo             |
| Free tier                         | ✅ 5/mo            | ❌          | ✅ Limited       | ✅ Limited           |
| File ownership                    | ✅ Full            | ✅ Full     | ⚠️ CC BY on free | ✅ Full              |
| No vendor lock-in                 | ✅ OpenSCAD (open) | ✅ OpenSCAD | N/A              | ❌ KCL (proprietary) |
| Defense/tactical focus            | ✅ Unique          | ❌          | ❌               | ❌                   |
| Dual AI (Gemini + Claude)         | ✅ Unique          | Unknown     | Unknown          | Custom               |

### "Anti-OnShape" Positioning

**Core message:** "Your designs. Your files. No lock-in. Ever."

OnShape (PTC) stores all files in their cloud. You can't export without a paid plan. If they raise prices or shut down, you lose your work.

PolyGen generates OpenSCAD code that:

- Lives on YOUR machine
- Can be edited in any text editor
- Runs in free, open-source OpenSCAD
- Exports to STL/3MF locally
- Zero dependency on PolyGen after generation

**This resonates deeply with:**

- Open-source advocates
- Privacy-conscious makers
- FOSSCAD community
- Engineers burned by vendor lock-in (SolidWorks license costs, Fusion 360 hobbyist policy changes)

### Defense / Tactical Market (Niche Domination)

**Nobody else is doing this.** PolyGen can own the intersection of:

- **Picatinny rail accessories** — mounts, grips, rail covers
- **MOLLE/PALS compatible gear** — pouches, adapters, clips
- **Tactical equipment holders** — mag holders, flashlight mounts, radio clips
- **Field-expedient parts** — replacement knobs, brackets, adapters
- **Drone components** — camera mounts, landing gear, payload bays

**Why this matters:**

1. Defense personnel already 3D print in the field (USMC Expeditionary Fabrication)
2. They can't use CAD — they need text-to-part
3. Picatinny rail spec (MIL-STD-1913) is parametric — perfect for OpenSCAD
4. This market pays enterprise prices and loves SBIR-funded tools
5. Zero AI competitors are targeting this

### SBIR Opportunity

**Relevant SBIR/STTR topics:**

- Army: "Leveraging Advanced Computation to Better Employ Additive Manufacturing"
- DARPA: Various AI/manufacturing topics
- Navy: Expeditionary manufacturing and repair
- Air Force: Rapid sustainment through AM

**SBIR Phase I:** $50K-250K for 6-month feasibility study  
**SBIR Phase II:** $500K-1.5M for 2-year prototype development

**Pitch angle:** "AI-powered field-expedient part generation for deployed additive manufacturing units. Service members describe the part they need in plain language; PolyGen generates dimensionally-accurate, printable OpenSCAD code optimized for FDM/FFF printers available in expeditionary settings."

**Timeline:** Watch for DoD SBIR solicitations at defensesbirsttr.mil. Next open topic window likely Q2-Q3 2026.

---

## 6. Revenue Playbook

### First $1K MRR — Sprint to 53 Pro Subscribers

**Timeline target:** 60-90 days  
**Math:** 53 × $19/mo = $1,007 MRR

**Week 1-2: Foundation**

- [ ] Polish landing page with clear value prop and demo video
- [ ] Add 3 "hero examples" (functional prints generated → printed → photographed)
- [ ] Set up analytics (Plausible/PostHog) and payment (Stripe)
- [ ] Create accounts on Reddit, Twitter/X, YouTube, Product Hunt

**Week 2-4: Community Seeding**

- [ ] Post to r/3Dprinting, r/functionalprint, r/OpenSCAD with genuine demos
- [ ] "Show HN" post on Hacker News
- [ ] Share on 3D printing Discord servers
- [ ] Personal outreach to 10 maker YouTubers (free Pro access)
- [ ] Twitter/X thread showing "prompt → OpenSCAD → printed part" workflow
- [ ] Daily posting of AI-generated functional prints on social media

**Week 4-6: Product Hunt Launch**

- [ ] Launch on Product Hunt (Tuesday or Wednesday)
- [ ] Coordinate with existing users for launch-day support
- [ ] Email all free users about launch
- [ ] Goal: 500+ upvotes, top 5 of the day

**Week 6-12: Convert & Retain**

- [ ] Email drip campaign for free users (day 1, 3, 7, 14, 30)
- [ ] Show what Pro unlocks (more generations, priority, commercial use)
- [ ] Add "Share your print" feature (social proof loop)
- [ ] Blog posts targeting long-tail SEO keywords
- [ ] Iterate on the product based on user feedback

**Conversion math:**

- Need ~1,500 free signups at 3.5% conversion = 53 paid
- Product Hunt alone can drive 1,000-3,000 signups
- Reddit posts (if they hit) can drive 500-2,000 signups each

### First $10K MRR — Scale to 530 Subscribers

**Timeline target:** 6-12 months  
**Math:** ~530 Pro × $19/mo OR mix of Pro + Enterprise

**Growth Levers:**

1. **SEO Content Engine** ($0 cost, compounds over time)
   - Weekly blog posts targeting "text to STL," "AI 3D printing," "OpenSCAD tutorial" keywords
   - Model gallery pages (each indexed model = SEO landing page)
   - Comparison pages vs competitors
   - Target: 5,000 organic visits/mo by month 6

2. **YouTube Partnership Program**
   - Get 3-5 mid-tier YouTubers (100K-500K subs) to do sponsored reviews
   - Cost: Free Pro + $500-2,000/video
   - Expected ROI: 50-200 signups per video, 5-10% conversion

3. **Referral Program**
   - "Give a friend 5 free generations, get 5 extra" — viral loop
   - Top referrers get Pro free

4. **Enterprise / Team Plans**
   - Target makerspaces (500+ in the US alone)
   - Offer makerspace plan: $49/mo for 10 seats
   - Partner with makerspace networks (Fab Foundation, etc.)

5. **Tactical/Defense Content Marketing**
   - Create a dedicated "Tactical" section
   - Blog: "3D Printing Picatinny Rail Accessories with AI"
   - This niche has almost zero SEO competition

6. **API / Integration**
   - Offer API for developers building on PolyGen
   - Integrate with OctoPrint / PrusaSlicer / Cura as plugin
   - This creates switching costs and stickiness

### Enterprise Sales Motion ($99/mo+)

**Target accounts:**

1. **Makerspaces & Fab Labs** — 500+ in US, each with 50-200 members
2. **Schools / Universities** — Engineering, design, maker education programs
3. **Small manufacturing shops** — Custom parts, jigs, fixtures
4. **Defense contractors** — Field 3D printing units
5. **3D printing service bureaus** — Shapeways, Xometry, local shops

**Sales process:**

- Self-serve for makerspaces and schools (landing page + Calendly)
- Direct outreach for defense (attend AUSA, SOFIC conferences)
- Partner channel through 3D printer OEMs

### Partnership Opportunities

| Partner Type         | Examples                            | Value Exchange                                 |
| -------------------- | ----------------------------------- | ---------------------------------------------- |
| 3D printer companies | Creality, Prusa, Bambu Lab, Elegoo  | Bundle PolyGen trial with printer purchase     |
| Slicer software      | PrusaSlicer, Cura, OrcaSlicer       | Plugin integration ("Generate with AI" button) |
| Filament companies   | Hatchbox, eSUN, Polymaker           | Co-marketing, sponsored prints                 |
| Makerspaces          | Local fab labs, library makerspaces | Institutional licensing                        |
| 3D model platforms   | Printables, Thangs, Thingiverse     | "Generated by PolyGen" attribution             |
| Defense / govt       | DIU, AFWERX, NavalX                 | SBIR funding, pilot programs                   |

### Revenue Mix Target (Month 12)

| Source              | Subscribers | MRR         | %        |
| ------------------- | ----------- | ----------- | -------- |
| Pro ($19/mo)        | 400         | $7,600      | 76%      |
| Enterprise ($99/mo) | 15          | $1,485      | 15%      |
| API / usage         | —           | $500        | 5%       |
| Partnerships        | —           | $415        | 4%       |
| **Total**           | **415**     | **$10,000** | **100%** |

---

## Key Takeaways & Recommendations

### 1. Adam (adam.new) is the #1 threat

They do almost exactly what PolyGen does (text → OpenSCAD), have $6M+ in funding, and YC backing. **Differentiate aggressively** on: price ($19 vs $30), free tier (they have none), 3D printing focus (they're going enterprise/copilot), and defense/tactical niche (they're ignoring it).

### 2. The parametric angle is your moat

Every other text-to-3D tool (Meshy, Tripo, CSM, Luma) outputs meshes. PolyGen and Adam are the only ones outputting editable parametric code. This is a MUCH better fit for functional/engineering parts. **Lean into this hard.**

### 3. $19/mo is the right price — but beef up the free tier

5 generations/mo is stingy compared to Tripo (300 credits) and Meshy (100 credits). Consider 10-15 free generations to build the conversion funnel. The goal is addicting users, not gatekeeping.

### 4. Defense/tactical is a blue ocean

Zero competitors are targeting this. It's high-value, underserved, and leads to SBIR funding ($50K-$1.5M grants). Build a "Tactical" landing page NOW.

### 5. Distribution > Product right now

The product works. The challenge is getting it in front of the right people. Reddit + YouTube + Product Hunt is the fastest path to $1K MRR. SEO compounds but takes 3-6 months.

### 6. Slicer plugin = killer distribution

A PrusaSlicer or OrcaSlicer plugin that adds "Generate with AI" would put PolyGen in front of millions of 3D printer users at the moment of highest intent. This should be a Q2 priority.

---

_Report compiled February 2026 using data from company websites, TechCrunch, Crunchbase, Grand View Research, MarketsandMarkets, Mordor Intelligence, First Page Sage, and direct competitor analysis._
