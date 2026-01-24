# PolyGen AI

A text-to-3D model generator that converts natural language descriptions into printable OpenSCAD code using Google's Gemini 2.5 Pro.

## Features

- **Natural Language Input** - Describe what you want to create in plain English
- **OpenSCAD Code Generation** - Outputs parametric, printable-ready OpenSCAD code
- **Built-in SCAD Kernel** - Pre-loaded utility modules for fasteners, patterns, and structural elements
- **In-App 3D Preview** - View your model in the browser with Three.js (requires CDN access)
- **Clarification Questions** - AI asks follow-up questions with clickable suggested answers
- **Quick Fix Buttons** - One-click adjustments for tolerances, scaling, and wall thickness
- **User Preferences** - Save your printer settings, tolerances, and material preferences
- **Export Options** - Copy code, download `.scad` files, or open directly in OpenSCAD desktop

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

3. Create `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-2.5-pro
   THINKING_BUDGET=24576
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Configuration

Edit `.env.local` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Your Google AI API key |
| `GEMINI_MODEL` | `gemini-2.5-pro` | Model to use (`gemini-2.5-pro`, `gemini-2.5-flash`) |
| `THINKING_BUDGET` | `24576` | Token budget for reasoning (max 24576 for 2.5-pro) |

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Three.js (3D rendering)
- OpenSCAD WASM (browser-based compilation)
- Google Gemini API

## License

MIT
