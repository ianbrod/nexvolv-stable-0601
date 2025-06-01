# Local Whisper Transcription

This module provides a local implementation of OpenAI's Whisper model for voice-to-text transcription in the Captain's Log feature. It uses the `base.en` 140 MB model to perform transcription locally, eliminating the need for API calls.

## Benefits

- **No API Costs**: Eliminates the need for OpenAI API credits
- **Privacy**: Audio is processed entirely on the user's device
- **Offline Capability**: Works without internet connectivity
- **Reduced Latency**: No network delays for transcription
- **Consistent Performance**: Not affected by API rate limits or service outages

## Setup

Before using the local Whisper model, you need to install the required dependencies:

### Windows

```bash
# Run the installation script
scripts\install-whisper.bat
```

### macOS/Linux

```bash
# Make the script executable
chmod +x scripts/install-whisper.sh

# Run the installation script
./scripts/install-whisper.sh
```

## Architecture

The local Whisper implementation consists of the following components:

1. **WhisperService** (`whisper-service.ts`): Core service that handles model downloading and transcription
2. **Transcription Abstraction Layer** (`transcription-abstraction.ts`): Provides a unified interface for both local and API transcription
3. **Installation Scripts**: Helper scripts to install Python dependencies

## Performance Optimization Roadmap

### Current Implementation (Python-based)
- **Performance**: ~1-3x realtime on CPU
- **Startup**: 2-5 seconds per transcription (Python process + model loading)
- **Memory**: ~400MB per process
- **Reliability**: Process spawning can fail, timeout issues

### Proposed whisper.cpp Integration
- **Performance**: 3-10x faster (native C++)
- **Startup**: <100ms (persistent model loading)
- **Memory**: ~140MB shared model
- **Reliability**: Native addon, no process spawning

### Migration Strategy
1. **Phase 1**: Add whisper.cpp as optional backend
2. **Phase 2**: Implement model persistence and caching
3. **Phase 3**: Add GPU acceleration support
4. **Phase 4**: Deprecate Python backend

## Usage

The transcription abstraction layer automatically handles the choice between local and API transcription. By default, it uses the local model and falls back to the API if needed.

```typescript
import { transcribeAudio } from '@/lib/whisper/transcription-abstraction';

// Transcribe audio with progress reporting
const result = await transcribeAudio(audioBlob, {
  onProgress: (progress) => console.log(`Progress: ${progress}%`),
  onStageChange: (stage) => console.log(`Stage: ${stage}`),
  generateSummary: true
});

if (result.success) {
  const { transcription, summary, segments, srtData } = result.data;
  // Use the transcription data
} else {
  console.error('Transcription failed:', result.error);
}
```

## Configuration

You can configure the transcription service using the `setTranscriptionConfig` function:

```typescript
import { setTranscriptionConfig } from '@/lib/whisper/transcription-abstraction';

// Configure to use local model
setTranscriptionConfig({
  useLocalModel: true,
  modelName: 'base.en',
  language: 'en',
  temperature: 0
});

// Configure to use API with fallback
setTranscriptionConfig({
  useLocalModel: true,
  apiKey: 'your-openai-api-key', // Will be used as fallback if local fails
  language: 'en'
});
```

## Troubleshooting

If you encounter issues with the local Whisper model:

1. **Python Not Found**: Ensure Python 3.8+ is installed and in your PATH
2. **FFmpeg Missing**: Install FFmpeg manually following the instructions in the console
3. **Model Download Fails**: Check your internet connection and try again
4. **Out of Memory**: The base.en model requires about 1GB of RAM
5. **Slow Transcription**: CPU-only transcription can be slow; consider using a machine with a GPU

## Credits

This implementation uses OpenAI's official Whisper Python package. For more information, visit the [Whisper GitHub repository](https://github.com/openai/whisper).
