/**
 * Whisper Settings Store
 * 
 * Manages whisper model selection and download status with localStorage persistence.
 * Defaults to 'base.en' to preserve current excellent performance (20.94s for 3-min audio).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDefaultModelId, isValidModelId } from '@/lib/whisper/model-config';

interface WhisperSettingsState {
  // Selected model ID
  selectedModelId: string;
  
  // Download status tracking
  downloadStatus: Record<string, 'not-downloaded' | 'downloading' | 'downloaded' | 'error'>;
  
  // Download progress (0-100)
  downloadProgress: Record<string, number>;
  
  // Actions
  setSelectedModel: (modelId: string) => void;
  setDownloadStatus: (modelId: string, status: 'not-downloaded' | 'downloading' | 'downloaded' | 'error') => void;
  setDownloadProgress: (modelId: string, progress: number) => void;
  
  // Getters
  isModelDownloaded: (modelId: string) => boolean;
  isModelDownloading: (modelId: string) => boolean;
  getDownloadProgress: (modelId: string) => number;
}

// Server-side default state (cached to prevent infinite loops)
const serverState = {
  selectedModelId: getDefaultModelId(), // 'base.en' to preserve current behavior
  downloadStatus: {
    'base.en': 'downloaded' as const, // Assume base model is already available
    'medium.en': 'not-downloaded' as const
  },
  downloadProgress: {
    'base.en': 100,
    'medium.en': 0
  }
};

export const useWhisperSettingsStore = create<WhisperSettingsState>()(
  persist(
    (set, get) => ({
      ...serverState,
      
      setSelectedModel: (modelId: string) => {
        if (!isValidModelId(modelId)) {
          console.warn(`Invalid model ID: ${modelId}. Keeping current selection.`);
          return;
        }
        
        console.log(`Whisper model selection changed to: ${modelId}`);
        set({ selectedModelId: modelId });
      },
      
      setDownloadStatus: (modelId: string, status: 'not-downloaded' | 'downloading' | 'downloaded' | 'error') => {
        set((state) => ({
          downloadStatus: {
            ...state.downloadStatus,
            [modelId]: status
          }
        }));
      },
      
      setDownloadProgress: (modelId: string, progress: number) => {
        const clampedProgress = Math.max(0, Math.min(100, progress));
        set((state) => ({
          downloadProgress: {
            ...state.downloadProgress,
            [modelId]: clampedProgress
          }
        }));
      },
      
      // Getter functions
      isModelDownloaded: (modelId: string) => {
        const state = get();
        return state.downloadStatus[modelId] === 'downloaded';
      },
      
      isModelDownloading: (modelId: string) => {
        const state = get();
        return state.downloadStatus[modelId] === 'downloading';
      },
      
      getDownloadProgress: (modelId: string) => {
        const state = get();
        return state.downloadProgress[modelId] || 0;
      }
    }),
    {
      name: 'whisper-settings-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      
      // Only persist essential data
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        downloadStatus: state.downloadStatus,
        downloadProgress: state.downloadProgress
      })
    }
  )
);

/**
 * Hook to get current selected model ID
 */
export const useSelectedModelId = () => useWhisperSettingsStore((state) => state.selectedModelId);

/**
 * Hook to get model download status
 */
export const useModelDownloadStatus = (modelId: string) => 
  useWhisperSettingsStore((state) => state.downloadStatus[modelId] || 'not-downloaded');

/**
 * Hook to get model download progress
 */
export const useModelDownloadProgress = (modelId: string) => 
  useWhisperSettingsStore((state) => state.downloadProgress[modelId] || 0);

/**
 * Hook to check if model is downloaded
 */
export const useIsModelDownloaded = (modelId: string) => 
  useWhisperSettingsStore((state) => state.isModelDownloaded(modelId));

/**
 * Hook to check if model is downloading
 */
export const useIsModelDownloading = (modelId: string) => 
  useWhisperSettingsStore((state) => state.isModelDownloading(modelId));
