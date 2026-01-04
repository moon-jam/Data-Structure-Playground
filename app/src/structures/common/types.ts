export interface VisualizationStep {
  type: 'highlight' | 'move' | 'insert' | 'delete' | 'rotate' | 'message' | 'complete' | 'error';
  targetIds?: string[];
  message?: string;
  payload?: any;
}

export interface NodePosition {
  x: number;
  y: number;
}
