/**
 * Demo Service
 * Manages anonymous demo mode - allows 2 free generations without signup
 * Uses localStorage to track usage
 */

const DEMO_STORAGE_KEY = 'polygen_demo_usage';
const DEMO_MAX_GENERATIONS = 2;

interface DemoUsage {
  count: number;
  createdAt: number;
}

/**
 * Get current demo usage from localStorage
 */
function getDemoUsage(): DemoUsage {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { count: 0, createdAt: Date.now() };
}

/**
 * Save demo usage to localStorage
 */
function saveDemoUsage(usage: DemoUsage): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

/**
 * Check if demo user can generate
 */
export function canDemoGenerate(): { allowed: boolean; remaining: number; limit: number } {
  const usage = getDemoUsage();
  const remaining = Math.max(0, DEMO_MAX_GENERATIONS - usage.count);
  return {
    allowed: remaining > 0,
    remaining,
    limit: DEMO_MAX_GENERATIONS,
  };
}

/**
 * Record a demo generation
 */
export function recordDemoGeneration(): void {
  const usage = getDemoUsage();
  usage.count += 1;
  saveDemoUsage(usage);
}

/**
 * Check if user is in demo mode (has used demo but not signed up)
 */
export function hasDemoHistory(): boolean {
  const usage = getDemoUsage();
  return usage.count > 0;
}

/**
 * Reset demo usage (for testing)
 */
export function resetDemoUsage(): void {
  localStorage.removeItem(DEMO_STORAGE_KEY);
}
