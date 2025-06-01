import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define available AI providers
export const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', keyPrefix: 'sk-' },
  { value: 'anthropic', label: 'Anthropic', keyPrefix: 'sk-ant-' },
  { value: 'gemini', label: 'Gemini', keyPrefix: '' },
  { value: 'google-vertex', label: 'Google Vertex', keyPrefix: '' },
  { value: 'groq', label: 'Groq', keyPrefix: 'gsk_' },
  { value: 'replicate', label: 'Replicate', keyPrefix: 'r8_' },
  { value: 'ollama', label: 'Ollama', keyPrefix: '' },
  { value: 'openrouter', label: 'OpenRouter', keyPrefix: 'sk-or-' },
] as const;

export type AIProviderValue = typeof AI_PROVIDERS[number]['value'];

interface AIConfigState {
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3-opus' | 'claude-3-sonnet';
  selectedProvider: AIProviderValue;
  temperature: number;
  maxTokens: number;
  enableVoiceInput: boolean;
  enableVoiceOutput: boolean;
  voiceType: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  openRouterApiKey: string;
  openRouterModel: string;
  setModel: (model: 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3-opus' | 'claude-3-sonnet') => void;
  setSelectedProvider: (provider: AIProviderValue) => void;
  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;
  setEnableVoiceInput: (enable: boolean) => void;
  setEnableVoiceOutput: (enable: boolean) => void;
  setVoiceType: (voiceType: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer') => void;
  setOpenRouterApiKey: (apiKey: string) => void;
  setOpenRouterModel: (model: string) => void;
}

// Server-side default state (cached to prevent infinite loops)
const serverState = {
  model: 'gpt-4' as const,
  selectedProvider: 'openrouter' as const,
  temperature: 0.7,
  maxTokens: 2048,
  enableVoiceInput: false,
  enableVoiceOutput: false,
  voiceType: 'nova' as const,
  openRouterApiKey: '',
  openRouterModel: 'anthropic/claude-3-haiku',
};

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set) => ({
      ...serverState,
      setModel: (model) => set({ model }),
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setEnableVoiceInput: (enable) => set({ enableVoiceInput: enable }),
      setEnableVoiceOutput: (enable) => set({ enableVoiceOutput: enable }),
      setVoiceType: (voiceType) => set({ voiceType }),
      setOpenRouterApiKey: (apiKey) => set({ openRouterApiKey: apiKey }),
      setOpenRouterModel: (model) => set({ openRouterModel: model }),
    }),
    {
      name: 'ai-config-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);