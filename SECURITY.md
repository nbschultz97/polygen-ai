# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | ✅ Active support  |
| < 3.0   | ❌ No longer supported |

## Reporting a Vulnerability

If you discover a security vulnerability in PolyGen AI, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **noah@ceradonsystems.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.

## Security Considerations

### API Keys
- Never commit API keys to the repository
- Use `.env.local` for local development (gitignored)
- Use Vercel environment variables for production

### Authentication
- Supabase handles all auth flows (email/password + OAuth)
- Row-Level Security (RLS) enforced at the database level
- JWTs validated server-side on all protected endpoints

### Rate Limiting
- Anonymous demo: 5 req/min per IP, 2 total generations
- Authenticated: 20 req/min per user
- Stripe webhook signatures verified on all payment events

### Client-Side Security
- OpenSCAD WASM runs in a sandboxed Web Worker
- No user code is executed on the server
- STL files are processed client-side only
- Content Security Policy headers configured in Vercel deployment

### Dependencies
- Dependabot enabled for automated security updates
- GitHub Actions CI runs on all PRs
