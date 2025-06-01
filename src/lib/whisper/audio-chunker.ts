import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { createHash } from 'crypto';

const execPromise = promisify(exec);

/**
 * Configuration for audio chunking
 */
export interface ChunkingConfig {
  maxChunkSize?: number; // in bytes
  chunkDuration?: number; // in seconds
  overlapDuration?: number; // in seconds
}

/**
 * Default chunking configuration - optimized for performance
 */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 40 * 1024 * 1024, // 40MB (larger chunks for better performance with big files)
  chunkDuration: 600, // 600 seconds (10 minutes) - larger chunks reduce overhead for big files
  overlapDuration: 2 // 2 second overlap for better continuity
};

/**
 * Medium model chunking configuration - smaller chunks to prevent timeouts
 */
export const MEDIUM_MODEL_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 20 * 1024 * 1024, // 20MB (smaller chunks for medium model)
  chunkDuration: 300, // 300 seconds (5 minutes) - smaller chunks for medium model
  overlapDuration: 2 // 2 second overlap for better continuity
};

/**
 * Split audio into chunks using FFmpeg
 * This is more reliable than browser-based chunking and works in both browser and server environments
 */
export async function splitAudioWithFFmpeg(
  audioBlob: Blob,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Promise<string[]> {
  // Create a temporary file for the input audio
  const audioBuffer = await audioBlob.arrayBuffer();
  const audioHash = createHash('md5').update(Buffer.from(audioBuffer)).digest('hex');
  const inputPath = path.join(os.tmpdir(), `whisper_input_${audioHash}.wav`);
  await fs.promises.writeFile(inputPath, Buffer.from(audioBuffer));

  // Check if ffmpeg is available
  try {
    await execPromise('ffmpeg -version');
  } catch (error) {
    console.error('FFmpeg check failed:', error);
    throw new Error('FFmpeg is not installed or not available in PATH');
  }

  // Get audio duration using ffprobe
  try {
    const { stdout: durationOutput } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );

    const totalDuration = parseFloat(durationOutput.trim());
    const chunkDuration = config.chunkDuration || 30;
    const overlapDuration = config.overlapDuration || 2;

    // If the file is shorter than chunk duration, return it as is
    if (totalDuration <= chunkDuration) {
      console.log('Audio file is shorter than chunk duration, no chunking needed');
      return [inputPath];
    }

    // Calculate number of chunks needed
    const effectiveChunkDuration = chunkDuration - overlapDuration;
    const numChunks = Math.ceil(totalDuration / effectiveChunkDuration);
    console.log(`Splitting ${totalDuration}s audio file into ${numChunks} chunks`);

    // Create chunks using ffmpeg
    const chunkPaths: string[] = [];

    for (let i = 0; i < numChunks; i++) {
      const startTime = Math.max(0, i * effectiveChunkDuration);
      const outputPath = path.join(os.tmpdir(), `whisper_chunk_${audioHash}_${i}.wav`);

      await execPromise(
        `ffmpeg -y -i "${inputPath}" -ss ${startTime} -t ${chunkDuration} -c copy "${outputPath}"`
      );

      chunkPaths.push(outputPath);
    }

    console.log(`Split audio into ${chunkPaths.length} chunks`);
    return chunkPaths;
  } catch (error) {
    console.error('Error during audio chunking:', error);
    // Clean up the input file if an error occurs
    try {
      await fs.promises.unlink(inputPath);
    } catch (cleanupError) {
      console.warn(`Failed to delete temporary file ${inputPath}:`, cleanupError);
    }
    throw error;
  }
}

/**
 * Clean up temporary chunk files
 */
export async function cleanupChunks(chunkPaths: string[]): Promise<void> {
  for (const path of chunkPaths) {
    try {
      await fs.promises.unlink(path);
    } catch (error) {
      console.warn(`Failed to delete temporary file ${path}:`, error);
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use splitAudioWithFFmpeg instead
 */
export async function splitAudioIntoChunks(
  audioBlob: Blob,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Promise<Blob[]> {
  console.warn('splitAudioIntoChunks is deprecated. Use splitAudioWithFFmpeg instead.');

  // Calculate chunk size in bytes (approximate)
  const totalSize = audioBlob.size;
  const chunkSize = config.maxChunkSize || 5 * 1024 * 1024; // Default to 5MB chunks

  // If the file is smaller than the chunk size, return it as is
  if (totalSize <= chunkSize) {
    console.log('Audio file is smaller than chunk size, no chunking needed');
    return [audioBlob];
  }

  // Calculate number of chunks needed
  const numChunks = Math.ceil(totalSize / (chunkSize - ((config.overlapDuration || 2) / (config.chunkDuration || 30)) * chunkSize));
  console.log(`Splitting ${totalSize} byte audio file into approximately ${numChunks} chunks`);

  // Create chunks
  const chunks: Blob[] = [];
  const arrayBuffer = await audioBlob.arrayBuffer();
  const overlap = Math.floor(((config.overlapDuration || 2) / (config.chunkDuration || 30)) * chunkSize);

  let startByte = 0;

  for (let i = 0; i < numChunks; i++) {
    // Calculate end byte for this chunk
    const endByte = Math.min(startByte + chunkSize, totalSize);

    // Create a chunk from the array buffer
    const chunkArrayBuffer = arrayBuffer.slice(startByte, endByte);
    const chunkBlob = new Blob([chunkArrayBuffer], { type: audioBlob.type });
    chunks.push(chunkBlob);

    // Move to the next chunk, accounting for overlap
    startByte = endByte - overlap;

    // If we've reached the end, break
    if (endByte >= totalSize) {
      break;
    }
  }

  console.log(`Split audio into ${chunks.length} chunks`);
  return chunks;
}
