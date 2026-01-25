# Developer Setup Guide

This guide covers everything you need to set up a development environment for PolyGen AI.

## Prerequisites

- **Node.js**: Version 18 or higher ([download](https://nodejs.org/))
- **npm**: Comes with Node.js
- **Git**: For version control ([download](https://git-scm.com/))
- **Code Editor**: VS Code recommended ([download](https://code.visualstudio.com/))

### API Keys Required

| Service | Purpose | Required? | Get Key |
|---------|---------|-----------|---------|
| Google AI (Gemini) | Planner Agent | Yes | [Google AI Studio](https://aistudio.google.com/) |
| Anthropic (Claude) | Coder Agent | For multi-agent | [Anthropic Console](https://console.anthropic.com/) |

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/nbschultz97/polygen-ai.git
cd polygen-ai
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- React 19 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS
- Three.js (3D rendering)
- Google GenAI SDK
- OpenSCAD WASM

### 3. Configure Environment

Create a `.env.local` file in the project root:

```bash
# Required: Planner Agent
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3-pro-preview
THINKING_LEVEL=high

# Optional: Enable multi-agent pipeline
ANTHROPIC_API_KEY=your_anthropic_api_key_here
USE_MULTI_AGENT=true
CODER_MODEL=claude-sonnet-4-20250514
```

**Note**: `.env.local` is gitignored - never commit API keys.

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
polygen-ai/
├── api/                    # Vercel serverless functions
│   └── claude.ts           # Claude API proxy
├── components/             # React components
│   ├── ChatInterface.tsx   # Main chat UI
│   ├── ModelViewer.tsx     # Three.js 3D viewer
│   ├── SmartQuickFixes.tsx # Context-aware fix buttons
│   └── ...
├── services/               # Business logic
│   ├── agentOrchestrator.ts   # Pipeline coordinator
│   ├── plannerService.ts      # Gemini GST generation
│   ├── coderService.ts        # Claude code generation
│   ├── validatorClient.ts     # Browser WASM validation
│   ├── quickFixAnalyzer.ts    # Smart fix analysis
│   └── ...
├── docs/                   # Documentation
├── types.ts                # TypeScript type definitions
├── App.tsx                 # Main application component
├── index.tsx               # Entry point
└── vite.config.ts          # Vite configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Test locally:
   ```bash
   npm run dev
   ```

4. Run linting:
   ```bash
   npm run lint
   ```

5. Commit and push:
   ```bash
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request on GitHub

### Testing the Pipeline

1. **Single-agent mode** (Gemini only):
   - Remove `ANTHROPIC_API_KEY` and `USE_MULTI_AGENT` from `.env.local`
   - Restart dev server

2. **Multi-agent mode** (Gemini + Claude):
   - Ensure both API keys are set
   - Set `USE_MULTI_AGENT=true`
   - Restart dev server

### Testing Prompts

Try these prompts to test different features:

| Prompt | Tests |
|--------|-------|
| "Make a box with a lid" | Basic geometry, boolean ops |
| "Phone stand with adjustable angle" | Parametric design |
| "Picatinny rail mount" | Domain knowledge (tactical) |
| "M4 screw hole pattern" | Mechanical features |
| (Upload image) "Recreate this" | Image-to-3D |

## VS Code Setup

### Recommended Extensions

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Tailwind autocomplete
- **TypeScript Vue Plugin (Volar)**: If using Vue
- **GitLens**: Git history visualization

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Debugging

### Browser DevTools

1. Open DevTools (F12)
2. Check Console for errors
3. Network tab shows API calls
4. Use React DevTools extension for component inspection

### Common Issues

#### "GEMINI_API_KEY not set"

- Ensure `.env.local` exists in project root
- Variable name must match exactly (case-sensitive)
- Restart dev server after changing `.env.local`

#### CORS Errors with Claude API

- Claude API is proxied through `/api/claude` in production
- In development, Vite proxy handles this (see `vite.config.ts`)
- Ensure `USE_MULTI_AGENT=true` is set

#### OpenSCAD WASM Not Loading

- Check browser console for WASM errors
- Ensure you're using a modern browser (Chrome, Firefox, Edge)
- Clear browser cache and reload

#### "Invalid GST" Errors

- Check Planner response in Network tab
- Gemini may return non-JSON response
- Try simplifying the prompt

### Logging

Add console logs to trace execution:

```typescript
// In agentOrchestrator.ts
console.log('Orchestrator: Starting Planner agent');
console.log('Orchestrator: GST generated:', JSON.stringify(gst, null, 2));
```

## Building for Production

### Local Build

```bash
npm run build
npm run preview
```

### Vercel Deployment

The project is configured for Vercel:

1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

**Required Vercel Environment Variables**:
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY` (if using multi-agent)
- `USE_MULTI_AGENT` (set to `true`)

## Architecture Deep Dive

For detailed architecture documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Multi-agent pipeline
- [GST-SPECIFICATION.md](./GST-SPECIFICATION.md) - GST format
- [API-REFERENCE.md](./API-REFERENCE.md) - Service APIs

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## Getting Help

- **Issues**: Open a GitHub issue for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the `/docs` folder
