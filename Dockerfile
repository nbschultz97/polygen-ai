# ============================================
# PolyGen AI - Development Dockerfile
# Multi-stage build for local development
# ============================================

# Stage 1: Base image with Node.js and pnpm
FROM node:25-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9 --activate

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# ============================================
# Stage 2: Development dependencies
# ============================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 3: Development server
# ============================================
FROM base AS development

# Set development environment
ENV NODE_ENV=development
ENV VITE_HOST=0.0.0.0
ENV VITE_PORT=3000

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Expose development server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start development server with hot reload
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ============================================
# Stage 4: Production build
# ============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
ARG GEMINI_API_KEY
ARG GEMINI_MODEL=gemini-3-pro-preview
ARG CODER_MODEL=claude-sonnet-4-20250514
ARG THINKING_LEVEL=high
ARG USE_MULTI_AGENT=true

ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GEMINI_MODEL=$GEMINI_MODEL
ENV CODER_MODEL=$CODER_MODEL
ENV THINKING_LEVEL=$THINKING_LEVEL
ENV USE_MULTI_AGENT=$USE_MULTI_AGENT

RUN pnpm build

# ============================================
# Stage 5: Production server (optional - for self-hosting)
# ============================================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
