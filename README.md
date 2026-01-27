# PolyGen AI

**v3.4.0** | [Changelog](CHANGELOG.md) | [Roadmap](ROADMAP.md) | [Deployment Guide](DEPLOYMENT.md)

A text-to-3D model generator powered by a multi-agent AI pipeline. Converts natural language descriptions into printable OpenSCAD code using Google Gemini (Planner) and Anthropic Claude (Coder).

**Now available as a SaaS** with user authentication, subscription tiers, and usage tracking.

## Live Demo

🚀 Live at [polygen-ai.vercel.app](https://polygen-ai.vercel.app)

## Features

### Core 3D Generation

- **Natural Language Input** - Describe what you want to create in plain English
- **Image-to-3D** - Upload a photo and recreate it as a printable model
- **OpenSCAD Code Generation** - Outputs parametric, printable-ready pure OpenSCAD code
- **In-App 3D Preview** - View your model in the browser with Three.js
- **STL Export** - Download STL files directly from the preview

### v2.2 Reliable Code Generation

- **Closed-Loop Validation** - 3-attempt retry system with escalating guidance
- **Error Categorization** - Parses errors into 7 categories with suggested fixes
- **Pitfall Database** - 12 common OpenSCAD mistakes with bad/good examples
- **Auto-Preprocessing** - Injects epsilon and $fn if missing
- **Manifold Checking** - Detects open edges and non-manifold geometry
- **Teaching Mode** - Educational comments explain OpenSCAD concepts

### Multi-Agent Pipeline (v2.0+)

- **Planner Agent (Gemini 3 Pro)** - Generates Geometric Structure Tree (GST) from natural language
- **Coder Agent (Claude Sonnet)** - Converts GST to pure OpenSCAD code
- **Browser Validation** - WASM-based OpenSCAD compilation (fully serverless)
- **Smart Quick Fixes** - Context-aware refinement suggestions based on GST component types
- **Symbolic Correction** - Edit requests preserve component relationships

### SaaS Platform (v3.0+)

- **User Authentication** - Email/password and Google OAuth via Supabase
- **Subscription Tiers** - Free, Pro ($19/mo), Enterprise ($99/mo)
- **Usage Tracking** - Generation limits enforced per tier
- **Stripe Payments** - Secure checkout and subscription management
- **Analytics Dashboard** - Track your usage, manage subscription
- **Referral System** - Earn bonus generations by referring friends

### UX

- **Design Templates** - 9 quick-start templates for common objects
- **Clarification Questions** - AI asks follow-up questions with clickable suggested answers
- **User Preferences** - Save your printer settings, tolerances, and material preferences
- **Onboarding Tour** - Guided introduction for new users
- **Export Options** - Copy code, download `.scad` files, or open directly in OpenSCAD

## Pricing

| Plan           | Price     | Generations | Features                                                |
| -------------- | --------- | ----------- | ------------------------------------------------------- |
| **Free**       | $0        | 5/month     | Basic templates, OpenSCAD export                        |
| **Pro**        | $19/month | 100/month   | All templates, STL export, 3D preview, priority support |
| **Enterprise** | $99/month | Unlimited   | + API access, team features                             |

## Architecture

```
User Prompt → [Planner/Gemini] → GST JSON → [Coder/Claude] → OpenSCAD → [Validator/WASM] → 3D Model
                    ↑                              ↑
              Clarification              Retry with errors
                Questions                  (max 3 attempts)
```

**Geometric Structure Tree (GST)**: An intermediate JSON representation that captures the semantic structure of the model (components, parameters, anchors, boolean operations) before code generation.

## Run Locally

**Prerequisites:** Node.js 20+

1. Clone the repository:

   ```bash
   git clone https://github.com/nbschultz97/polygen-ai.git
   cd polygen-ai
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

4. Fill in your API keys in `.env.local`:

   ```bash
   # AI APIs (Required)
   GEMINI_API_KEY=your_gemini_key
   ANTHROPIC_API_KEY=your_claude_key
   USE_MULTI_AGENT=true

   # Supabase (Required for auth)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key

   # Stripe (Required for payments)
   STRIPE_SECRET_KEY=sk_live_xxx
   VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

6. Open http://localhost:5173 in your browser

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions including:

- Supabase setup and database schema
- Stripe configuration and webhook setup
- Vercel deployment with environment variables
- Custom domain configuration

## Configuration

### AI Configuration

| Variable            | Default                | Description                              |
| ------------------- | ---------------------- | ---------------------------------------- |
| `GEMINI_API_KEY`    | (required)             | Google AI API key for Planner agent      |
| `GEMINI_MODEL`      | `gemini-3-pro-preview` | Gemini model variant                     |
| `THINKING_LEVEL`    | `high`                 | Reasoning depth: `low`, `medium`, `high` |
| `ANTHROPIC_API_KEY` | (optional)             | Claude API key for Coder agent           |
| `USE_MULTI_AGENT`   | `false`                | Enable Planner→Coder→Validator pipeline  |

### SaaS Configuration

| Variable                    | Description                             |
| --------------------------- | --------------------------------------- |
| `VITE_SUPABASE_URL`         | Supabase project URL                    |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anonymous key                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `STRIPE_SECRET_KEY`         | Stripe secret key                       |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signing secret           |
| `VITE_STRIPE_*_PRICE_ID`    | Stripe price IDs for each plan          |
| `VITE_GA_MEASUREMENT_ID`    | Google Analytics 4 ID (optional)        |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS
- **3D Rendering**: Three.js + OpenSCAD WASM
- **AI**: Google Gemini API (Planner) + Anthropic Claude API (Coder)
- **Auth**: Supabase Auth with Google OAuth
- **Payments**: Stripe Subscriptions
- **Hosting**: Vercel (recommended)
- **Analytics**: Google Analytics 4

## Project Structure

```
polygen-ai/
├── components/          # React components
│   ├── AuthContext.tsx  # Authentication state
│   ├── LandingPage.tsx  # Marketing homepage
│   ├── MainApp.tsx      # Authenticated app wrapper
│   ├── PricingPage.tsx  # Subscription plans
│   └── ...
├── services/            # Business logic
│   ├── authService.ts   # Supabase auth
│   ├── stripeService.ts # Stripe integration
│   ├── geminiService.ts # Gemini API
│   ├── coderService.ts  # Claude API
│   ├── errorCategorizer.ts # Error analysis
│   └── ...
├── api/                 # Vercel Edge Functions
│   └── stripe/          # Payment endpoints
├── supabase/            # Database schemas
├── marketing/           # Launch materials
├── seo/                 # SEO assets
└── public/              # Static files
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT

---

Built by [Noah Schultz](https://github.com/nbschultz97) | Powered by Gemini + Claude
