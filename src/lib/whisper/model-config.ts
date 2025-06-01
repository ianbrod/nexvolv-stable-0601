/**
 * Whisper Model Configuration
 *
 * Defines available Whisper models with their specifications and performance characteristics.
 * Based on lessons learned from whisper-medium-implementation-report.md
 */

export interface WhisperModelConfig {
  id: string;
  name: string;
  parameters: string;
  fileSize: string;
  fileSizeMB: number;
  quality: 'Good' | 'Better' | 'Best';
  description: string;
  downloadUrl: {
    python: string;
  };
  // Performance characteristics
  performance: {
    threadsRecommended: number;
    batchSize: number;
    expectedSpeedPerMinute: string; // e.g., "7s/min"
    targetProcessingTime: string;   // e.g., "21s for 3-min audio"
  };
}

/**
 * Available Whisper models
 *
 * Only includes base.en and medium.en to avoid complexity and maintain performance.
 * Base model: Proven 20.94s performance for 3-minute audio
 * Medium model: Target 150-180s for 3-minute audio with better quality
 */
export const WHISPER_MODELS: Record<string, WhisperModelConfig> = {
  'base.en': {
    id: 'base.en',
    name: 'Base (English)',
    parameters: '74M',
    fileSize: '~140MB',
    fileSizeMB: 140,
    quality: 'Good',
    description: 'Fast and reliable - proven 20.94s for 3-min audio',
    downloadUrl: {
      python: 'base.en'
    },
    performance: {
      threadsRecommended: 4,
      batchSize: 16,
      expectedSpeedPerMinute: '7s/min',
      targetProcessingTime: '21s for 3-min audio'
    }
  },
  'medium.en': {
    id: 'medium.en',
    name: 'Medium (English)',
    parameters: '769M',
    fileSize: '~769MB',
    fileSizeMB: 769,
    quality: 'Better',
    description: 'Higher quality - AGGRESSIVE: target 60-90s for 3-min audio',
    downloadUrl: {
      python: 'medium.en'
    },
    performance: {
      threadsRecommended: 4,  // AGGRESSIVE: Same as base model for maximum speed
      batchSize: 16,  // AGGRESSIVE: Same as base model
      expectedSpeedPerMinute: '20-30s/min',  // AGGRESSIVE: Target 20-30s per minute
      targetProcessingTime: '60-90s for 3-min audio'  // AGGRESSIVE: Target 60-90s
    }
  }
};

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): WhisperModelConfig | undefined {
  return WHISPER_MODELS[modelId];
}

/**
 * Get all available model IDs
 */
export function getAvailableModelIds(): string[] {
  return Object.keys(WHISPER_MODELS);
}

/**
 * Get default model ID (base.en to preserve current behavior)
 */
export function getDefaultModelId(): string {
  return 'base.en';
}

/**
 * Check if a model ID is valid
 */
export function isValidModelId(modelId: string): boolean {
  return modelId in WHISPER_MODELS;
}

/**
 * Get model recommendations based on use case
 */
export function getModelRecommendations() {
  return {
    speed: 'base.en',
    quality: 'medium.en',
    balanced: 'base.en' // For now, base is recommended for most users
  };
}
