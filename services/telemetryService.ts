/**
 * Telemetry Service
 * Logs library defects and polyfill events to Supabase for human review.
 * Implements "Human-in-the-Loop" methodology for global library stabilization.
 */

import { supabase } from './authService';

export interface LibraryDefect {
  moduleName: string;
  reasoning: string;
  scadCode: string; // The polyfilled code for reference
  pSucc?: number;
  userId?: string;
}

/**
 * Log a detected library defect to Supabase
 */
export async function logLibraryDefect(defect: LibraryDefect): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('library_defects').insert({
      module_name: defect.moduleName,
      reasoning: defect.reasoning,
      scad_code: defect.scadCode,
      p_succ: defect.pSucc,
      user_id: user?.id,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log library defect:', error);
    } else {
      console.log(`Telemetry: Logged defect for module "${defect.moduleName}"`);
    }
  } catch (error) {
    console.error('Telemetry service error:', error);
  }
}

export const telemetryService = {
  logLibraryDefect,
};

export default telemetryService;
