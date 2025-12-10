
export enum AppState {
  LOADING_ASSETS = 'LOADING_ASSETS',
  LOADING_MODEL = 'LOADING_MODEL',
  READY = 'READY',
  ERROR = 'ERROR'
}

export enum GestureMode {
  TREE = 'TREE',     // Fist or default
  SCATTER = 'SCATTER' // Open palm
}

export interface HandData {
  gesture: GestureMode;
  rotationSpeed: number; // -1 to 1 (left to right)
  isPresent: boolean;
  handX: number; // 0 to 1
  scatterFactor: number; // 0.0 (Closed) to 1.0 (Open)
}

export enum ParticleType {
  PHOTO = 'PHOTO',
  GOLD = 'GOLD',
  GREEN = 'GREEN',
  RED = 'RED'
}

export interface ParticleData {
  id: number;
  type: ParticleType;
  textureIndex: number;
  scale: number;
  // Target positions for tree mode
  treePos: [number, number, number];
  // Target positions for scatter mode
  scatterPos: [number, number, number];
}
