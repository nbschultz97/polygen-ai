# PolyGen AI

**v1.4.0** | [Changelog](CHANGELOG.md) | [Roadmap](ROADMAP.md)

A text-to-3D model generator that converts natural language descriptions into printable OpenSCAD code using Google's Gemini 3 Pro.

## Features

- **Natural Language Input** - Describe what you want to create in plain English
- **Image-to-3D** - Upload a photo and recreate it as a printable model
- **OpenSCAD Code Generation** - Outputs parametric, printable-ready OpenSCAD code
- **Built-in SCAD Kernel** - Pre-loaded modules for fasteners, threads, gears, bearings, hinges, and more
- **In-App 3D Preview** - View your model in the browser with Three.js
- **STL Export** - Download STL files directly from the preview
- **Design Templates** - 9 quick-start templates for common objects
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
   GEMINI_MODEL=gemini-3-pro-preview
   THINKING_LEVEL=high
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
| `GEMINI_MODEL` | `gemini-3-pro-preview` | Model to use (`gemini-3-pro-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`) |
| `THINKING_LEVEL` | `high` | Reasoning depth: `low`, `medium`, or `high` |

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Three.js (3D rendering)
- OpenSCAD WASM (browser-based compilation)
- Google Gemini API

## License

MIT
