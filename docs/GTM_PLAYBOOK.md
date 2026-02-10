# PolyGen AI — Go-to-Market Playbook

**Version:** 1.0 | **Date:** February 2026  
**Author:** Ceradon Systems | **Product:** [polygen.ceradonsystems.com](https://polygen.ceradonsystems.com)

---

## Executive Summary

PolyGen AI is a text-to-3D SaaS that generates printable OpenSCAD code from natural language prompts. Built by Ceradon Systems (SDVOSB), it targets makers, engineers, educators, and defense/enterprise users. This playbook details an actionable 12-month GTM strategy targeting $45K–$725K Year 1 revenue.

**Pricing:**
| Tier | Price | Generations/mo |
|------|-------|----------------|
| Free | $0 | 5 |
| Pro | $19/mo | 100 |
| Enterprise | $99/mo | Unlimited + API + priority |

**Unique Differentiators:**

- Outputs **parametric OpenSCAD code** (not mesh) — editable, version-controllable, printable
- Veteran-founded SDVOSB — eligible for defense set-asides
- Integrates into existing CAD/manufacturing workflows
- Code output means full transparency — users can modify, learn, and iterate

---

## 1. Launch Strategy (First 30 Days)

### Timeline Overview

| Week   | Focus                                           |
| ------ | ----------------------------------------------- |
| Week 1 | Pre-launch: assets, waitlist, teaser content    |
| Week 2 | Product Hunt + Hacker News + Twitter launch day |
| Week 3 | Reddit rollout across communities               |
| Week 4 | YouTube demo + influencer seeding               |

### 1.1 Product Hunt Launch

**Best timing:** Tuesday or Wednesday, 12:01 AM PST (Product Hunt resets daily at midnight PST). Tuesday has highest engagement historically.

**Assets needed:**

- Hero image (1270×760px) — show a text prompt → OpenSCAD code → 3D printed part pipeline
- Gallery images (5): UI screenshot, code output, printed result, comparison to manual CAD, mobile view
- GIF/video (30-60s): type prompt → watch code generate → preview 3D model
- Tagline: "Describe it. Print it. Text-to-3D that generates real OpenSCAD code."
- Maker comment with founder story (veteran → defense tech → making 3D printing accessible)

**Hunter strategy:**

- Self-hunt is fine in 2025/2026 — Product Hunt no longer heavily penalizes it
- Alternatively, reach out to prolific hunters: **Chris Messina** (@chrismessina), **Kevin William David** (@kevinwdavid), **Ben Tossell** (@bentossell)
- Message them 2 weeks before with a personalized demo + why it's interesting
- Offer early Pro access in exchange

**Launch day playbook:**

1. Post at 12:01 AM PST Tuesday
2. Share link to your personal network, Twitter, LinkedIn, Discord immediately
3. Respond to EVERY comment within 30 minutes
4. Post an update comment at noon with "what we've learned so far"
5. End-of-day thank you comment with roadmap teaser
6. Target: Top 5 of the day (aim for 300+ upvotes)

### 1.2 Reddit Launch Strategy

**Target subreddits (in order of priority):**

| Subreddit                | Members | Approach                                      | Post Type                                                                      |
| ------------------------ | ------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| r/3Dprinting             | 3.5M+   | Show printed results, not promotion           | "I built a tool that turns text into printable OpenSCAD — here's what it made" |
| r/functionalprint        | 600K+   | Focus on utility prints generated             | Gallery of functional parts with prompts shown                                 |
| r/openscad               | 15K+    | Technical deep-dive, they'll love code output | "I trained an AI to write OpenSCAD code — here's what it generates"            |
| r/SideProject            | 100K+   | Founder story angle                           | "I'm a veteran who built a text-to-3D tool — here's my 6-month journey"        |
| r/3Ddesign               | 50K+    | Design workflow focus                         | "Skip the CAD learning curve — text to printable 3D models"                    |
| r/maker                  | 100K+   | Maker angle                                   | Show the full prompt-to-print pipeline                                         |
| r/programming            | 6M+     | Technical — OpenSCAD code generation          | "How I built an AI that generates parametric OpenSCAD code"                    |
| r/MachineLearning        | 3M+     | Technical architecture                        | If novel ML approach, share it                                                 |
| r/startups               | 1M+     | Founder journey                               | Monthly update format                                                          |
| r/ArtificialIntelligence | 1M+     | AI application showcase                       | "Text-to-3D but different — generating code, not meshes"                       |

**Reddit DOs:**

- Post genuinely useful content first (share free prints, help people)
- Build karma in these subs for 2+ weeks before launch posts
- Respond to every comment authentically
- Share the "why" — veteran background, making manufacturing accessible
- Include photos of ACTUAL PRINTED results from PolyGen output

**Reddit DON'Ts:**

- Never say "check out my product" — show, don't tell
- Don't post to multiple subs on the same day (looks spammy)
- Don't use a brand-new account
- Don't ask for upvotes
- Space posts 3-5 days apart across subs

### 1.3 Hacker News — Show HN

**Post format:**

```
Show HN: PolyGen AI – Text-to-3D that generates printable OpenSCAD code
```

**First comment (critical — post immediately):**

```
Hi HN, I'm Noah. I'm a veteran and defense tech founder. I built PolyGen
because I kept needing custom 3D parts but the CAD learning curve was brutal.

PolyGen takes a text description and generates parametric OpenSCAD code —
not a mesh blob, but real code you can read, modify, and version control.

Why OpenSCAD? It's the programmer's CAD tool. The output is deterministic,
parametric, and printable. You can tweak dimensions, add features, or use
it as a starting point.

Example: "a cable clip for a 6mm cable that mounts with an M3 screw"
generates a fully parametric clip with configurable dimensions.

Free tier: 5 generations/month. Would love your feedback.

Tech stack: [brief honest description]
```

**Timing:** Post Tuesday-Thursday, 8-10 AM EST. Avoid weekends.

**Key for HN:** Be technical, honest, and responsive. HN loves:

- Code output (show actual generated OpenSCAD)
- Parametric/programmable approach vs. mesh generation
- Veteran founder story (authentic, not performative)
- Clear differentiation from Meshy/Tripo/other mesh generators

### 1.4 Twitter/X Launch Thread

```
🧵 Thread:

1/ I spent 6 months building a tool that turns plain English into
printable 3D models.

But instead of generating meshes, it writes real OpenSCAD code.

Here's why that matters 👇

2/ Most AI 3D tools give you a mesh — a blob of triangles you can't
easily modify.

PolyGen generates PARAMETRIC CODE.

Want the hole 2mm wider? Change one number.
Want 4 mounting holes instead of 2? Edit one line.

[screenshot of code + 3D preview]

3/ Example prompt: "a desk cable organizer with 5 slots for different
cable sizes"

Here's what PolyGen generated:
[screenshot/video of generation]

4/ The code is clean, commented, and ready to print:
[code snippet screenshot]

5/ Why OpenSCAD? Because:
✅ Parametric — dimensions are variables
✅ Version-controllable — it's just text
✅ Printable — designed for 3D printing from the ground up
✅ Open source — no vendor lock-in

6/ I'm a veteran who pivoted from defense tech to making
manufacturing more accessible.

If you've ever stared at Fusion 360 and thought "I just want a
simple bracket" — this is for you.

Try it free (5 generations/month):
polygen.ceradonsystems.com

7/ I'd love your feedback. What would you generate first?

Reply with a prompt and I'll generate it live 🎯
```

**Engagement tactic:** Actively generate models from reply prompts and post results in real-time for 2-3 hours after posting.

### 1.5 YouTube Demo Video Outline

**Title:** "I Built an AI That Writes 3D Printing Code — Here's How It Works"

**Length:** 5-8 minutes

**Structure:**

1. **Hook (0:00-0:30):** Show a finished 3D print. "This was designed by typing one sentence."
2. **Problem (0:30-1:30):** CAD is hard. Show Fusion 360 complexity vs. PolyGen simplicity.
3. **Demo (1:30-4:00):** Live walkthrough of 3 generations:
   - Simple: "a phone stand with 60-degree angle"
   - Medium: "a wall-mounted headphone hook with cable management"
   - Complex: "a parametric box with sliding lid, 80mm × 60mm × 40mm"
4. **Code walkthrough (4:00-5:00):** Show the OpenSCAD code, explain why code > mesh
5. **Print results (5:00-6:00):** Show actual prints from these prompts
6. **CTA (6:00-6:30):** Free tier, link in description

---

## 2. Content Marketing Plan

### 2.1 Blog Posts (10 titles with SEO keywords)

| #   | Title                                                            | Primary Keyword           | Est. Monthly Volume | Difficulty |
| --- | ---------------------------------------------------------------- | ------------------------- | ------------------: | ---------- |
| 1   | "Text to 3D Model: How AI is Changing 3D Printing in 2026"       | text to 3d model          |               2,400 | Medium     |
| 2   | "OpenSCAD Tutorial: Generate Code with AI Instead of Writing It" | openscad tutorial         |               3,600 | Medium     |
| 3   | "Best AI 3D Model Generators for 3D Printing (2026 Comparison)"  | ai 3d model generator     |               6,500 | High       |
| 4   | "How to 3D Print Custom Parts Without Learning CAD"              | 3d print custom parts     |               1,900 | Low        |
| 5   | "Parametric Design Made Easy: AI-Generated OpenSCAD Models"      | parametric design         |               2,200 | Medium     |
| 6   | "5 Functional 3D Prints You Can Generate in 30 Seconds"          | functional 3d prints      |               4,100 | Medium     |
| 7   | "OpenSCAD vs Fusion 360: When to Use Each for 3D Printing"       | openscad vs fusion 360    |               1,300 | Low        |
| 8   | "AI in Manufacturing: How Text-to-CAD is Disrupting Prototyping" | ai manufacturing          |               1,800 | High       |
| 9   | "3D Printing for Beginners: Your First Custom Part in 2 Minutes" | 3d printing for beginners |               8,100 | High       |
| 10  | "How Defense Contractors Use AI for Rapid Prototyping"           | defense 3d printing       |                 590 | Low        |

**Publishing cadence:** 2 posts/week for first month, then 1/week ongoing.

### 2.2 YouTube Video Ideas (10 titles)

| #   | Title                                                    | Target Audience            |
| --- | -------------------------------------------------------- | -------------------------- |
| 1   | "I Let AI Design 10 Things for My 3D Printer"            | Casual makers              |
| 2   | "Text to 3D Print in 60 Seconds — PolyGen AI Demo"       | General                    |
| 3   | "Can AI Write Better OpenSCAD Than Me?"                  | OpenSCAD users             |
| 4   | "I 3D Printed Everything AI Designed for a Week"         | Viral/entertainment        |
| 5   | "AI vs. CAD Designer: Who Makes the Better Bracket?"     | Engineers                  |
| 6   | "3D Print Without CAD Skills — Full Beginner Tutorial"   | Beginners                  |
| 7   | "10 Useful 3D Prints I Generated With One Sentence Each" | Functional print fans      |
| 8   | "Building a Smart Home With AI-Generated 3D Parts"       | Smart home/maker crossover |
| 9   | "How I Use AI to Prototype Defense Tech Parts"           | Defense/enterprise         |
| 10  | "From Idea to Print in 2 Minutes — PolyGen Speed Runs"   | Short-form/viral           |

### 2.3 Social Media Content Calendar (Weeks 1-4)

**Platforms:** Twitter/X (primary), LinkedIn (B2B/defense), Reddit (community), YouTube (demos)

#### Week 1 — Pre-Launch Hype

| Day | Platform | Content                                                                                |
| --- | -------- | -------------------------------------------------------------------------------------- |
| Mon | Twitter  | Teaser: "Building something for everyone who's stared at CAD software and given up..." |
| Tue | LinkedIn | Founder story: veteran → defense tech → democratizing manufacturing                    |
| Wed | Twitter  | Behind-the-scenes: show code generation in progress                                    |
| Thu | Reddit   | Post a helpful comment in r/3Dprinting (build karma, no promotion)                     |
| Fri | Twitter  | "What's the first thing you'd 3D print if you could just describe it?" poll            |

#### Week 2 — Launch Week

| Day | Platform          | Content                                             |
| --- | ----------------- | --------------------------------------------------- |
| Mon | All               | Pre-launch countdown                                |
| Tue | PH + HN + Twitter | LAUNCH DAY — Product Hunt, Show HN, Twitter thread  |
| Wed | LinkedIn          | "We launched yesterday — here's what happened"      |
| Thu | Reddit            | r/SideProject founder story post                    |
| Fri | Twitter           | Highlight interesting prompts from launch day users |

#### Week 3 — Community Seeding

| Day | Platform | Content                                           |
| --- | -------- | ------------------------------------------------- |
| Mon | Reddit   | r/3Dprinting — gallery of printed PolyGen outputs |
| Tue | Twitter  | "Prompt of the day" series begins                 |
| Wed | YouTube  | Upload demo video                                 |
| Thu | Reddit   | r/openscad — technical deep-dive on code quality  |
| Fri | Twitter  | User-generated content RT + commentary            |

#### Week 4 — Social Proof

| Day | Platform | Content                                                       |
| --- | -------- | ------------------------------------------------------------- |
| Mon | LinkedIn | Early metrics: "X users, Y prints generated in first 2 weeks" |
| Tue | Twitter  | Thread: "10 things our users generated that surprised us"     |
| Wed | Reddit   | r/functionalprint — gallery post                              |
| Thu | Twitter  | OpenSCAD code walkthrough thread                              |
| Fri | All      | Week 4 retrospective + roadmap tease                          |

### 2.4 SEO Target Keywords

**High-priority (go after immediately):**

| Keyword                     | Monthly Volume | Difficulty | Intent                      |
| --------------------------- | -------------: | ---------- | --------------------------- |
| text to 3d model            |          2,400 | Medium     | Transactional               |
| ai 3d model generator       |          6,500 | High       | Transactional               |
| openscad generator          |            320 | Low        | Transactional               |
| text to openscad            |             90 | Very Low   | Transactional — EXACT match |
| ai 3d printing              |          3,200 | Medium     | Informational               |
| generate 3d model from text |          1,600 | Medium     | Transactional               |
| parametric model generator  |            480 | Low        | Transactional               |
| custom 3d print design      |            880 | Low        | Transactional               |

**Long-tail (blog content targets):**

| Keyword                             | Monthly Volume | Difficulty |
| ----------------------------------- | -------------: | ---------- |
| how to make custom 3d printed parts |            720 | Low        |
| openscad for beginners              |          1,100 | Low        |
| ai cad design tool                  |            590 | Medium     |
| 3d print without cad                |            390 | Low        |
| text to stl file                    |          1,400 | Medium     |
| ai generated 3d models for printing |            480 | Low        |

**Strategy:** Own "text to openscad" and "openscad generator" immediately (low competition, exact intent). Build toward "ai 3d model generator" with comparison content.

---

## 3. Community Building

### 3.1 Discord Server Structure

```
📢 INFORMATION
├── #welcome — Rules + what PolyGen is
├── #announcements — Product updates
├── #roadmap — Public roadmap + voting
├── #faq — Common questions

💬 COMMUNITY
├── #general — Chat
├── #show-your-prints — Photos of printed PolyGen outputs (most important channel)
├── #prompt-sharing — Share prompts that work well
├── #prompt-help — Help crafting better prompts
├── #openscad-tips — OpenSCAD code discussion

🔧 SUPPORT
├── #bug-reports — Bug reports
├── #feature-requests — Suggestions
├── #feedback — General feedback

🏆 SHOWCASE
├── #weekly-challenge — Weekly prompt challenge with prizes (free Pro months)
├── #hall-of-fame — Best generations

🔒 PRO MEMBERS (role-gated)
├── #pro-lounge — Pro subscriber chat
├── #early-access — Beta features
```

**Key engagement tactics:**

- Weekly prompt challenge (e.g., "Design the best desk organizer") — winner gets 1 month Pro free
- "Prompt of the Day" bot post
- Founder does weekly 30-minute "office hours" voice chat
- Print-of-the-week highlight in #announcements

### 3.2 Reddit Community Engagement

**r/3Dprinting (3.5M members):**

- Post printed results with clear photos (this sub is visual)
- Format: Image gallery + "Prompt used: [exact prompt]" in comments
- Engage genuinely — answer questions about 3D printing, not just PolyGen
- Flair: use "Project" or "FDM Print" flair
- DO: comparison photos (PolyGen output vs. traditional CAD for same part)

**r/openscad (15K members):**

- This is your core technical audience
- Post generated code and invite feedback/criticism
- Share as "interesting approach to OpenSCAD generation" not "buy my product"
- Ask: "What would make AI-generated OpenSCAD actually useful to you?"
- Contribute to other threads — help people with their OpenSCAD questions

**r/functionalprint (600K members):**

- Pure showcase — functional prints only
- "I described 5 household problems and 3D printed solutions for all of them"
- Focus on the PRINT quality and usefulness, mention tool casually

### 3.3 Maker Space Partnerships

**Strategy:** Offer maker spaces a free Enterprise account + workshop kit.

**Target spaces (start local/regional, then national):**

- Local (Colorado): Denver STEAM Lab, Solid State Depot (Boulder), Pikes Peak Makerspace
- National chains: TechShop locations, Fab Labs, public library maker spaces
- University spaces: MIT Media Lab, Georgia Tech Invention Studio, CU Boulder ITLL

**Partnership offer:**

- Free Enterprise account for the space
- Co-branded workshop: "Text-to-3D Printing Workshop" (provide slide deck + curriculum)
- Space gets affiliate link → 20% of Pro conversions from their referrals
- Physical flyer/poster for their space

**Outreach email template:**

```
Subject: Free AI-powered 3D printing tool for [Space Name] members

Hi [Name],

I'm Noah, a veteran and founder of PolyGen AI. We've built a tool that
lets anyone generate printable 3D models by describing what they need
in plain English — no CAD experience required.

I'd love to offer [Space Name] a free Enterprise account and co-develop
a workshop for your members. We'd provide:

- Unlimited access for all your members
- Workshop slide deck + hands-on curriculum
- 20% revenue share on any Pro subscriptions from your community

Would you be open to a 15-minute call this week?

— Noah Schultz, Ceradon Systems
```

### 3.4 3D Printing Influencer Outreach

**Tier 1 — High-reach YouTube channels (500K+ subscribers):**

| Channel                             | Subscriber Count | Why                                                     |
| ----------------------------------- | ---------------: | ------------------------------------------------------- |
| **Maker's Muse** (Angus Deveson)    |            ~700K | Reviews 3D printing tools, covers CAD workflows         |
| **CNC Kitchen** (Stefan Hermann)    |            ~614K | Engineering-focused, loves testing tools scientifically |
| **Make Anything** (Devin Montes)    |            ~1.5M | Design-focused, would showcase creative prompts         |
| **3D Printing Nerd** (Joel Telling) |            ~700K | Enthusiastic, covers everything 3D printing             |
| **Teaching Tech** (Michael)         |            ~900K | Tutorial-focused, would explain the workflow well       |

**Tier 2 — Mid-tier channels (100K-500K):**

| Channel                          | Subscriber Count | Why                                                    |
| -------------------------------- | ---------------: | ------------------------------------------------------ |
| **Thomas Sanladerer**            |            ~400K | Technical, covers industry trends                      |
| **Zack Freedman** (Voidstar Lab) |            ~350K | Functional prints, engineering audience                |
| **Slant 3D**                     |            ~300K | Manufacturing focus, would appreciate enterprise angle |
| **The 3D Print General**         |            ~200K | Reviews and practical prints                           |
| **Lost in Tech**                 |            ~150K | UK-based, good for international reach                 |

**Tier 3 — Niche/OpenSCAD-adjacent:**

| Channel/Person                     | Platform     | Why                                 |
| ---------------------------------- | ------------ | ----------------------------------- |
| **Conor O'Neill**                  | Blog/YouTube | Prominent OpenSCAD community member |
| **OpenSCAD community forum** users | Forum        | Direct community engagement         |
| **r/3Dprinting moderators**        | Reddit       | Community gatekeepers               |

**Outreach approach:**

1. Follow and engage with their content for 2+ weeks first
2. Send short personalized email/DM referencing specific recent video
3. Offer: "Would you like to try it? Here's a free Pro account. No obligation to cover it."
4. If they're interested, offer exclusive: "You can announce [feature X] before we make it public"
5. Provide B-roll footage, screenshots, and talking points (make it easy for them)

**Budget:** Allocate $500-2,000 for sponsored integrations with Tier 2 channels (Tier 1 often costs $5K-15K).

---

## 4. Conversion Optimization

### 4.1 Free-to-Paid Conversion Tactics

**Target conversion rate:** 5-8% free → Pro (industry SaaS average is 2-5%)

**Tactics:**

1. **Generation counter with urgency:** "You have 2 of 5 free generations remaining this month" — visible on every page
2. **Premium prompt suggestions:** Show greyed-out "Pro prompt templates" that free users can see but not use
3. **Quality teaser:** Free tier generates at standard quality; show "Pro quality" preview with more detail/better code
4. **Export limitations:** Free tier shows code but requires Pro to download .scad files directly (free users can still copy-paste)
5. **Usage-based upgrade prompt:** When user hits limit, show: "You've used all 5 generations. Upgrade to Pro for 100/month — that's $0.19 per generation."
6. **Time-limited offer:** After signup, 48-hour window for "first month $9.50" (50% off)
7. **Annual discount:** Pro annual at $15/mo ($180/year vs $228) — 21% savings

### 4.2 Onboarding Flow

**Optimal flow (minimize time-to-first-generation):**

```
1. Landing page → "Try it now" (no signup required for first generation)
2. First generation succeeds → "Sign up to save this and get 4 more free"
3. Email signup (Google OAuth + email) → immediate access
4. Guided second prompt: "Try something harder: [suggestion based on first prompt]"
5. After 3rd generation → subtle Pro pitch: "Love it? Pro gives you 100/month"
```

**Key principles:**

- First generation should require ZERO signup (capture value first)
- Show the 3D preview + code simultaneously
- Include "Copy Code" and "Open in OpenSCAD" buttons
- After each generation, suggest a slightly more complex follow-up prompt

### 4.3 Email Drip Sequences

**Sequence 1: Welcome (triggered on signup)**

| Day | Subject                                        | Content                                        |
| --- | ---------------------------------------------- | ---------------------------------------------- |
| 0   | "Your first 3D model is ready 🎉"              | Recap their first generation + how to print it |
| 1   | "5 prompts that generate amazing results"      | Prompt engineering tips + examples             |
| 3   | "From prompt to print: a 2-minute walkthrough" | Video tutorial link                            |
| 5   | "What our users are printing this week"        | Social proof — gallery of community prints     |
| 7   | "You have 3 generations left this month"       | Usage reminder + gentle Pro mention            |

**Sequence 2: Activation (triggered if no generation after 48 hours)**

| Day | Subject                                           | Content                           |
| --- | ------------------------------------------------- | --------------------------------- |
| 2   | "Need inspiration? Here are 10 ideas to generate" | Curated prompt ideas              |
| 4   | "Your free generations expire in 26 days"         | Urgency + one-click generate link |
| 7   | "Quick question — what were you hoping to print?" | Personal, asks for reply          |

**Sequence 3: Upgrade (triggered after using 5/5 free generations)**

| Day | Subject                                                      | Content                         |
| --- | ------------------------------------------------------------ | ------------------------------- |
| 0   | "You've used all 5 — here's 50% off your first month of Pro" | Time-limited discount           |
| 3   | "What 100 generations per month looks like"                  | Show power users' output volume |
| 7   | "Your discount expires tomorrow"                             | Final urgency push              |

### 4.4 Referral Program

**Structure:** "Give a friend 10 bonus generations, get 10 bonus generations"

**Mechanics:**

- Every user gets a unique referral link
- Referred user gets 10 generations their first month (instead of 5)
- Referrer gets 10 bonus generations (stacks with their plan)
- Pro users who refer 3 people get a free month

**Viral loop:** After every generation, show: "Share this design" → generates a public link with referral code baked in.

**Tracking:** Unique referral codes, dashboard showing referral count + rewards earned.

---

## 5. Enterprise & Defense Sales

### 5.1 SBIR Application Strategy

**Priority programs:**

| Program                            | Agency    | Relevance                                                       | Typical Phase I Award |
| ---------------------------------- | --------- | --------------------------------------------------------------- | --------------------: |
| **AFWERX Open Topic**              | Air Force | "Digital engineering," "rapid prototyping," "AI-enabled design" |             $50K-250K |
| **Army xTech**                     | Army      | Pitch competition format, good for visibility                   |             $25K-250K |
| **SOCOM SBIR**                     | SOCOM     | SOF equipment rapid prototyping                                 |            $100K-250K |
| **Navy SBIR**                      | Navy      | Shipboard repair part generation                                |                 $140K |
| **DLA (Defense Logistics Agency)** | DLA       | Supply chain / spare parts                                      |                 $100K |
| **AFRL (Air Force Research Lab)**  | AF        | Advanced manufacturing                                          |                 $150K |

**AFWERX Open Topic strategy (highest probability):**

1. AFWERX runs rolling open topics — submit quarterly
2. Frame as: "AI-Assisted Rapid Prototyping for Expeditionary Manufacturing"
3. Key pitch: Warfighter in the field needs a custom bracket/mount/adapter → describes it in plain text → prints it on a field-deployable 3D printer
4. Phase I: Demonstrate capability + DoD-relevant use cases ($50-75K)
5. Phase II: Integrate with DoD 3D printer fleet + security hardening ($750K)

**Application timeline:**

- AFWERX Open Topics: Continuous (submit ASAP)
- Army xTech: Watch for next cohort announcement (typically quarterly)
- SOCOM: Annual BAA cycle, usually Q1 fiscal year (Oct-Dec)

**Key points to emphasize in proposals:**

- SDVOSB status (procurement preference)
- Founder's military background (credibility)
- OpenSCAD code output = auditable, verifiable (important for safety-critical parts)
- Offline/air-gapped deployment potential
- Integration with existing DoD 3D printer programs (Army's AMPS, Marines' X-FAB)

### 5.2 Defense Use Cases

1. **Field Expedient Repair Parts:** Describe a broken component → generate replacement → print on portable printer (Markforged, Ultimaker)
2. **Custom Equipment Mounts:** Night vision mounts, weapon light brackets, radio adapters for non-standard configurations
3. **Training Aid Fabrication:** Generate scaled models of terrain, vehicles, equipment for briefings
4. **Forward Operating Base Infrastructure:** Cable management, equipment organizers, signage, protective covers
5. **Supply Chain Resilience:** Reduce dependence on long logistics tails for low-criticality parts
6. **Rapid Prototyping for PEOs:** Program offices can iterate equipment designs without dedicated CAD engineers

### 5.3 Government Procurement Channels

| Channel                               | How to Access                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| **SAM.gov**                           | Register entity (likely done for SDVOSB) → respond to RFIs/RFQs                      |
| **GSA Schedule**                      | Apply for IT Schedule 70 (now MAS) — 6-12 month process but opens all federal buyers |
| **SEWP V**                            | NASA's IT contract — available to all agencies, fast procurement                     |
| **Army ITES-SW2**                     | Army enterprise software vehicle                                                     |
| **SBIR/STTR**                         | Direct R&D funding (see above)                                                       |
| **OTA (Other Transaction Authority)** | Faster contracting for prototypes — pursue via AFWERX/DIU                            |
| **DIU (Defense Innovation Unit)**     | Commercial solutions for DoD — submit via diu.mil                                    |
| **VetBiz**                            | Ensure SDVOSB certification is current for set-aside contracts                       |

### 5.4 Enterprise Pricing Strategy

**Current $99/mo Enterprise tier is too cheap for real enterprises.** Restructure:

| Tier       | Price                 | For                | Includes                                               |
| ---------- | --------------------- | ------------------ | ------------------------------------------------------ |
| Free       | $0/mo                 | Individuals        | 5 gen/mo                                               |
| Pro        | $19/mo                | Makers/hobbyists   | 100 gen/mo, .scad export, email support                |
| Team       | $49/user/mo           | Small businesses   | 250 gen/mo per user, shared library, API access        |
| Enterprise | Custom ($500-5K/mo)   | Large orgs/defense | Unlimited, SSO, on-prem option, SLA, dedicated support |
| Government | Custom (via contract) | DoD/federal        | FedRAMP path, air-gap deploy, ITAR compliance          |

**Enterprise sales process:**

1. Inbound via website "Contact Sales" form
2. 15-minute discovery call (Noah or sales hire)
3. Custom pilot: 30-day free Enterprise trial with usage tracking
4. Business case: "Your team spent X hours in CAD last month. PolyGen could reduce that by Y%."
5. Close with annual contract (minimum $6K/year)

---

## 6. Partnership Opportunities

### 6.1 3D Printer Manufacturers

| Company                  | Opportunity                                               | Approach                                                                                                                                     |
| ------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prusa Research**       | PrusaSlicer integration or Printables marketplace feature | Email Josef Prusa's team; Prusa is maker-friendly and supports indie tools. Propose: "Generate with PolyGen → one-click send to PrusaSlicer" |
| **Bambu Lab**            | Bambu Studio integration, co-marketing                    | Fastest-growing printer brand. Propose: integration in Bambu Handy app or MakerWorld                                                         |
| **Creality**             | Creality Cloud integration                                | Large market share, especially beginners. Plugin for Creality Cloud platform                                                                 |
| **Ultimaker / MakerBot** | Enterprise + education bundle                             | Their enterprise customers overlap with PolyGen Enterprise targets                                                                           |
| **Formlabs**             | Enterprise manufacturing angle                            | Resin printing for higher-fidelity parts                                                                                                     |
| **Markforged**           | Defense angle (they're in DoD already)                    | Co-sell into defense accounts                                                                                                                |

**Integration pitch:** "Users describe what they need → PolyGen generates the model → one click to [Your Slicer]. Reduces time from idea to print from hours to minutes."

### 6.2 Maker Platforms

| Platform                   | Partnership Model                                                             |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Printables** (Prusa)     | "AI-Generated" tag/category; featured collection of PolyGen designs           |
| **Thingiverse** (Makerbot) | Share PolyGen outputs with attribution; API integration for direct upload     |
| **Thangs**                 | Thangs already indexes 3D models — integrate PolyGen as a "generation" source |
| **MyMiniFactory**          | Paid model marketplace — PolyGen-generated designs as templates               |

### 6.3 CAD Software Integration

| Software       | Integration Type                                                       |
| -------------- | ---------------------------------------------------------------------- |
| **OpenSCAD**   | Direct plugin/extension — "Generate from AI" button inside OpenSCAD    |
| **FreeCAD**    | Import PolyGen output as starting point for further parametric editing |
| **Fusion 360** | Plugin that converts PolyGen OpenSCAD → STEP for import                |
| **Onshape**    | Cloud-native — API integration for PolyGen generation within Onshape   |
| **Tinkercad**  | Education market — "AI assistant" for beginners                        |

### 6.4 Education Market

**Target segments:**

- **Universities:** ME/EE/CS departments, design schools, architecture programs
- **K-12 STEM:** Middle/high school maker programs
- **Bootcamps:** Product design bootcamps, hardware accelerators
- **Libraries:** Public library maker spaces (increasingly common)

**Education pricing:** 50% discount on Pro ($9.50/student/mo) or site license ($500/year for up to 50 students)

**Curriculum integration:**

- "Intro to 3D Printing" course module: Use PolyGen to teach parametric design concepts
- CS courses: Use PolyGen as example of AI code generation
- Design thinking: Rapid prototyping exercises

**Outreach:** Target professors who teach OpenSCAD or 3D printing courses. Search for university course catalogs mentioning OpenSCAD.

---

## 7. Financial Projections

### 7.1 Key Assumptions

| Metric                         | Conservative |  Moderate | Aggressive |
| ------------------------------ | -----------: | --------: | ---------: |
| Monthly website visitors (M12) |        5,000 |    15,000 |     50,000 |
| Visitor → Free signup rate     |           8% |       12% |        15% |
| Free → Pro conversion rate     |           3% |        5% |         8% |
| Monthly churn (Pro)            |           8% |        6% |         4% |
| Enterprise customers (M12)     |            1 |         3 |          8 |
| Enterprise ARPU                |      $500/mo | $1,000/mo |  $2,000/mo |
| SBIR funding                   |           $0 |      $75K |      $250K |

### 7.2 Month-by-Month Revenue Model — Moderate Scenario

| Month | Visitors | New Free | Cumul. Free | New Pro | Cumul. Pro | Pro MRR | Enterprise | Ent. MRR | Total MRR |
| ----: | -------: | -------: | ----------: | ------: | ---------: | ------: | ---------: | -------: | --------: |
|     1 |    2,000 |      240 |         240 |      12 |         12 |    $228 |          0 |       $0 |      $228 |
|     2 |    3,000 |      360 |         600 |      18 |         29 |    $551 |          0 |       $0 |      $551 |
|     3 |    4,500 |      540 |       1,140 |      27 |         53 |  $1,007 |          0 |       $0 |    $1,007 |
|     4 |    5,500 |      660 |       1,800 |      33 |         81 |  $1,539 |          1 |   $1,000 |    $2,539 |
|     5 |    7,000 |      840 |       2,640 |      42 |        116 |  $2,204 |          1 |   $1,000 |    $3,204 |
|     6 |    8,500 |    1,020 |       3,660 |      51 |        156 |  $2,964 |          1 |   $1,000 |    $3,964 |
|     7 |   10,000 |    1,200 |       4,860 |      60 |        201 |  $3,819 |          2 |   $2,000 |    $5,819 |
|     8 |   11,000 |    1,320 |       6,180 |      66 |        247 |  $4,693 |          2 |   $2,000 |    $6,693 |
|     9 |   12,500 |    1,500 |       7,680 |      75 |        297 |  $5,643 |          2 |   $2,000 |    $7,643 |
|    10 |   13,500 |    1,620 |       9,300 |      81 |        347 |  $6,593 |          3 |   $3,000 |    $9,593 |
|    11 |   14,500 |    1,740 |      11,040 |      87 |        398 |  $7,562 |          3 |   $3,000 |   $10,562 |
|    12 |   15,000 |    1,800 |      12,840 |      90 |        447 |  $8,493 |          3 |   $3,000 |   $11,493 |

**Year 1 Total Revenue (Moderate):** ~$75,000 MRR revenue + $75K SBIR = **~$150,000**

_(Note: Cumulative Pro accounts reduced monthly by 6% churn)_

### 7.3 Scenario Summary — Year 1 Total Revenue

| Scenario         | Pro Revenue | Enterprise Revenue | SBIR/Grants |        Total |
| ---------------- | ----------: | -----------------: | ----------: | -----------: |
| **Conservative** |     $25,000 |             $6,000 |          $0 |  **$31,000** |
| **Moderate**     |     $75,000 |            $36,000 |     $75,000 | **$186,000** |
| **Aggressive**   |    $200,000 |           $192,000 |    $250,000 | **$642,000** |

### 7.4 Cost Structure & Break-Even

**Monthly costs (estimated):**

| Item                                |                           Cost |
| ----------------------------------- | -----------------------------: |
| AI/LLM API costs (OpenAI/Anthropic) | $500-2,000 (scales with usage) |
| Hosting (Vercel/AWS)                |                       $100-500 |
| Domain + services                   |                            $50 |
| Marketing spend                     |                     $500-2,000 |
| Noah's time (opportunity cost)      |              $0 (bootstrapped) |
| **Total monthly burn**              |               **$1,150-4,550** |

**Break-even:** ~$2,000-3,000 MRR → achievable by Month 4-6 in moderate scenario.

**Unit economics:**

- Pro subscriber LTV (at 6% churn = ~17 month lifespan): $19 × 17 = **$323**
- Customer acquisition cost target: < $50 (organic-first strategy)
- LTV:CAC ratio target: > 6:1

### 7.5 Path to $725K (Aggressive Target)

To hit $725K in Year 1:

1. Land 2-3 SBIR Phase I awards (~$250K)
2. Acquire 500+ Pro subscribers by M12 (~$200K annualized run rate)
3. Close 5-8 Enterprise accounts at $1-2K/mo (~$150K)
4. One large defense pilot contract ($100K+)
5. Total: **$700K+**

**This requires:** Dedicated sales effort for enterprise/defense starting M3, successful Product Hunt launch driving 10K+ signups, and at least one SBIR win.

---

## Appendix A: 90-Day Action Checklist

### Days 1-30 (Launch)

- [ ] Create Product Hunt assets (images, GIF, tagline)
- [ ] Set up analytics (Mixpanel or PostHog for funnel tracking)
- [ ] Build email capture + drip sequences (ConvertKit or Loops)
- [ ] Launch on Product Hunt (Tuesday)
- [ ] Post Show HN same week
- [ ] Post Twitter launch thread
- [ ] Set up Discord server
- [ ] Start Reddit engagement (build karma first)
- [ ] Publish first 2 blog posts
- [ ] Record + upload YouTube demo video

### Days 31-60 (Traction)

- [ ] Reddit rollout across target subs (1 post per 3-5 days)
- [ ] Begin influencer outreach (Tier 2 first — more responsive)
- [ ] Publish 4 more blog posts
- [ ] Launch referral program
- [ ] Begin AFWERX Open Topic SBIR application
- [ ] Attend 1 local maker space event
- [ ] Start weekly "Prompt of the Day" on Twitter + Discord

### Days 61-90 (Optimize)

- [ ] Analyze conversion funnel — optimize weakest step
- [ ] A/B test pricing page
- [ ] Launch education pilot with 1 university
- [ ] Submit Army xTech application (if open)
- [ ] Reach out to 3 printer manufacturers for integration discussions
- [ ] Hit 1,000 registered users
- [ ] Hit $1,000 MRR

---

## Appendix B: Key Metrics to Track

| Metric                          | Tool        | Target (M6)        |
| ------------------------------- | ----------- | ------------------ |
| Monthly visitors                | PostHog/GA4 | 8,500              |
| Signup rate                     | PostHog     | 12%                |
| Activation rate (≥1 generation) | Internal    | 70%                |
| Free → Pro conversion           | Internal    | 5%                 |
| Pro monthly churn               | Stripe      | <6%                |
| NPS score                       | Survey      | >50                |
| Time to first generation        | Internal    | <2 min             |
| Referral rate                   | Internal    | 15% of users share |

---

_This is a living document. Review and update monthly based on actual performance data._
