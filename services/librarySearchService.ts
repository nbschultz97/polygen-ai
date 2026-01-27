/**
 * Library Search Service
 * SOTA 3-Tier Library System - Tier 3: Dynamic Library Discovery
 *
 * Searches GitHub for OpenSCAD libraries and modules that can be
 * used to fulfill user requests. Uses web search to find relevant
 * .scad files and fetches them for potential use.
 *
 * Flow:
 * 1. User requests a complex part (e.g., "gear", "thread", "hinge")
 * 2. This service searches for existing OpenSCAD implementations
 * 3. Found libraries are passed to refactoringAgent for cleanup
 * 4. Cleaned modules are cached for future use
 */

// Types for library search results
export interface LibrarySearchResult {
  name: string;
  description: string;
  url: string;
  rawUrl: string;
  repository: string;
  stars?: number;
  relevanceScore: number;
}

export interface FetchedLibrary {
  name: string;
  source: string;
  content: string;
  modules: string[];
  fetchedAt: number;
}

// Cache for fetched libraries
const libraryCache: Map<string, FetchedLibrary> = new Map();

// Keywords that indicate a need for external library search
const COMPLEX_PART_KEYWORDS = [
  'gear',
  'thread',
  'screw thread',
  'metric thread',
  'knurl',
  'knurling',
  'hinge',
  'living hinge',
  'snap fit',
  'dovetail',
  'ball joint',
  'bearing',
  'sprocket',
  'pulley',
  'cam',
  'rack and pinion',
  'worm gear',
  'bevel gear',
  'helical',
];

/**
 * Check if a prompt requires external library search
 */
export function needsLibrarySearch(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  return COMPLEX_PART_KEYWORDS.some((keyword) => lowerPrompt.includes(keyword));
}

/**
 * Search for OpenSCAD libraries on GitHub
 * Uses Perplexity Sonar API or falls back to direct GitHub search
 */
export async function searchLibraries(query: string): Promise<LibrarySearchResult[]> {
  const searchQuery = `site:github.com filetype:scad ${query} openscad module`;

  try {
    // Try Perplexity Sonar API first (if configured)
    const perplexityKey = (import.meta as any).env?.VITE_PERPLEXITY_API_KEY;

    if (perplexityKey) {
      return await searchWithPerplexity(searchQuery, perplexityKey);
    }

    // Fall back to GitHub API search
    return await searchGitHub(query);
  } catch (error) {
    console.error('Library search failed:', error);
    return [];
  }
}

/**
 * Search using Perplexity Sonar API
 */
async function searchWithPerplexity(query: string, apiKey: string): Promise<LibrarySearchResult[]> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content:
            'You are a code search assistant. Find OpenSCAD (.scad) files on GitHub that implement the requested functionality. Return JSON array of results with: name, description, url, repository.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      return results.map((r: any, i: number) => ({
        name: r.name || `result_${i}`,
        description: r.description || '',
        url: r.url || '',
        rawUrl: convertToRawUrl(r.url || ''),
        repository: r.repository || extractRepoFromUrl(r.url || ''),
        relevanceScore: 1 - i * 0.1,
      }));
    }
  } catch {
    console.warn('Failed to parse Perplexity response as JSON');
  }

  return [];
}

/**
 * Search using GitHub API
 */
async function searchGitHub(query: string): Promise<LibrarySearchResult[]> {
  const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(
    query + ' extension:scad'
  )}&per_page=10`;

  const response = await fetch(searchUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      console.warn('GitHub API rate limit reached');
      return [];
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.items || []).map((item: any, i: number) => ({
    name: item.name,
    description: item.repository?.description || '',
    url: item.html_url,
    rawUrl: convertToRawUrl(item.html_url),
    repository: item.repository?.full_name || '',
    stars: item.repository?.stargazers_count,
    relevanceScore: item.score ? item.score / 100 : 1 - i * 0.1,
  }));
}

/**
 * Convert GitHub URL to raw content URL
 */
function convertToRawUrl(githubUrl: string): string {
  return githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
}

/**
 * Extract repository name from GitHub URL
 */
function extractRepoFromUrl(url: string): string {
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : '';
}

/**
 * Fetch raw content of a library file
 */
export async function fetchLibraryContent(rawUrl: string): Promise<string | null> {
  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch library: ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch library content:', error);
    return null;
  }
}

/**
 * Extract module names from OpenSCAD code
 */
export function extractModuleNames(scadCode: string): string[] {
  const modulePattern = /module\s+(\w+)\s*\(/g;
  const modules: string[] = [];
  let match;

  while ((match = modulePattern.exec(scadCode)) !== null) {
    modules.push(match[1]);
  }

  return modules;
}

/**
 * Full library discovery flow
 * 1. Search for libraries matching the query
 * 2. Fetch top results
 * 3. Extract module information
 * 4. Cache for future use
 */
export async function discoverLibraries(
  query: string,
  maxResults: number = 3
): Promise<FetchedLibrary[]> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (libraryCache.has(cacheKey)) {
    const cached = libraryCache.get(cacheKey)!;
    // Cache valid for 1 hour
    if (Date.now() - cached.fetchedAt < 3600000) {
      console.log(`Using cached library for: ${query}`);
      return [cached];
    }
  }

  // Search for libraries
  const results = await searchLibraries(query);
  if (results.length === 0) {
    console.log(`No libraries found for: ${query}`);
    return [];
  }

  // Fetch top results
  const fetchedLibraries: FetchedLibrary[] = [];

  for (const result of results.slice(0, maxResults)) {
    const content = await fetchLibraryContent(result.rawUrl);
    if (content) {
      const library: FetchedLibrary = {
        name: result.name,
        source: result.repository,
        content,
        modules: extractModuleNames(content),
        fetchedAt: Date.now(),
      };

      fetchedLibraries.push(library);

      // Cache the library
      libraryCache.set(cacheKey, library);
    }
  }

  console.log(`Discovered ${fetchedLibraries.length} libraries for: ${query}`);
  return fetchedLibraries;
}

/**
 * Get cached library by name
 */
export function getCachedLibrary(name: string): FetchedLibrary | null {
  return libraryCache.get(name.toLowerCase()) || null;
}

/**
 * Clear library cache
 */
export function clearLibraryCache(): void {
  libraryCache.clear();
}

// Export service object
export const librarySearchService = {
  needsLibrarySearch,
  searchLibraries,
  fetchLibraryContent,
  extractModuleNames,
  discoverLibraries,
  getCachedLibrary,
  clearLibraryCache,
};

export default librarySearchService;
