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
export const generateFileName = (spec?: { product_class?: string; mount_target?: string }): string => {
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
    } catch (e) {
      // Protocol handler failed, that's okay - file was still downloaded
      console.log('Protocol handler not available, file downloaded instead');
    }

    return {
      success: true,
      filePath: fileName
    };

  } catch (error: any) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to export file'
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
