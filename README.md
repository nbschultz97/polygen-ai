# PolyGen AI

**v2.0.0** | [Changelog](CHANGELOG.md) | [Roadmap](ROADMAP.md)

A text-to-3D model generator powered by a multi-agent AI pipeline. Converts natural language descriptions into printable OpenSCAD code using Google Gemini (Planner) and Anthropic Claude (Coder).

## Features

### Core
- **Natural Language Input** - Describe what you want to create in plain English
- **Image-to-3D** - Upload a photo and recreate it as a printable model
- **OpenSCAD Code Generation** - Outputs parametric, printable-ready BOSL2-based OpenSCAD code
- **In-App 3D Preview** - View your model in the browser with Three.js
- **STL Export** - Download STL files directly from the preview

### v2.0 Multi-Agent Pipeline
- **Planner Agent (Gemini 3 Pro)** - Generates Geometric Structure Tree (GST) from natural language
- **Coder Agent (Claude Sonnet)** - Converts GST to BOSL2-based OpenSCAD code
- **Browser Validation** - WASM-based OpenSCAD compilation (fully serverless)
- **Smart Quick Fixes** - Context-aware refinement suggestions based on GST component types
- **Symbolic Correction** - Edit requests modify only relevant parameters, not full regeneration

### UX
- **Design Templates** - 9 quick-start templates for common objects
- **Clarification Questions** - AI asks follow-up questions with clickable suggested answers
- **User Preferences** - Save your printer settings, tolerances, and material preferences
- **Export Options** - Copy code, download `.scad` files, or open directly in OpenSCAD

## Architecture

```
User Prompt → [Planner/Gemini] → GST JSON → [Coder/Claude] → OpenSCAD → [Validator/WASM] → 3D Model
                    ↑                              ↑
              Clarification              Retry with errors
                Questions                  (max 2 attempts)
```

**Geometric Structure Tree (GST)**: An intermediate JSON representation that captures the semantic structure of the model (components, parameters, anchors, boolean operations) before code generation.

## Run Locally

**Prerequisites:** Node.js 18+

1. Clone the repository:
   ```bash
   git clone https://github.com/nbschultz97/polygen-ai.git
   cd polygen-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your API keys:
   ```bash
   # Planner Agent (Gemini)
   GEMINI_API_KEY=your_gemini_key
   GEMINI_MODEL=gemini-3-pro-preview
   THINKING_LEVEL=high

   # Coder Agent (Claude) - Required for multi-agent mode
   ANTHROPIC_API_KEY=your_claude_key

   # Enable multi-agent pipeline (default: false)
   USE_MULTI_AGENT=true
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Google AI API key for Planner agent |
| `GEMINI_MODEL` | `gemini-3-pro-preview` | Gemini model variant |
| `THINKING_LEVEL` | `high` | Reasoning depth: `low`, `medium`, `high` |
| `ANTHROPIC_API_KEY` | (optional) | Claude API key for Coder agent |
| `USE_MULTI_AGENT` | `false` | Enable Planner→Coder→Validator pipeline |

**Note:** Without `ANTHROPIC_API_KEY`, the app falls back to single-agent mode (Gemini only).

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Three.js (3D rendering)
- OpenSCAD WASM (browser-based compilation)
- Google Gemini API (Planner)
- Anthropic Claude API (Coder)

## License

MIT
