# PolyGen AI Documentation

Welcome to the PolyGen AI documentation. This folder contains technical documentation for developers and contributors.

## Quick Links

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Multi-agent pipeline architecture and data flow |
| [GST-SPECIFICATION.md](./GST-SPECIFICATION.md) | Geometric Structure Tree format specification |
| [DEVELOPER-SETUP.md](./DEVELOPER-SETUP.md) | Complete development environment setup guide |
| [API-REFERENCE.md](./API-REFERENCE.md) | Detailed API documentation for all services |
| [ADDING-COMPONENT-TYPES.md](./ADDING-COMPONENT-TYPES.md) | Guide to adding new GST component types |

## For New Developers

Start with these documents in order:

1. **[DEVELOPER-SETUP.md](./DEVELOPER-SETUP.md)** - Get your environment running
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand the system design
3. **[API-REFERENCE.md](./API-REFERENCE.md)** - Learn the service APIs

## For Contributors

If you want to extend PolyGen AI:

1. **[ADDING-COMPONENT-TYPES.md](./ADDING-COMPONENT-TYPES.md)** - Add new geometry types
2. **[GST-SPECIFICATION.md](./GST-SPECIFICATION.md)** - Understand the GST format
3. **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines

## Project Root Documents

| Document | Description |
|----------|-------------|
| [README.md](../README.md) | Project overview and quick start |
| [CHANGELOG.md](../CHANGELOG.md) | Version history and release notes |
| [ROADMAP.md](../ROADMAP.md) | Planned features and future direction |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute |

## Architecture Overview

```
User Prompt --> Planner (Gemini) --> GST --> Coder (Claude) --> OpenSCAD --> Validator (WASM) --> 3D Model
```

- **Planner**: Converts natural language to Geometric Structure Tree (JSON)
- **Coder**: Converts GST to executable OpenSCAD code
- **Validator**: Compiles and validates code in the browser

## Key Files

| File | Purpose |
|------|---------|
| `services/agentOrchestrator.ts` | Pipeline coordination |
| `services/plannerService.ts` | Gemini API interface |
| `services/coderService.ts` | Claude API interface |
| `services/validatorClient.ts` | Browser WASM validation |
| `services/quickFixAnalyzer.ts` | Smart fix generation |
| `types.ts` | TypeScript type definitions |

## Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community discussion
- **Pull Requests**: Code contributions
