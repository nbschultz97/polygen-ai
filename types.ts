
export interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

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

export interface GeneratedAsset {
  scadCode?: string; // Mapped from 'scad_body'
  spec?: SpecData;
  specSummary?: string[]; // Derived or optional
  questions?: string[]; // Legacy simple questions
  clarifications?: ClarificationQuestion[]; // New: questions with suggested answers
  explanation?: string;
  sources?: string[]; // For Google Search grounding sources
}

export type WorkflowStep = 'idle' | 'processing' | 'spec-review' | 'complete';

export interface AppState {
  messages: Message[];
  isLoading: boolean;
  currentAsset: GeneratedAsset | null;
  thinkingBudget: number;
  workflowStep: WorkflowStep;
}
