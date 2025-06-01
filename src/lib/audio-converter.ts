/**
 * Utility functions for audio conversion
 */

/**
 * Audio quality options for compression
 */
export interface AudioQualityOptions {
  sampleRate: number;
  quality: 'high' | 'medium' | 'low';
  preserveStereo?: boolean;
}

/**
 * Predefined quality presets
 */
export const AUDIO_QUALITY_PRESETS: Record<string, AudioQualityOptions> = {
  high: { sampleRate: 44100, quality: 'high', preserveStereo: true },
  medium: { sampleRate: 22050, quality: 'medium', preserveStereo: false },
  low: { sampleRate: 16000, quality: 'low', preserveStereo: false },
  whisper: { sampleRate: 16000, quality: 'medium', preserveStereo: false } // Optimal for Whisper
};

/**
 * Convert an audio file to a format supported by the Whisper API
 *
 * @param audioFile The audio file to convert
 * @param compress Whether to compress the audio (default: false)
 * @param qualityPreset Quality preset to use when compressing (default: 'whisper')
 * @returns A Promise that resolves to a Blob in a supported format
 */
export async function convertAudioToSupportedFormat(
  audioFile: File,
  compress: boolean = false,
  qualityPreset: keyof typeof AUDIO_QUALITY_PRESETS = 'whisper'
): Promise<Blob> {
  // Create an audio context
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContext();

  // Read the file as an ArrayBuffer
  const arrayBuffer = await audioFile.arrayBuffer();

  try {
    console.log(`Starting audio conversion: ${audioFile.name}, size: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);

    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log(`Audio decoded: ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.duration.toFixed(2)}s`);

    // Get quality settings
    const qualityOptions = AUDIO_QUALITY_PRESETS[qualityPreset];
    console.log(`Using quality preset '${qualityPreset}':`, qualityOptions);

    // Compress the audio if requested using appropriate quality settings
    const processedBuffer = compress
      ? await compressAudio(audioBuffer, qualityOptions.sampleRate, qualityOptions.preserveStereo)
      : audioBuffer;

    console.log(`Audio conversion: ${compress ? 'compressed' : 'uncompressed'}, ` +
                `sample rate: ${processedBuffer.sampleRate}Hz, ` +
                `channels: ${processedBuffer.numberOfChannels}, ` +
                `duration: ${processedBuffer.duration.toFixed(2)}s`);

    // Convert to WAV format
    const wavBlob = await audioBufferToWav(processedBuffer);
    console.log(`WAV conversion complete: ${(wavBlob.size / 1024 / 1024).toFixed(2)}MB`);

    // Return the converted blob
    return new Blob([wavBlob], { type: 'audio/wav' });
  } catch (error) {
    console.error('Error converting audio:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Provide more specific error messages
    if (error.name === 'EncodingError' || error.message.includes('Unable to decode')) {
      throw new Error(`Unsupported audio format: ${audioFile.type}. Please try a different audio file.`);
    } else if (error.message.includes('quota') || error.message.includes('memory')) {
      throw new Error('Audio file is too large to process in browser. Please try a smaller file.');
    } else {
      throw new Error(`Failed to convert audio file: ${error.message}`);
    }
  }
}

/**
 * Convert an AudioBuffer to a WAV file
 *
 * @param audioBuffer The AudioBuffer to convert
 * @returns A Blob containing the WAV file
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChannels * 2;
  const sampleRate = audioBuffer.sampleRate;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Write WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numOfChannels, true); // num of channels
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * numOfChannels * 2, true); // byte rate
  view.setUint16(32, numOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const channels = [];
  for (let i = 0; i < numOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write a string to a DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Compress audio by downsampling, optionally converting to mono, and trimming silence
 *
 * @param audioBuffer The AudioBuffer to compress
 * @param targetSampleRate The target sample rate (default: 16000)
 * @param preserveStereo Whether to preserve stereo channels (default: false)
 * @returns A Promise that resolves to a compressed AudioBuffer
 */
async function compressAudio(
  audioBuffer: AudioBuffer,
  targetSampleRate: number = 16000,
  preserveStereo: boolean = false
): Promise<AudioBuffer> {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

  // Step 1: Trim silence from the beginning and end
  const trimmedBuffer = trimSilence(audioBuffer);

  // Determine output channels: preserve stereo if requested and source is stereo
  const outputChannels = preserveStereo && trimmedBuffer.numberOfChannels > 1 ? 2 : 1;

  // Step 2: Downsample and optionally convert to mono
  const offlineCtx = new OfflineAudioContext(
    outputChannels,
    Math.ceil(trimmedBuffer.duration * targetSampleRate),
    targetSampleRate
  );

  // Create a buffer source
  const source = offlineCtx.createBufferSource();
  source.buffer = trimmedBuffer;

  if (outputChannels === 1 && trimmedBuffer.numberOfChannels > 1) {
    // Convert to mono using a gain node
    const gainNode = offlineCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
  } else {
    // Preserve channels as-is
    source.connect(offlineCtx.destination);
  }

  // Start the source and render
  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  console.log(`Audio compressed: ${trimmedBuffer.sampleRate}Hz → ${targetSampleRate}Hz, ` +
              `${trimmedBuffer.numberOfChannels} → ${outputChannels} channels, ` +
              `${trimmedBuffer.duration.toFixed(2)}s duration`);

  return renderedBuffer;
}

/**
 * Trim silence from the beginning and end of an audio buffer
 *
 * @param audioBuffer The AudioBuffer to trim
 * @param threshold The silence threshold (default: 0.01)
 * @returns A trimmed AudioBuffer
 */
function trimSilence(audioBuffer: AudioBuffer, threshold: number = 0.01): AudioBuffer {
  // Get the audio data
  const channelData = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  // Find the start and end points (non-silent)
  let start = 0;
  let end = audioBuffer.length - 1;

  // Find the first non-silent sample
  for (let i = 0; i < audioBuffer.length; i++) {
    let isSilent = true;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      if (Math.abs(channelData[channel][i]) > threshold) {
        isSilent = false;
        break;
      }
    }
    if (!isSilent) {
      start = Math.max(0, i - 4410); // Add a small buffer (0.1s at 44.1kHz)
      break;
    }
  }

  // Find the last non-silent sample
  for (let i = audioBuffer.length - 1; i >= 0; i--) {
    let isSilent = true;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      if (Math.abs(channelData[channel][i]) > threshold) {
        isSilent = false;
        break;
      }
    }
    if (!isSilent) {
      end = Math.min(audioBuffer.length - 1, i + 4410); // Add a small buffer (0.1s at 44.1kHz)
      break;
    }
  }

  // If the entire buffer is silent, return the original
  if (start >= end) {
    return audioBuffer;
  }

  // Create a new buffer with the trimmed data
  const trimmedLength = end - start + 1;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContext();
  const trimmedBuffer = ctx.createBuffer(
    audioBuffer.numberOfChannels,
    trimmedLength,
    audioBuffer.sampleRate
  );

  // Copy the trimmed data
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const newChannelData = trimmedBuffer.getChannelData(channel);
    const originalChannelData = channelData[channel];
    for (let i = 0; i < trimmedLength; i++) {
      newChannelData[i] = originalChannelData[start + i];
    }
  }

  return trimmedBuffer;
}