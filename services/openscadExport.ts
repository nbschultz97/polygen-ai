/**
 * OpenSCAD Desktop Export Service
 * Saves SCAD files to Documents folder and attempts to open in OpenSCAD
 */

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Generate a filename based on the spec or timestamp
 */
export const generateFileName = (spec?: {
  product_class?: string;
  mount_target?: string;
}): string => {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  if (spec?.product_class) {
    const sanitized = spec.product_class
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30);
    return `polygen_${sanitized}_${timestamp}.scad`;
  }

  return `polygen_model_${timestamp}_${Date.now().toString(36)}.scad`;
};

/**
 * Export SCAD code to a file and trigger download
 * Also attempts to open with openscad:// protocol handler
 */
export const exportToOpenSCAD = async (
  code: string,
  spec?: { product_class?: string; mount_target?: string }
): Promise<ExportResult> => {
  try {
    const fileName = generateFileName(spec);

    // Create blob and download
    const blob = new Blob([code], { type: 'application/x-scad' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Try to open OpenSCAD via protocol handler (may not work on all systems)
    // This is a best-effort attempt
    try {
      // Create an iframe to attempt protocol handler without navigating away
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      // OpenSCAD doesn't have a standard protocol handler, so we just download
      // User will need to open the file manually or have file associations set up

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    } catch {
      // Protocol handler failed, that's okay - file was still downloaded
    }

    return {
      success: true,
      filePath: fileName,
    };
  } catch (error: any) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to export file',
    };
  }
};

/**
 * Copy code to clipboard
 */
export const copyToClipboard = async (code: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
};

/**
 * Session export data structure for debugging and back-briefs
 */
export interface SessionExportData {
  version: string;
  exportedAt: string;
  conversation: { role: string; text: string; timestamp?: number }[];
  generatedCode?: string;
  gst?: object;
  validationResult?: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    triangleCount?: number;
    isManifold?: boolean;
    volume?: number;
    boundingBox?: object;
  };
  codeHistory?: { code: string; prompt: string; timestamp: number }[];
}

/**
 * Export entire session for debugging and AI back-briefs
 * Includes conversation, generated code, GST, validation results
 */
export const exportSession = async (data: SessionExportData): Promise<ExportResult> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `polygen_session_${timestamp}.json`;

    // Format the export with pretty printing for readability
    const content = JSON.stringify(data, null, 2);

    // Create blob and download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      filePath: fileName,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export session';
    console.error('Session export failed:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
};
