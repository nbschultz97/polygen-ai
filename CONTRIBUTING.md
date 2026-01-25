# Contributing to PolyGen AI

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/polygen-ai.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Test locally: `npm run dev`
7. Commit and push
8. Open a Pull Request

For detailed setup instructions, see [docs/DEVELOPER-SETUP.md](docs/DEVELOPER-SETUP.md).

## Development Setup

```bash
# Install dependencies
npm install

# Create .env.local with your API keys
cat > .env.local << EOF
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_claude_key_here
USE_MULTI_AGENT=true
EOF

# Start dev server
npm run dev
```

## Project Structure

```
polygen-ai/
├── api/                    # Vercel serverless functions
├── components/             # React components
├── services/               # Business logic
│   ├── agentOrchestrator.ts   # Pipeline coordinator
│   ├── plannerService.ts      # Gemini GST generation
│   ├── coderService.ts        # Claude code generation
│   └── ...
├── docs/                   # Documentation
├── types.ts                # TypeScript definitions
└── App.tsx                 # Main component
```

## Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add comments for complex logic
- Prefer functional components with hooks
- Use Tailwind CSS for styling

## Pull Request Guidelines

1. **Keep PRs focused** - One feature or fix per PR
2. **Update documentation** - If you change behavior, update the docs
3. **Test your changes** - Make sure the app builds and runs
4. **Write clear commit messages** - Describe what and why

### Commit Message Format

```
type: brief description

Longer explanation if needed.
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat: add M-LOK slot component type`
- `fix: handle empty GST response from Planner`
- `docs: update API reference for orchestrator`

## What to Contribute

### Good First Issues

- UI/UX improvements
- New design templates
- Documentation improvements
- Bug fixes
- Accessibility improvements

### Larger Contributions

- New GST component types (see [docs/ADDING-COMPONENT-TYPES.md](docs/ADDING-COMPONENT-TYPES.md))
- Performance optimizations
- New export formats
- Additional AI model support

### Before Starting Large Changes

Open an issue first to discuss the approach. This helps avoid duplicate work and ensures your contribution aligns with the project direction.

## Adding New Features

### New GST Component Types

See [docs/ADDING-COMPONENT-TYPES.md](docs/ADDING-COMPONENT-TYPES.md) for the complete guide.

Summary:
1. Document in `types.ts`
2. Add to Planner system prompt
3. Add to Coder system prompt
4. Add smart fixes

### New Design Templates

Templates are defined in the main App component. To add a new template:

1. Add template definition with name, description, and prompt
2. Test that it generates reasonable results
3. Consider what quick fixes would be useful

### New Quick Fixes

Add to `services/quickFixAnalyzer.ts`:

```typescript
fixes.push({
  id: 'unique-id',
  label: 'Button Label',
  description: 'Tooltip text',
  prompt: 'Instruction for the Coder agent',
  category: 'tolerance' | 'dimension' | 'structure' | 'print' | 'geometry',
  relevance: 0.0 to 1.0
});
```

## Testing

### Manual Testing

Test these scenarios before submitting:

1. **New generation**: Basic prompt creates valid model
2. **Edit mode**: Modifications work without full regeneration
3. **Image input**: Photo-to-3D generates reasonable result
4. **Error handling**: Invalid prompts show helpful errors
5. **Cancellation**: Abort button stops generation

### Test Prompts

| Prompt | Tests |
|--------|-------|
| "Simple cube 50mm" | Basic geometry |
| "Box with hinged lid" | Boolean ops, multi-part |
| "Phone stand adjustable angle" | Parametric design |
| "Picatinny rail mount" | Domain knowledge |
| (gibberish text) | Error handling |

## Reporting Bugs

When reporting bugs, please include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and OS version
- Screenshots if applicable
- Console errors (F12 -> Console)
- Network requests if API-related (F12 -> Network)

## Feature Requests

Feature requests are welcome! Please:

- Check existing issues first
- Describe the use case
- Explain why it would be useful
- Consider implementation complexity

## Architecture

For understanding the codebase:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Multi-agent pipeline
- [docs/GST-SPECIFICATION.md](docs/GST-SPECIFICATION.md) - GST format
- [docs/API-REFERENCE.md](docs/API-REFERENCE.md) - Service APIs

## Questions?

- **Bugs**: Open a GitHub issue
- **Features**: Open a GitHub discussion
- **Questions**: Open a GitHub discussion
- **Security**: Email maintainers directly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
