import fs from 'fs';

// This is a test to verify the content of the unifiedGeneratorService source file
// to ensure the system prompt contains the correct signatures.
function verifyPromptSignatures() {
  const filePath =
    'c:/Users/noah/OneDrive/Documents/polygen-ai-assistant (1)/services/unifiedGeneratorService.ts';
  const content = fs.readFileSync(filePath, 'utf-8');

  console.log('--- PROMPT SIGNATURE VERIFICATION ---');

  const requiredSignatures = [
    'module picatinny_rail(slots=5, height=15)',
    'module molle_clip(width=28, height=40, thickness=4, gap=3)',
    'module molle_adapter_plate(plate_width = 80, plate_height = 50, clip_columns = 2)',
    'SOTA QUALITY GATING (P_succ)',
  ];

  let allPassed = true;
  for (const sig of requiredSignatures) {
    if (content.includes(sig)) {
      console.log(`✅ FOUND: ${sig}`);
    } else {
      console.error(`❌ MISSING: ${sig}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log(
      '\nCONCLUSION: The application prompt is correctly configured for SOTA generation.'
    );
  } else {
    process.exit(1);
  }
}

verifyPromptSignatures();
