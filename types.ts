// ============================================
// Core Message Types
// ============================================

export interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

// ============================================
// Specification Types (Legacy)
// ============================================

export interface SpecData {
  units?: string;
  product_class?: string;
  intended_platform?: string;
  mount_target?: string;
  attach_point?: string;
  constraints?: {
    process?: string;
    nozzle_mm?: number;
    layer_mm?: number;
    min_wall_mm?: number;
    clearance_mm?: number;
    slot_clearance_mm?: number;
  };
  envelope?: {
    max_x_mm?: string | number;
    max_y_mm?: string | number;
    max_z_mm?: string | number;
  };
  features?: any;
  exclusions?: string[];
  notes?: string;
}

export interface ClarificationQuestion {
  question: string;
  suggestions: string[]; // 2-4 likely answers user can click
}

// ============================================
// Geometric Structure Tree (GST) Types
// ============================================

export type GSTUnit = 'mm' | 'deg' | 'count';

export type GSTOrientation = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK' | 'CENTER';

export type GSTBooleanOp = 'add' | 'subtract' | 'intersect';

export interface GSTParameter {
  name: string;
  value: number;
  unit: GSTUnit;
  description?: string;
  min?: number;
  max?: number;
}

export interface GSTAnchor {
  name: string;
  position: [number, number, number];
  orientation: GSTOrientation;
  spin?: number;
}

export interface GSTAttachment {
  parentId: string;
  parentAnchor: string;
  childAnchor: string;
  offset?: [number, number, number];
}

export interface GSTComponent {
  id: string;
  name: string;
  type: string;
  parameters?: GSTParameter[];
  anchors?: GSTAnchor[];
  children?: GSTComponent[];
  attachTo?: GSTAttachment;
  booleanOp?: GSTBooleanOp;
  material?: string;
  color?: string;
}

export interface GSTBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface GeometricStructureTree {
  version: '1.0';
  name: string;
  description?: string;
  globalParameters: GSTParameter[];
  root: GSTComponent;
  boundingBox?: GSTBoundingBox;
  printOrientation?: 'flat' | 'upright' | 'angled';
  bosl2Features?: string[];
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  boundingBox?: GSTBoundingBox;
  vertexCount?: number;
  triangleCount?: number;
  isManifold: boolean;
  gstMatch?: boolean;
  gstDeviationPercent?: number;
}

// ============================================
// Smart Quick Fix Types
// ============================================

export type QuickFixCategory = 'tolerance' | 'dimension' | 'structure' | 'print' | 'geometry';

export interface SmartQuickFix {
  id: string;
  label: string;
  description: string;
  prompt: string;
  category: QuickFixCategory;
  relevance: number; // 0-1 for sorting
  icon?: string;
}

// ============================================
// Generated Asset (Extended)
// ============================================

export interface GeneratedAsset {
  scadCode?: string;
  spec?: SpecData;
  gst?: GeometricStructureTree;
  specSummary?: string[];
  questions?: string[];
  clarifications?: ClarificationQuestion[];
  explanation?: string;
  sources?: string[];
  validationResult?: ValidationResult;
  smartFixes?: SmartQuickFix[];
}

// ============================================
// Workflow Types
// ============================================

export type WorkflowStep =
  | 'idle'           // No activity
  | 'planning'       // Planner agent working (GST generation)
  | 'gst-review'     // User reviewing GST
  | 'coding'         // Coder agent working (SCAD generation)
  | 'validating'     // Backend validation
  | 'processing'     // Legacy: single-agent processing
  | 'spec-review'    // Clarification needed
  | 'complete';      // Success

export interface AppState {
  messages: Message[];
  isLoading: boolean;
  currentAsset: GeneratedAsset | null;
  thinkingBudget: number;
  workflowStep: WorkflowStep;
}

// ============================================
// Agent Service Types
// ============================================

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface PlannerInput {
  userPrompt: string;
  imageData?: ImageData;
  conversationHistory?: string[];
}

export interface PlannerOutput {
  needsClarification: boolean;
  clarifications?: ClarificationQuestion[];
  gst?: GeometricStructureTree;
  spec?: SpecData;
  partialSpec?: SpecData;
}

export interface CoderInput {
  gst: GeometricStructureTree;
  validationErrors?: string[];
}

export interface CoderEditInput {
  existingGST: GeometricStructureTree;
  existingCode: string;
  editRequest: string;
}

export interface CoderOutput {
  scadCode: string;
  explanation?: string;
}

export interface OrchestratorCallbacks {
  onStepChange: (step: WorkflowStep) => void;
  onGSTGenerated: (gst: GeometricStructureTree) => void;
  onCodeGenerated: (code: string) => void;
  onValidationComplete: (result: ValidationResult) => void;
  onSmartFixesGenerated: (fixes: SmartQuickFix[]) => void;
  onError: (error: Error, step: WorkflowStep) => void;
}
