'use client';

import { useState, useEffect } from 'react';
import { useAIConfigStore, AI_PROVIDERS } from '@/stores/aiConfigStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Eye, EyeOff, Key, Plus, Trash2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the type for a saved API key
interface SavedApiKey {
  id: string;
  nickname: string;
  key: string;
  model: string;
  provider: string;
}

export function APIKeyConfiguration() {
  const {
    selectedProvider,
    setSelectedProvider,
    openRouterApiKey,
    openRouterModel,
    setOpenRouterApiKey,
    setOpenRouterModel,
  } = useAIConfigStore();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [keyNickname, setKeyNickname] = useState('');
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);

  // Load saved keys from localStorage on component mount
  useEffect(() => {
    const savedKeysJson = localStorage.getItem('saved-api-keys');
    if (savedKeysJson) {
      try {
        const keys = JSON.parse(savedKeysJson);
        setSavedKeys(Array.isArray(keys) ? keys : []);
      } catch (error) {
        console.error('Error parsing saved API keys:', error);
      }
    }
  }, []);

  // Function to validate API key format based on provider
  const validateApiKeyFormat = (key: string, provider: string): boolean => {
    const providerConfig = AI_PROVIDERS.find(p => p.value === provider);
    if (!providerConfig || !providerConfig.keyPrefix) return true; // No validation for providers without prefix
    return key.startsWith(providerConfig.keyPrefix);
  };

  // Get current provider configuration
  const currentProvider = AI_PROVIDERS.find(p => p.value === selectedProvider) || AI_PROVIDERS[7]; // Default to OpenRouter

  // Function to save the current API key
  const saveApiKey = async () => {
    const currentApiKey = selectedProvider === 'openrouter' ? openRouterApiKey : apiKey;
    const currentModel = selectedProvider === 'openrouter' ? openRouterModel : model;

    if (!currentApiKey) {
      setApiKeyStatus('error');
      setApiKeyMessage('Please enter an API key first');
      return;
    }

    // Validate the API key format
    if (!validateApiKeyFormat(currentApiKey, selectedProvider)) {
      setApiKeyStatus('error');
      setApiKeyMessage(`Invalid API key format${currentProvider.keyPrefix ? `. ${currentProvider.label} API keys should start with "${currentProvider.keyPrefix}"` : ''}`);
      return;
    }

    if (!keyNickname) {
      setApiKeyStatus('error');
      setApiKeyMessage('Please enter a nickname for this API key');
      return;
    }

    try {
      setIsTestingApiKey(true);
      setApiKeyStatus('idle');
      setApiKeyMessage('Saving API key...');

      // For now, we'll skip validation for non-OpenRouter providers
      // In a real implementation, you'd want to add validation endpoints for each provider
      let validationSuccess = true;

      if (selectedProvider === 'openrouter') {
        const response = await fetch('/api/test-openrouter-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: currentApiKey }),
        });

        const data = await response.json();
        validationSuccess = data.success;

        if (!validationSuccess) {
          setApiKeyStatus('error');
          setApiKeyMessage(data.error || 'Failed to validate API key');
          return;
        }
      }

      if (validationSuccess) {
        // Create a new saved key object
        const newKey: SavedApiKey = {
          id: Date.now().toString(),
          nickname: keyNickname,
          key: currentApiKey,
          model: currentModel || '',
          provider: selectedProvider,
        };

        // Add to saved keys
        const updatedKeys = [...savedKeys, newKey];
        setSavedKeys(updatedKeys);

        // Save to localStorage
        localStorage.setItem('saved-api-keys', JSON.stringify(updatedKeys));

        setApiKeyStatus('success');
        setApiKeyMessage(`API key "${keyNickname}" has been saved`);

        // Clear the nickname field
        setKeyNickname('');
      }
    } catch (error) {
      setApiKeyStatus('error');
      setApiKeyMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  // Function to load a saved API key
  const loadSavedKey = (savedKey: SavedApiKey) => {
    setSelectedProvider(savedKey.provider as any || 'openrouter');

    if (savedKey.provider === 'openrouter') {
      setOpenRouterApiKey(savedKey.key);
      setOpenRouterModel(savedKey.model);
    } else {
      setApiKey(savedKey.key);
      setModel(savedKey.model);
    }

    setApiKeyStatus('success');
    setApiKeyMessage(`Loaded key "${savedKey.nickname}"`);
  };

  // Function to delete a saved API key
  const deleteSavedKey = (id: string) => {
    const updatedKeys = savedKeys.filter(key => key.id !== id);
    setSavedKeys(updatedKeys);
    localStorage.setItem('saved-api-keys', JSON.stringify(updatedKeys));
  };

  return (
    <Card className="py-3">
      <CardHeader className="px-4 pb-1">
        <CardTitle>API Key Configuration</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left Column - Configuration */}
          <div className="space-y-3">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider-select">AI Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>API Key</span>
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={selectedProvider === 'openrouter' ? openRouterApiKey : apiKey}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (selectedProvider === 'openrouter') {
                      setOpenRouterApiKey(newValue);
                    } else {
                      setApiKey(newValue);
                    }

                    // Provide real-time validation feedback
                    if (newValue) {
                      if (!validateApiKeyFormat(newValue, selectedProvider)) {
                        setApiKeyStatus('error');
                        setApiKeyMessage(`Invalid API key format${currentProvider.keyPrefix ? `. ${currentProvider.label} API keys should start with "${currentProvider.keyPrefix}"` : ''}`);
                      } else {
                        setApiKeyStatus('idle');
                        setApiKeyMessage('');
                      }
                    } else {
                      setApiKeyStatus('idle');
                      setApiKeyMessage('');
                    }
                  }}
                  placeholder={currentProvider.keyPrefix || 'Enter API key...'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Model Input */}
            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Model</span>
              </Label>
              <Input
                id="model"
                type="text"
                value={selectedProvider === 'openrouter' ? openRouterModel : model}
                onChange={(e) => {
                  if (selectedProvider === 'openrouter') {
                    setOpenRouterModel(e.target.value);
                  } else {
                    setModel(e.target.value);
                  }
                }}
                placeholder={selectedProvider === 'openrouter' ? 'anthropic/claude-3-haiku' : 'Enter model name...'}
              />
            </div>

            {/* Key Nickname and Save */}
            <div className="space-y-2">
              <Label htmlFor="key-nickname">Key Nickname</Label>
              <div className="flex space-x-2">
                <Input
                  id="key-nickname"
                  type="text"
                  value={keyNickname}
                  onChange={(e) => setKeyNickname(e.target.value)}
                  placeholder="My API Key"
                  className="flex-grow"
                />
                <Button
                  onClick={saveApiKey}
                  disabled={isTestingApiKey || !(selectedProvider === 'openrouter' ? openRouterApiKey : apiKey) || !validateApiKeyFormat(selectedProvider === 'openrouter' ? openRouterApiKey : apiKey, selectedProvider) || !keyNickname}
                  variant="outline"
                  size="sm"
                  className={`${
                    (selectedProvider === 'openrouter' ? openRouterApiKey : apiKey) && keyNickname
                      ? 'bg-green-500/20 hover:bg-green-500/30 dark:bg-green-400/20 dark:hover:bg-green-400/30 border-2 border-green-500 dark:border-green-400 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200'
                      : ''
                  }`}
                >
                  {isTestingApiKey ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

          </div>

          {/* Right Column - Saved Keys */}
          <div className="flex flex-col relative">
            {/* Status Messages - Positioned absolutely in dead space above header */}
            {apiKeyMessage && (
              <div className={`absolute -top-6 left-0 text-sm ${
                apiKeyStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                apiKeyStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-blue-600 dark:text-blue-400'
              }`}>
                {apiKeyMessage}
              </div>
            )}
            <h3 className="text-sm font-medium mb-2">Saved API Keys</h3>
            {savedKeys.length > 0 ? (
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full max-h-[300px]">
                  <div className="space-y-2 pr-2">
                    {savedKeys.map((savedKey) => {
                      const provider = AI_PROVIDERS.find(p => p.value === (savedKey.provider || 'openrouter'));
                      return (
                        <div
                          key={savedKey.id}
                          className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate">{savedKey.nickname}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{provider?.label || 'Unknown'}</span>
                              {savedKey.model && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{savedKey.model}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadSavedKey(savedKey)}
                              title="Use this key"
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSavedKey(savedKey.id)}
                              title="Delete this key"
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground border rounded-md">
                No saved keys yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
