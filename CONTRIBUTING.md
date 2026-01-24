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

## Development Setup

```bash
# Install dependencies
npm install

# Create .env.local with your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Start dev server
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add comments for complex logic

## Pull Request Guidelines

1. **Keep PRs focused** - One feature or fix per PR
2. **Update documentation** - If you change behavior, update the README
3. **Test your changes** - Make sure the app builds and runs
4. **Write clear commit messages** - Describe what and why

## What to Contribute

### Good First Issues
- UI/UX improvements
- New design templates
- Documentation improvements
- Bug fixes

### Larger Contributions
- New SCAD kernel modules
- Performance optimizations
- New export formats
- Accessibility improvements

### Before Starting Large Changes
Open an issue first to discuss the approach. This helps avoid duplicate work and ensures your contribution aligns with the project direction.

## SCAD Kernel Contributions

If adding new OpenSCAD modules to the kernel:

1. Add the module to `POLYGEN_KERNEL` in `services/geminiService.ts`
2. Document parameters with comments
3. Add to the system prompt's available modules list
4. Test with actual 3D prints if possible

Example module format:
```openscad
// Module: Your Module Name (brief description)
// param1: description (default=value)
// param2: description (default=value)
module your_module(param1=default, param2=default) {
    // Implementation
}
```

## Reporting Bugs

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and OS
- Screenshots if applicable
- Console errors if any

## Feature Requests

Feature requests are welcome! Please:
- Check existing issues first
- Describe the use case
- Explain why it would be useful

## Questions?

Open a discussion on GitHub or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
