// User Preferences Service - Persists settings to localStorage

export interface PrinterSettings {
  nozzle_diameter: number;      // mm (default 0.4)
  layer_height: number;         // mm (default 0.2)
  min_wall_thickness: number;   // mm (default 1.2)
  min_feature_size: number;     // mm (default 0.4)
  bed_size_x: number;           // mm (default 220)
  bed_size_y: number;           // mm (default 220)
  bed_size_z: number;           // mm (default 250)
}

export interface ToleranceSettings {
  fit_loose: number;    // mm (default 0.4)
  fit_normal: number;   // mm (default 0.2)
  fit_tight: number;    // mm (default 0.1)
}

export interface UserPreferences {
  printer: PrinterSettings;
  tolerances: ToleranceSettings;
  defaultMaterial: string;
  enableWebSearch: boolean;     // Use Gemini grounding for reference data
  autoRender3D: boolean;        // Auto-render 3D preview
  enableTeachingMode: boolean;  // Add educational comments to code
  recentDesigns: string[];      // Last 10 design descriptions
}

const STORAGE_KEY = 'polygen_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  printer: {
    nozzle_diameter: 0.4,
    layer_height: 0.2,
    min_wall_thickness: 1.2,
    min_feature_size: 0.4,
    bed_size_x: 220,
    bed_size_y: 220,
    bed_size_z: 250,
  },
  tolerances: {
    fit_loose: 0.4,
    fit_normal: 0.2,
    fit_tight: 0.1,
  },
  defaultMaterial: 'PLA',
  enableWebSearch: true,
  autoRender3D: true,
  enableTeachingMode: true,  // On by default to help users learn
  recentDesigns: [],
};

export const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e);
  }
  return DEFAULT_PREFERENCES;
};

export const savePreferences = (prefs: UserPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
};

export const updatePreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): UserPreferences => {
  const current = loadPreferences();
  const updated = { ...current, [key]: value };
  savePreferences(updated);
  return updated;
};

export const addRecentDesign = (description: string): void => {
  const prefs = loadPreferences();
  const recent = [description, ...prefs.recentDesigns.filter(d => d !== description)].slice(0, 10);
  savePreferences({ ...prefs, recentDesigns: recent });
};

export const getPreferencesForPrompt = (): string => {
  const prefs = loadPreferences();
  return `
USER PRINTER SETTINGS:
- Nozzle: ${prefs.printer.nozzle_diameter}mm
- Layer Height: ${prefs.printer.layer_height}mm
- Min Wall: ${prefs.printer.min_wall_thickness}mm
- Build Volume: ${prefs.printer.bed_size_x}x${prefs.printer.bed_size_y}x${prefs.printer.bed_size_z}mm
- Material: ${prefs.defaultMaterial}

TOLERANCE PREFERENCES:
- Loose Fit: ${prefs.tolerances.fit_loose}mm
- Normal Fit: ${prefs.tolerances.fit_normal}mm
- Tight Fit: ${prefs.tolerances.fit_tight}mm
`.trim();
};
