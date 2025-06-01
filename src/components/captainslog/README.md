# Captain's Log Feature

The Captain's Log feature allows users to record, transcribe, and summarize audio recordings. It provides a convenient way to capture thoughts, ideas, and notes through voice recordings, which are automatically transcribed and summarized using AI.

## Key Features

- **Audio Recording**: Record audio with pause/resume functionality
- **Transcription**: Automatically transcribe recordings using OpenAI's Whisper API
- **Summarization**: Generate summaries of transcriptions using AI
- **Bidirectional Synchronization**: Click on text to jump to that point in the audio, and see text highlighted during playback
- **Re-Transcription**: Re-process existing recordings if transcription or summary fails
- **Editing**: Edit titles and transcriptions after recording
- **Favorites**: Mark recordings as favorites for easy access

## Components

- `CaptainsLogClientWrapper`: Main wrapper component for the Captain's Log feature
- `CaptainsLogRecorder`: Component for recording, transcribing, and saving entries
- `CaptainsLogDetailSimple`: Detailed view for a single log entry
- `SimpleAudioPlayer`: Audio player with progress bar and time display
- `RecordingTimer`: Timer display for recording duration
- `RetranscribeButton`: Button for re-transcribing existing recordings

## API Endpoints

- `/api/transcribe`: Endpoint for transcribing audio recordings
- `/api/retranscribe`: Endpoint for re-transcribing existing recordings

## Usage

```tsx
// Example usage of the Captain's Log feature
import { CaptainsLogClientWrapper } from '@/components/captainslog/CaptainsLogClientWrapper';

export default function CaptainsLogPage() {
  return (
    <div className="container mx-auto py-6">
      <CaptainsLogClientWrapper />
    </div>
  );
}
```

## Technical Details

- Audio is recorded using the MediaRecorder API
- Transcription is performed using OpenAI's Whisper API
- Summaries are generated using OpenRouter API
- Audio and transcription are stored in localStorage
- Bidirectional synchronization is implemented using segment timestamps
