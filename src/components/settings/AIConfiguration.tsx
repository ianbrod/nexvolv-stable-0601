'use client';

import { useState } from 'react';
import { useAIConfigStore } from '@/stores/aiConfigStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Brain, Volume2, Mic, Eye, EyeOff, Key, ExternalLink } from 'lucide-react';

export function AIConfiguration() {
  const {
    model,
    temperature,
    maxTokens,
    enableVoiceInput,
    enableVoiceOutput,
    voiceType,
    openRouterApiKey,
    openRouterModel,
    setModel,
    setTemperature,
    setMaxTokens,
    setEnableVoiceInput,
    setEnableVoiceOutput,
    setVoiceType,
    setOpenRouterApiKey,
    setOpenRouterModel,
  } = useAIConfigStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiKeyMessage, setApiKeyMessage] = useState('');

  // Function to validate the OpenRouter API key format
  const validateApiKeyFormat = (key: string): boolean => {
    // OpenRouter API keys typically start with "sk-or-"
    return key.startsWith('sk-or-');
  };

  // Function to test the OpenRouter API key
  const testApiKey = async () => {
    if (!openRouterApiKey) {
      setApiKeyStatus('error');
      setApiKeyMessage('Please enter an API key first');
      return;
    }

    // Validate the API key format
    if (!validateApiKeyFormat(openRouterApiKey)) {
      setApiKeyStatus('error');
      setApiKeyMessage('Invalid API key format. OpenRouter API keys should start with "sk-or-"');
      return;
    }

    try {
      setIsTestingApiKey(true);
      setApiKeyStatus('idle');
      setApiKeyMessage('Validating API key...');

      const response = await fetch('/api/test-openrouter-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: openRouterApiKey }),
      });

      const data = await response.json();

      if (data.success) {
        setApiKeyStatus('success');
        setApiKeyMessage('API key is valid and has been saved');
      } else {
        setApiKeyStatus('error');
        setApiKeyMessage(data.error || 'Failed to validate API key');

        // Clear the API key if it's invalid
        if (data.error && data.error.includes('Invalid API key')) {
          // Don't clear the key, but show the error
          console.error('Invalid API key detected:', data.error);
        }
      }
    } catch (error) {
      setApiKeyStatus('error');
      setApiKeyMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model</CardTitle>
          <CardDescription>
            Select which AI model to use for the assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={model}
            onValueChange={(value) => setModel(value as any)}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="gpt-3.5-turbo"
                id="model-gpt35"
                className="peer sr-only"
              />
              <Label
                htmlFor="model-gpt35"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Zap className="mb-3 h-6 w-6" />
                GPT-3.5 Turbo
                <span className="mt-1 text-xs text-muted-foreground">Faster, more economical</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="gpt-4"
                id="model-gpt4"
                className="peer sr-only"
              />
              <Label
                htmlFor="model-gpt4"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Brain className="mb-3 h-6 w-6" />
                GPT-4
                <span className="mt-1 text-xs text-muted-foreground">More capable, advanced reasoning</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="claude-3-sonnet"
                id="model-claude-sonnet"
                className="peer sr-only"
              />
              <Label
                htmlFor="model-claude-sonnet"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Sparkles className="mb-3 h-6 w-6" />
                Claude 3 Sonnet
                <span className="mt-1 text-xs text-muted-foreground">Balanced performance</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="claude-3-opus"
                id="model-claude-opus"
                className="peer sr-only"
              />
              <Label
                htmlFor="model-claude-opus"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Sparkles className="mb-3 h-6 w-6" />
                Claude 3 Opus
                <span className="mt-1 text-xs text-muted-foreground">Most powerful Claude model</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Parameters</CardTitle>
          <CardDescription>
            Adjust how the AI model generates responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="temperature">Temperature: {temperature.toFixed(1)}</Label>
              <span className="text-sm text-muted-foreground">
                {temperature < 0.3 ? 'More focused' : temperature > 0.7 ? 'More creative' : 'Balanced'}
              </span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower values produce more focused, deterministic responses. Higher values produce more creative, varied responses.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
              <span className="text-sm text-muted-foreground">
                {maxTokens < 1000 ? 'Shorter' : maxTokens > 3000 ? 'Longer' : 'Medium'}
              </span>
            </div>
            <Slider
              id="max-tokens"
              min={256}
              max={4096}
              step={256}
              value={[maxTokens]}
              onValueChange={(value) => setMaxTokens(value[0])}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls the maximum length of the AI's response. Higher values allow for longer responses.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openrouter-api-key" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>OpenRouter API Key</span>
              </Label>
              <div className="flex space-x-2">
                <div className="relative flex-grow">
                  <Input
                    id="openrouter-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={openRouterApiKey}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setOpenRouterApiKey(newValue);

                      // Provide real-time validation feedback
                      if (newValue) {
                        if (!validateApiKeyFormat(newValue)) {
                          setApiKeyStatus('error');
                          setApiKeyMessage('Invalid API key format. OpenRouter API keys should start with "sk-or-"');
                        } else {
                          setApiKeyStatus('idle');
                          setApiKeyMessage('');
                        }
                      } else {
                        setApiKeyStatus('idle');
                        setApiKeyMessage('');
                      }
                    }}
                    placeholder="sk-or-..."
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
                <Button
                  onClick={testApiKey}
                  disabled={isTestingApiKey || !openRouterApiKey || !validateApiKeyFormat(openRouterApiKey)}
                  variant="outline"
                  size="sm"
                >
                  {isTestingApiKey ? "Testing..." : "Test Key"}
                </Button>
              </div>

              {apiKeyStatus === 'success' && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {apiKeyMessage}
                </p>
              )}

              {apiKeyStatus === 'error' && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {apiKeyMessage}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="openrouter-model" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>OpenRouter Model</span>
              </Label>
              <Input
                id="openrouter-model"
                type="text"
                value={openRouterModel}
                onChange={(e) => setOpenRouterModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && openRouterModel) {
                    e.currentTarget.blur(); // Trigger the onBlur event
                  }
                }}
                onBlur={() => {
                  // Show a brief confirmation message when the model is updated
                  if (openRouterModel) {
                    setApiKeyStatus('success');
                    setApiKeyMessage('Model saved');
                    setTimeout(() => {
                      if (apiKeyStatus === 'success' && apiKeyMessage === 'Model saved') {
                        setApiKeyStatus('idle');
                        setApiKeyMessage('');
                      }
                    }, 2000);
                  }
                }}
                placeholder="anthropic/claude-3-haiku"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Features</CardTitle>
          <CardDescription>
            Configure voice input and output options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="voice-input" className="flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>Voice Input</span>
            </Label>
            <Switch
              id="voice-input"
              checked={enableVoiceInput}
              onCheckedChange={setEnableVoiceInput}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="voice-output" className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4" />
              <span>Voice Output</span>
            </Label>
            <Switch
              id="voice-output"
              checked={enableVoiceOutput}
              onCheckedChange={setEnableVoiceOutput}
            />
          </div>

          {enableVoiceOutput && (
            <div className="pt-4">
              <Label className="mb-2 block">Voice Type</Label>
              <RadioGroup
                value={voiceType}
                onValueChange={(value) => setVoiceType(value as any)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alloy" id="voice-alloy" />
                  <Label htmlFor="voice-alloy">Alloy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="echo" id="voice-echo" />
                  <Label htmlFor="voice-echo">Echo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fable" id="voice-fable" />
                  <Label htmlFor="voice-fable">Fable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="onyx" id="voice-onyx" />
                  <Label htmlFor="voice-onyx">Onyx</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nova" id="voice-nova" />
                  <Label htmlFor="voice-nova">Nova</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shimmer" id="voice-shimmer" />
                  <Label htmlFor="voice-shimmer">Shimmer</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}