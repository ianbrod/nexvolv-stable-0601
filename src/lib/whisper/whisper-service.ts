/**
 * Whisper Service for local transcription
 *
 * This service provides a local implementation of the Whisper model for voice-to-text transcription.
 * It uses the base.en 140 MB model to perform transcription locally, eliminating the need for API calls.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { getModelConfig as getWhisperModelConfig, getDefaultModelId, type WhisperModelConfig } from './model-config';

// Promisify fs functions
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);

// Define cache directory - this will contain the nested /whisper/ structure from Python whisper
const CACHE_DIR = path.join(os.homedir(), '.cache', 'nexvolv', 'whisper');

/**
 * Interface for VAD parameters
 */
interface VADParameters {
  threshold?: number;
  min_speech_duration_ms?: number;
  max_speech_duration_s?: number;
  min_silence_duration_ms?: number;
}

/**
 * Interface for transcription options
 */
interface TranscriptionOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
  temperature?: number;
  initialPrompt?: string;
  wordTimestamps?: boolean;
  vad_filter?: boolean;
  vad_parameters?: VADParameters;
}

/**
 * Interface for transcription result
 */
interface TranscriptionResult {
  text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      probability: number;
    }>;
  }>;
  language?: string;
  srtData?: string; // Raw SRT data
}

/**
 * WhisperService class for local transcription
 */
export class WhisperService {
  private static instance: WhisperService;
  private currentModelId: string;
  private modelDownloadStatus: Map<string, boolean> = new Map();
  private modelDownloadingStatus: Map<string, boolean> = new Map();
  private downloadPromises: Map<string, Promise<void>> = new Map();
  private pythonExecutable: string = 'python';

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Default to base.en to preserve current behavior
    this.currentModelId = getDefaultModelId();
    // Initialize with a default value, will be updated by setupPythonEnvironment
    this.pythonExecutable = 'python';
  }

  /**
   * Get the singleton instance of WhisperService
   */
  public static getInstance(): WhisperService {
    if (!WhisperService.instance) {
      WhisperService.instance = new WhisperService();
    }
    return WhisperService.instance;
  }

  /**
   * Set the current model ID
   */
  public setCurrentModel(modelId: string): void {
    const modelConfig = getWhisperModelConfig(modelId);
    if (!modelConfig) {
      console.warn(`Invalid model ID: ${modelId}. Keeping current model: ${this.currentModelId}`);
      return;
    }

    console.log(`Switching Whisper model from ${this.currentModelId} to ${modelId}`);
    this.currentModelId = modelId;
  }

  /**
   * Get the current model ID
   */
  public getCurrentModel(): string {
    return this.currentModelId;
  }

  /**
   * Get the current model configuration
   */
  public getCurrentModelConfig(): WhisperModelConfig | undefined {
    return getWhisperModelConfig(this.currentModelId);
  }

  /**
   * Get the model file path (accounting for Python whisper's nested directory structure)
   */
  private getModelPath(modelId: string): string {
    // Python whisper downloads models to a nested /whisper/ directory
    return path.join(CACHE_DIR, 'whisper', `${modelId}.pt`);
  }

  /**
   * Set up the Python environment with platform-specific detection
   */
  private async setupPythonEnvironment(): Promise<void> {
    try {
      // First, check if we've already detected Python
      if (this.pythonExecutable) {
        return;
      }

      console.log(`Detecting Python environment on ${process.platform}`);

      // Platform-specific detection strategy
      if (process.platform === 'win32') {
        // On Windows, try 'python' first (most common)
        try {
          await this.runCommand('python', ['-V']);
          this.pythonExecutable = 'python';
          console.log('Using python executable on Windows');

          // Check Python version
          await this.checkPythonVersion();
          return;
        } catch (error) {
          console.warn('Python not found on Windows, trying python3...');
        }
      }

      // On Unix or as fallback, try python3
      try {
        await this.runCommand('python3', ['-V']);
        this.pythonExecutable = 'python3';
        console.log('Using python3 executable');

        // Check Python version
        await this.checkPythonVersion();
        return;
      } catch (error) {
        console.warn('Python3 not found, trying python as fallback...');
      }

      // Final fallback to python on any platform
      try {
        await this.runCommand('python', ['-V']);
        this.pythonExecutable = 'python';
        console.log('Using python executable as fallback');

        // Check Python version
        await this.checkPythonVersion();
        return;
      } catch (error) {
        // No Python found
        const errorMessage = 'No Python executable found. Please install Python 3.8 or later.';
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error setting up Python environment:', error);
      throw error;
    }
  }

  /**
   * Check Python version meets requirements
   */
  private async checkPythonVersion(): Promise<void> {
    try {
      const result = await this.runCommand(this.pythonExecutable, [
        '-c',
        'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'
      ]);

      const version = result.trim();
      const [major, minor] = version.split('.').map(Number);

      console.log(`Detected Python version: ${version}`);

      // Check if version meets requirements (3.8+)
      if (major < 3 || (major === 3 && minor < 8)) {
        console.warn(`Python version ${version} is below recommended 3.8+`);
        // Continue anyway, but log warning
      }
    } catch (error) {
      console.error('Error checking Python version:', error);
      // Continue anyway, as basic Python detection succeeded
    }
  }

  /**
   * Check if a specific model is downloaded
   */
  public async isModelAvailable(modelId?: string): Promise<boolean> {
    const targetModelId = modelId || this.currentModelId;

    // Check cache first
    if (this.modelDownloadStatus.get(targetModelId)) {
      return true;
    }

    try {
      const modelPath = this.getModelPath(targetModelId);
      await access(modelPath, fs.constants.F_OK);
      this.modelDownloadStatus.set(targetModelId, true);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Download a specific Whisper model
   */
  public async downloadModel(modelId?: string, onProgress?: (progress: number) => void): Promise<void> {
    const targetModelId = modelId || this.currentModelId;
    const modelConfig = getWhisperModelConfig(targetModelId);

    if (!modelConfig) {
      throw new Error(`Invalid model ID: ${targetModelId}`);
    }

    // Ensure Python environment is set up
    await this.setupPythonEnvironment();

    // If model is already downloaded, return
    if (await this.isModelAvailable(targetModelId)) {
      return;
    }

    // If model is currently downloading, wait for it to complete
    const existingPromise = this.downloadPromises.get(targetModelId);
    if (this.modelDownloadingStatus.get(targetModelId) && existingPromise) {
      return existingPromise;
    }

    // Start downloading the model
    this.modelDownloadingStatus.set(targetModelId, true);
    const downloadPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Create cache directory if it doesn't exist
        await mkdir(CACHE_DIR, { recursive: true });

        console.log(`Downloading Whisper model ${targetModelId} (${modelConfig.fileSizeMB} MB)...`);

        // Use Python to download the model
        const script = `
import os
import torch
import whisper
from tqdm import tqdm

# Set cache directory
os.environ["XDG_CACHE_HOME"] = "${CACHE_DIR.replace(/\\/g, '\\\\')}"

# Download the model
model = whisper.load_model("${targetModelId}")
print(f"Model downloaded to {os.path.join(os.getenv('XDG_CACHE_HOME'), 'whisper', '${targetModelId}.pt')}")
`;

        const tempScriptPath = path.join(os.tmpdir(), `download_whisper_${Date.now()}.py`);
        await writeFile(tempScriptPath, script);

        // Run the Python script to download the model
        await this.runCommand(this.pythonExecutable, [tempScriptPath], (data) => {
          console.log(data);
          if (onProgress && data.includes('%')) {
            const match = data.match(/(\d+)%/);
            if (match) {
              onProgress(parseInt(match[1], 10));
            }
          }
        });

        // Clean up the temporary script
        await unlink(tempScriptPath);

        this.modelDownloadStatus.set(targetModelId, true);
        this.modelDownloadingStatus.set(targetModelId, false);
        resolve();
      } catch (error) {
        this.modelDownloadingStatus.set(targetModelId, false);
        console.error(`Error downloading Whisper model ${targetModelId}:`, error);
        reject(error);
      }
    });

    this.downloadPromises.set(targetModelId, downloadPromise);
    return downloadPromise;
  }

  /**
   * Transcribe audio using the local Whisper model
   */
  public async transcribeAudio(
    audioBlob: Blob,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      // Check if the audio file is large enough to require chunking
      const fileSizeMB = audioBlob.size / (1024 * 1024);
      console.log(`Audio file size: ${fileSizeMB.toFixed(2)} MB`);

      // Smart chunking strategy based on file size and performance analysis
      if (fileSizeMB > 15) {
        // For files >15MB, use parallel chunking for best performance
        // Based on testing: 20MB file with chunking completed successfully, direct processing timed out
        console.log(`Large audio file detected (${fileSizeMB.toFixed(2)}MB). Using parallel chunking strategy for optimal performance.`);
        return this.transcribeWithFFmpegChunking(audioBlob, options, onProgress);
      } else {
        // For smaller files (<15MB), use direct transcription
        console.log(`Processing ${fileSizeMB.toFixed(2)}MB file directly (no chunking) for optimal performance`);
        return this.transcribeAudioDirect(audioBlob, options, onProgress);
      }
    } catch (error) {
      console.error('Error in transcription:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio with FFmpeg chunking for large files - with parallel processing
   */
  public async transcribeWithFFmpegChunking(
    audioBlob: Blob,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      // Ensure Python environment is set up
      await this.setupPythonEnvironment();

      // Split audio into chunks using FFmpeg with model-appropriate configuration
      const { splitAudioWithFFmpeg, cleanupChunks, DEFAULT_CHUNKING_CONFIG, MEDIUM_MODEL_CHUNKING_CONFIG } = await import('./audio-chunker');

      // Use smaller chunks for medium model to prevent timeouts
      const isMediumModel = this.currentModelId.includes('medium');
      const chunkingConfig = isMediumModel ? MEDIUM_MODEL_CHUNKING_CONFIG : DEFAULT_CHUNKING_CONFIG;

      console.log(`Using ${isMediumModel ? 'medium model' : 'base model'} chunking configuration: ${chunkingConfig.chunkDuration}s chunks`);
      const chunkPaths = await splitAudioWithFFmpeg(audioBlob, chunkingConfig);

      console.log(`Processing ${chunkPaths.length} chunks in parallel for better performance`);

      try {
        console.log(`Processing ${chunkPaths.length} audio chunks`);

        // For medium model, try parallel first but fall back to sequential if it fails
        const isMediumModel = this.currentModelId.includes('medium');
        let results: TranscriptionResult[];

        try {
          // Process chunks in parallel for much better performance
          results = await this.processChunksInParallel(chunkPaths, options, onProgress);
        } catch (parallelError) {
          if (isMediumModel) {
            console.warn('Parallel processing failed for medium model, falling back to sequential processing:', parallelError);
            results = await this.processChunksIndividually(chunkPaths, options, onProgress);
          } else {
            throw parallelError;
          }
        }

        // Merge results from all chunks
        const mergedResult = this.mergeTranscriptionResults(results);

        return mergedResult;
      } finally {
        // Clean up temporary files even if an error occurs
        await cleanupChunks(chunkPaths);
      }
    } catch (error) {
      console.error('Error in FFmpeg chunked transcription:', error);
      throw error;
    }
  }

  /**
   * Process audio chunks in parallel for maximum performance
   */
  private async processChunksInParallel(
    chunkPaths: string[],
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult[]> {
    // Reduce concurrency for medium model to prevent resource exhaustion
    const isMediumModel = this.currentModelId.includes('medium');
    const maxConcurrency = isMediumModel ?
      Math.min(2, chunkPaths.length) : // Medium: max 2 parallel processes
      Math.min(4, chunkPaths.length);  // Base: max 4 parallel processes

    console.log(`Processing ${chunkPaths.length} chunks with ${maxConcurrency} parallel workers (${isMediumModel ? 'medium model - reduced concurrency' : 'base model'})`);

    // Track progress across all chunks
    const completedChunks = new Set<number>();
    const updateProgress = () => {
      if (onProgress) {
        const progress = (completedChunks.size / chunkPaths.length) * 100;
        onProgress(progress);
      }
    };

    // Create worker function for processing individual chunks
    const processChunk = async (chunkPath: string, index: number): Promise<TranscriptionResult> => {
      try {
        console.log(`Starting parallel processing of chunk ${index + 1}/${chunkPaths.length}: ${chunkPath}`);
        const result = await this.transcribeAudioFile(chunkPath, options);
        completedChunks.add(index);
        updateProgress();
        console.log(`Completed chunk ${index + 1}/${chunkPaths.length}`);
        return result;
      } catch (error) {
        console.error(`Error processing chunk ${index + 1}:`, error);
        completedChunks.add(index);
        updateProgress();
        return { text: '', segments: [] }; // Return empty result for failed chunks
      }
    };

    // Process chunks in parallel with limited concurrency
    const results: TranscriptionResult[] = [];
    for (let i = 0; i < chunkPaths.length; i += maxConcurrency) {
      const batch = chunkPaths.slice(i, i + maxConcurrency);
      const batchPromises = batch.map((chunkPath, batchIndex) =>
        processChunk(chunkPath, i + batchIndex)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to prevent overwhelming the system
      if (i + maxConcurrency < chunkPaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Process audio chunks individually (one by one)
   */
  private async processChunksIndividually(
    chunkPaths: string[],
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult[]> {
    const results: TranscriptionResult[] = [];
    let overallProgress = 0;

    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i];
      console.log(`Processing chunk ${i + 1}/${chunkPaths.length}: ${chunkPath}`);

      // Create a progress handler for this chunk
      const chunkProgressHandler = (chunkProgress: number) => {
        if (onProgress) {
          // Calculate overall progress across all chunks
          const chunkContribution = chunkProgress / chunkPaths.length;
          const newOverallProgress = (i / chunkPaths.length) * 100 + chunkContribution;

          // Only update if progress has increased significantly
          if (newOverallProgress > overallProgress + 1) {
            overallProgress = newOverallProgress;
            onProgress(overallProgress);
          }
        }
      };

      try {
        // Process this chunk
        const chunkResult = await this.transcribeAudioFile(
          chunkPath,
          options,
          chunkProgressHandler
        );

        results.push(chunkResult);

        // Force garbage collection between chunks
        global.gc?.();
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}/${chunkPaths.length}:`, error);
        // Continue with next chunk despite errors
        results.push({ text: '', segments: [] });
      }

      // Add a small delay between chunks to allow for memory cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Process audio chunks in batches using a single Python process
   */
  private async processChunksInBatches(
    chunkPaths: string[],
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult[]> {
    // Ensure Python environment is set up
    await this.setupPythonEnvironment();

    // Ensure the model is downloaded
    if (!await this.isModelAvailable()) {
      try {
        await this.downloadModel(undefined, onProgress);
      } catch (error) {
        console.error('Error downloading model:', error);
        throw new Error(`Failed to download Whisper model: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Create a batch processing script
    const batchScript = this.generateBatchProcessingScript(options);
    const tempScriptPath = path.join(os.tmpdir(), `batch_whisper_${Date.now()}.py`);
    await writeFile(tempScriptPath, batchScript);
    console.log(`Batch processing script saved to ${tempScriptPath}`);

    try {
      // Create a temporary file with the list of audio files to process
      const fileListPath = path.join(os.tmpdir(), `whisper_file_list_${Date.now()}.txt`);
      await writeFile(fileListPath, chunkPaths.join('\n'));
      console.log(`File list saved to ${fileListPath}`);

      // Run the batch processing script
      let jsonOutput = '';
      let errorOutput = '';
      let currentProgress = 0;

      console.log(`Running batch processing script with executable: ${this.pythonExecutable}`);
      await this.runCommand(this.pythonExecutable, [tempScriptPath, fileListPath], (data) => {
        // Check if this line looks like JSON
        if (data.trim().startsWith('[') && data.includes('"text"')) {
          jsonOutput = data.trim();
        } else if (onProgress && data.includes('Processing file')) {
          // Extract progress information
          const match = data.match(/Processing file (\d+)\/(\d+)/);
          if (match) {
            const current = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            const progress = Math.floor((current / total) * 100);
            if (progress > currentProgress) {
              currentProgress = progress;
              onProgress(progress);
            }
          }
        } else {
          console.log(`Python output: ${data}`);
          errorOutput += data + '\n';
        }
      });

      // Clean up temporary files
      await unlink(tempScriptPath).catch(() => {});
      await unlink(fileListPath).catch(() => {});

      if (!jsonOutput) {
        throw new Error(`No valid JSON output from batch processing. Error output: ${errorOutput}`);
      }

      // Parse the JSON output
      try {
        const batchResults = JSON.parse(jsonOutput) as Array<any>;

        // Convert to TranscriptionResult format
        return batchResults.map(result => ({
          text: result.text || '',
          segments: (result.segments || []).map((segment: any, index: number) => ({
            id: index,
            start: segment.start || 0,
            end: segment.end || 0,
            text: segment.text || '',
            words: segment.words?.map((word: any) => ({
              word: word.word || '',
              start: word.start || 0,
              end: word.end || 0,
              probability: word.probability || 0
            })) || []
          })),
          language: result.language || 'en',
          // Include SRT data if available
          srtData: result.srt || ''
        }));
      } catch (parseError) {
        console.error('Error parsing batch results:', parseError);
        console.error('Raw output:', jsonOutput);
        throw new Error(`Failed to parse batch results: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error('Error in batch processing:', error);

      // Fall back to individual processing
      console.log('Falling back to individual chunk processing');
      return this.processChunksIndividually(chunkPaths, options, onProgress);
    }
  }

  /**
   * Generate a Python script for batch processing multiple audio files
   */
  private generateBatchProcessingScript(options: TranscriptionOptions): string {
    // Get current model configuration
    const baseConfig = this.getModelConfig();

    // Merge with user options, with user options taking precedence
    const mergedOptions = {
      ...baseConfig,
      ...options,
      // Ensure these critical settings are preserved
      model_name: "base",
      compute_type: baseConfig.compute_type
    };

    return `
import os
import sys
import torch
import whisper
import json
import gc
import time

# Set environment variables for better performance
os.environ["OMP_NUM_THREADS"] = "4"  # Use more threads for faster processing
os.environ["MKL_NUM_THREADS"] = "4"  # Use more threads for faster processing

def generate_srt(segments):
    """Generate SRT format from segments"""
    srt_content = ""
    for i, segment in enumerate(segments):
        # Get start and end times in seconds
        start_time = segment.get('start', 0)
        end_time = segment.get('end', 0)

        # Convert to SRT format (HH:MM:SS,mmm)
        start_formatted = format_timestamp(start_time)
        end_formatted = format_timestamp(end_time)

        # Add entry to SRT
        srt_content += f"{i+1}\\n"
        srt_content += f"{start_formatted} --> {end_formatted}\\n"
        srt_content += f"{segment.get('text', '').strip()}\\n\\n"

    return srt_content

def format_timestamp(seconds):
    """Format seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds - int(seconds)) * 1000)

    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{milliseconds:03d}"

# Try to use faster_whisper if available
try:
    from faster_whisper import WhisperModel
    USE_FASTER_WHISPER = True
    print("Using faster_whisper implementation for batch processing", file=sys.stderr)
except ImportError:
    USE_FASTER_WHISPER = False
    print("faster_whisper not available, using standard whisper", file=sys.stderr)

def process_file_faster_whisper(model, file_path, language):
    """Process a single audio file with faster_whisper"""
    try:
        print(f"Transcribing {file_path}", file=sys.stderr)
        start_time = time.time()

        # Transcribe with faster_whisper
        segments, info = model.transcribe(
            file_path,
            language=language,
            beam_size=1,
            vad_filter=True,
            vad_parameters=dict(threshold=0.5)
        )

        # Convert segments to list for JSON serialization
        segments_list = []
        for segment in segments:
            segments_list.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })

        result = {
            "text": " ".join(segment["text"] for segment in segments_list),
            "segments": segments_list,
            "language": info.language
        }

        # Generate SRT content
        srt_content = generate_srt(result.get('segments', []))

        # Add SRT to the result
        result['srt'] = srt_content

        # Generate plain text file content (just the transcription)
        result['txt'] = result.get('text', '')

        end_time = time.time()
        print(f"Transcription completed in {end_time - start_time:.2f} seconds", file=sys.stderr)

        return result
    except Exception as e:
        print(f"Error transcribing {file_path}: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        return {"text": "", "segments": [], "srt": "", "txt": ""}

def process_file_standard_whisper(model, file_path, options):
    """Process a single audio file with standard whisper"""
    try:
        print(f"Transcribing {file_path}", file=sys.stderr)
        start_time = time.time()

        # Transcribe the audio
        result = model.transcribe(file_path, **options)

        # Generate SRT content
        srt_content = generate_srt(result.get('segments', []))

        # Add SRT to the result
        result['srt'] = srt_content

        # Generate plain text file content (just the transcription)
        result['txt'] = result.get('text', '')

        end_time = time.time()
        print(f"Transcription completed in {end_time - start_time:.2f} seconds", file=sys.stderr)

        return result
    except Exception as e:
        print(f"Error transcribing {file_path}: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        return {"text": "", "segments": [], "srt": "", "txt": ""}

# Main processing function
def process_batch(file_list_path):
    try:
        # Force garbage collection before we start
        gc.collect()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None

        # Read the list of files to process
        with open(file_list_path, 'r') as f:
            files = [line.strip() for line in f if line.strip()]

        if not files:
            print("No files to process", file=sys.stderr)
            return []

        print(f"Processing {len(files)} files", file=sys.stderr)

        # Configure torch for better performance
        if torch.cuda.is_available():
            # Use CUDA for faster processing
            torch.set_default_tensor_type(torch.cuda.FloatTensor)
            torch.backends.cudnn.benchmark = True
        else:
            # For CPU, use more threads for better performance
            torch.set_num_threads(4)
            print("Using CPU with 4 threads for faster processing", file=sys.stderr)

        # Load model with performance optimizations
        print("Loading Whisper model...", file=sys.stderr)

        language = "${mergedOptions.language || 'en'}"

        if USE_FASTER_WHISPER:
            # Load faster_whisper model
            model = WhisperModel("base", device="cuda" if torch.cuda.is_available() else "cpu",
                                compute_type="float16" if torch.cuda.is_available() else "int8")

            # Process each file with faster_whisper
            results = []
            for i, file_path in enumerate(files):
                print(f"Processing file {i+1}/{len(files)}: {file_path}", file=sys.stderr)

                # Process this file
                result = process_file_faster_whisper(model, file_path, language)
                results.append(result)
        else:
            # Load standard whisper model
            model = whisper.load_model("base", device="cuda" if torch.cuda.is_available() else "cpu")

            # Set transcription options - optimized for speed
            transcribe_options = {
                "language": language,
                "fp16": torch.cuda.is_available(),  # Use FP16 on GPU for speed
                "temperature": 0,  # Deterministic output
                "beam_size": 1,  # Simpler beam search for speed
                "best_of": 1,  # Don't generate multiple candidates
                "condition_on_previous_text": False,  # Don't condition on previous text for speed
            }

            # Process each file with standard whisper
            results = []
            for i, file_path in enumerate(files):
                print(f"Processing file {i+1}/{len(files)}: {file_path}", file=sys.stderr)

                # Process this file
                result = process_file_standard_whisper(model, file_path, transcribe_options)
                results.append(result)

        # Print results as JSON
        print(json.dumps(results))

        # Final cleanup
        del model
        gc.collect()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None

        return results

    except Exception as e:
        print(f"Error in batch processing: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)

# Entry point
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No file list specified", file=sys.stderr)
        print("Usage: python script.py file_list.txt", file=sys.stderr)
        sys.exit(1)

    file_list_path = sys.argv[1]
    if not os.path.exists(file_list_path):
        print(f"Error: File list not found: {file_list_path}", file=sys.stderr)
        sys.exit(1)

    process_batch(file_list_path)
`;
  }

  /**
   * Transcribe an audio file directly from its path
   */
  private async transcribeAudioFile(
    audioPath: string,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    // Ensure Python environment is set up
    await this.setupPythonEnvironment();

    // Ensure the model is downloaded
    if (!await this.isModelAvailable()) {
      try {
        await this.downloadModel(undefined, onProgress);
      } catch (error) {
        console.error('Error downloading model:', error);
        throw new Error(`Failed to download Whisper model: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let tempScriptPath = '';

    try {
      // Create a Python script for transcription
      const script = this.generatePythonScript(options);

      tempScriptPath = path.join(os.tmpdir(), `transcribe_whisper_${Date.now()}.py`);
      await writeFile(tempScriptPath, script);
      console.log(`Transcription script saved to ${tempScriptPath}`);

      // Run the Python script to transcribe the audio
      let jsonOutput = '';
      let errorOutput = '';

      console.log(`Running Python script with executable: ${this.pythonExecutable}`);
      // Pass the audio file path as a command-line argument
      await this.runCommand(this.pythonExecutable, [tempScriptPath, audioPath], (data) => {
        // Check if this line looks like JSON
        if (data.trim().startsWith('{') && data.includes('"text"')) {
          jsonOutput = data.trim();
        } else if (onProgress && data.includes('%')) {
          const match = data.match(/(\d+)%/);
          if (match) {
            onProgress(parseInt(match[1], 10));
          }
        } else {
          console.log(`Python output: ${data}`);
          errorOutput += data + '\n';
        }
      });

      // Clean up temporary files
      try {
        if (tempScriptPath) await unlink(tempScriptPath).catch(() => {});
      } catch (cleanupError) {
        console.warn('Error cleaning up temporary files:', cleanupError);
        // Continue despite cleanup errors
      }

      if (!jsonOutput) {
        throw new Error(`No valid JSON output from Whisper. Error output: ${errorOutput}`);
      }

      // Parse the JSON output
      try {
        const result = JSON.parse(jsonOutput);

        return {
          text: result.text || '',
          segments: (result.segments || []).map((segment: any, index: number) => ({
            id: index,
            start: segment.start || 0,
            end: segment.end || 0,
            text: segment.text || '',
            words: segment.words?.map((word: any) => ({
              word: word.word || '',
              start: word.start || 0,
              end: word.end || 0,
              probability: word.probability || 0
            })) || []
          })),
          language: result.language || 'en',
          // Include SRT data if available
          srtData: result.srt || ''
        };
      } catch (parseError) {
        console.error('Error parsing JSON output:', parseError);
        console.error('Raw output:', jsonOutput);
        throw new Error(`Failed to parse Whisper output: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error('Error transcribing audio file:', error);

      // Clean up temporary files in case of error
      try {
        if (tempScriptPath) await unlink(tempScriptPath).catch(() => {});
      } catch (cleanupError) {
        console.warn('Error cleaning up temporary files after error:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Legacy chunking method (kept for backward compatibility)
   * @deprecated Use transcribeWithFFmpegChunking instead
   */
  public async transcribeWithChunking(
    audioBlob: Blob,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    console.warn('transcribeWithChunking is deprecated. Use transcribeWithFFmpegChunking instead.');
    return this.transcribeWithFFmpegChunking(audioBlob, options, onProgress);
  }

  /**
   * Merge transcription results from multiple chunks
   */
  private mergeTranscriptionResults(results: TranscriptionResult[]): TranscriptionResult {
    if (results.length === 0) {
      return { text: '', segments: [] };
    }

    if (results.length === 1) {
      return results[0];
    }

    // Merge text and segments
    let mergedText = '';
    const mergedSegments: any[] = [];
    let currentOffset = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      // Add text with space separator
      if (i > 0) mergedText += ' ';
      mergedText += result.text;

      // Adjust segment timestamps and add to merged segments
      const adjustedSegments = result.segments.map(segment => ({
        ...segment,
        start: segment.start + currentOffset,
        end: segment.end + currentOffset,
        // Adjust word timestamps if present
        words: segment.words ? segment.words.map(word => ({
          ...word,
          start: word.start + currentOffset,
          end: word.end + currentOffset
        })) : undefined
      }));

      mergedSegments.push(...adjustedSegments);

      // Update offset for next chunk
      if (result.segments.length > 0) {
        const lastSegment = result.segments[result.segments.length - 1];
        currentOffset += lastSegment.end;
      }
    }

    return {
      text: mergedText,
      segments: mergedSegments,
      language: results[0].language
    };
  }

  /**
   * Direct transcription method (no chunking)
   */
  private async transcribeAudioDirect(
    audioBlob: Blob,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    let audioPath = '';

    try {
      // Create a temporary file for the audio
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioHash = createHash('md5').update(Buffer.from(audioBuffer)).digest('hex');
      audioPath = path.join(os.tmpdir(), `whisper_audio_${audioHash}.wav`);
      await writeFile(audioPath, Buffer.from(audioBuffer));
      console.log(`Audio file saved to ${audioPath}`);

      // Use the transcribeAudioFile method to avoid code duplication
      return await this.transcribeAudioFile(audioPath, options, onProgress);
    } catch (error) {
      console.error('Error in direct transcription:', error);

      // Clean up the audio file
      try {
        if (audioPath) await unlink(audioPath).catch(() => {});
      } catch (cleanupError) {
        console.warn('Error cleaning up audio file:', cleanupError);
      }

      throw error;
    } finally {
      // Make sure to clean up the audio file
      try {
        if (audioPath) await unlink(audioPath).catch(() => {});
      } catch (cleanupError) {
        console.warn('Error cleaning up audio file in finally block:', cleanupError);
      }
    }
  }

  /**
   * Get timeout duration based on current model
   */
  private getTimeoutForModel(): number {
    const isMediumModel = this.currentModelId.includes('medium');
    // Medium model needs much longer timeout due to slower processing
    return isMediumModel ?
      30 * 60 * 1000 : // 30 minutes for medium model
      15 * 60 * 1000;  // 15 minutes for base model
  }

  /**
   * Get optimized configuration for the current model
   */
  private getModelConfig(): Record<string, any> {
    const modelConfig = getWhisperModelConfig(this.currentModelId);
    const isMedium = this.currentModelId.includes('medium');

    // Base configuration that works for all models
    const baseConfig = {
      // Model-specific settings
      model_name: this.currentModelId.replace('.en', ''), // Remove .en suffix for Python whisper
      language: "en",  // Can be overridden by options

      // Performance optimization - prefer faster-whisper
      compute_type: "float16",  // Use FP16 for GPU speed, fallback to int8 on CPU
      use_faster_whisper: true, // Prioritize faster-whisper implementation

      // Optimized transcription settings for speed
      beam_size: 1,             // Single beam for speed
      best_of: 1,               // Don't generate multiple candidates
      temperature: 0,           // Deterministic output
      condition_on_previous_text: false, // Don't condition on previous text for speed

      // Performance settings - model-specific from report
      num_workers: 1,        // Always use 1 worker
      batch_size: modelConfig?.performance.batchSize || 16,

      // VAD settings
      vad_filter: true,      // Voice activity detection to skip silence
      vad_parameters: {
        threshold: 0.5,
        min_speech_duration_ms: 250,
        max_speech_duration_s: 30,
        min_silence_duration_ms: 500
      }
    };

    return baseConfig;
  }

  /**
   * Generate Python script for transcription
   */
  private generatePythonScript(options: TranscriptionOptions): string {
    // Get current model configuration
    const modelConfig = this.getModelConfig();
    const currentModelConfig = getWhisperModelConfig(this.currentModelId);
    const isMedium = this.currentModelId.includes('medium');

    // Merge with user options, with user options taking precedence
    const mergedOptions = {
      ...modelConfig,
      ...options,
      // Ensure these critical settings are preserved
      model_name: modelConfig.model_name,
      compute_type: modelConfig.compute_type
    };

    return `
import os
import sys
import torch
import whisper
import json
import gc
import time

# AGGRESSIVE MEDIUM MODEL: Skipping initial GC for maximum speed
${isMedium ? `
print("AGGRESSIVE MEDIUM MODEL: Skipping initial GC for maximum speed", file=sys.stderr)
` : `
# Base model: Standard initialization
gc.collect()
`}

# Environment optimization - AGGRESSIVE for medium model
${isMedium ? `
# Medium model: Use same threading as base model for maximum speed
os.environ["OMP_NUM_THREADS"] = "4"  # Same as base model
os.environ["MKL_NUM_THREADS"] = "4"  # Same as base model
` : `
# Base model: Preserve exact settings
os.environ["OMP_NUM_THREADS"] = "${currentModelConfig?.performance.threadsRecommended || 4}"
os.environ["MKL_NUM_THREADS"] = "${currentModelConfig?.performance.threadsRecommended || 4}"
`}

def generate_srt(segments):
    """Generate SRT format from segments"""
    srt_content = ""
    for i, segment in enumerate(segments):
        # Get start and end times in seconds
        start_time = segment.get('start', 0)
        end_time = segment.get('end', 0)

        # Convert to SRT format (HH:MM:SS,mmm)
        start_formatted = format_timestamp(start_time)
        end_formatted = format_timestamp(end_time)

        # Add entry to SRT
        srt_content += f"{i+1}\\n"
        srt_content += f"{start_formatted} --> {end_formatted}\\n"
        srt_content += f"{segment.get('text', '').strip()}\\n\\n"

    return srt_content

def format_timestamp(seconds):
    """Format seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds - int(seconds)) * 1000)

    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{milliseconds:03d}"

# Simple error handling wrapper
try:
    # AGGRESSIVE OPTIMIZATION: Minimal GC for speed
    ${isMedium ? `
    # Medium model: SKIP initial GC for speed
    print("AGGRESSIVE MEDIUM MODEL: Skipping initial GC for maximum speed", file=sys.stderr)
    ` : `
    # Base model: Standard garbage collection
    gc.collect()
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    `}

    # Check command line arguments
    if len(sys.argv) < 2:
        print("Error: No audio file specified", file=sys.stderr)
        sys.exit(1)

    # Load audio
    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    # Configure torch for better performance
    if torch.cuda.is_available():
        # Use CUDA for faster processing
        torch.set_default_tensor_type(torch.cuda.FloatTensor)
        torch.backends.cudnn.benchmark = True
    else:
        # For CPU, use same threading as base model for medium model
        ${isMedium ? `
        torch.set_num_threads(4)  # Same as base model for maximum speed
        print("Using CPU with 4 threads for AGGRESSIVE medium model performance", file=sys.stderr)
        ` : `
        torch.set_num_threads(${currentModelConfig?.performance.threadsRecommended || 4})
        print("Using CPU with ${currentModelConfig?.performance.threadsRecommended || 4} threads for optimal performance", file=sys.stderr)
        `}

    # Load model with performance optimizations
    print("Loading Whisper ${this.currentModelId} model...", file=sys.stderr)

    # Use faster_whisper if available (much faster implementation)
    try:
        from faster_whisper import WhisperModel
        print("Using faster_whisper implementation", file=sys.stderr)

        # Load the model with same settings as base model for maximum speed
        ${isMedium ? `
        model = WhisperModel("${mergedOptions.model_name}",
                            device="cuda" if torch.cuda.is_available() else "cpu",
                            compute_type="int8",  # Force int8 for CPU speed optimization
                            cpu_threads=6,  # Conservative: 6 threads
                            num_workers=1)  # Single worker for stability
        ` : `
        model = WhisperModel("${mergedOptions.model_name}",
                            device="cuda" if torch.cuda.is_available() else "cpu",
                            compute_type="float16" if torch.cuda.is_available() else "int8",
                            cpu_threads=${currentModelConfig?.performance.threadsRecommended || 4},
                            num_workers=1)
        `}

        # Transcribe with faster_whisper
        print(f"Transcribing {audio_path}", file=sys.stderr)
        start_time = time.time()

        # Simple transcription for medium model - no VAD to avoid hanging
        ${isMedium ? `
        segments, info = model.transcribe(
            audio_path,
            language="${mergedOptions.language || 'en'}",
            temperature=${mergedOptions.temperature || 0},
            condition_on_previous_text=False,  # Disable for speed
            word_timestamps=True,
            vad_filter=False  # Disable VAD - causing hangs
        )
        ` : `
        segments, info = model.transcribe(
            audio_path,
            language="${mergedOptions.language || 'en'}",
            temperature=${mergedOptions.temperature || 0},
            condition_on_previous_text=${mergedOptions.condition_on_previous_text ? 'True' : 'False'},
            word_timestamps=True,
            vad_filter=${mergedOptions.vad_filter ? 'True' : 'False'}
        )
        `}

        # Convert segments to list for JSON serialization
        segments_list = []
        for segment in segments:
            segments_list.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })

        result = {
            "text": " ".join(segment["text"] for segment in segments_list),
            "segments": segments_list,
            "language": info.language
        }

    except ImportError:
        # Fall back to standard whisper if faster_whisper is not available
        print("faster_whisper not available, using standard whisper", file=sys.stderr)
        model = whisper.load_model("${mergedOptions.model_name}", device="cuda" if torch.cuda.is_available() else "cpu")

        # Detect device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {device}", file=sys.stderr)

        print(f"Transcribing {audio_path}", file=sys.stderr)
        start_time = time.time()

        # Set transcription options - optimized for speed
        transcribe_options = {
            "language": "${mergedOptions.language || 'en'}",
            "fp16": torch.cuda.is_available(),  # Use FP16 on GPU for speed
            "temperature": ${mergedOptions.temperature || 0},  # Deterministic output
            "beam_size": ${mergedOptions.beam_size || 1},  # Simpler beam search for speed
            "best_of": ${mergedOptions.best_of || 1},  # Don't generate multiple candidates
            "condition_on_previous_text": ${mergedOptions.condition_on_previous_text ? 'True' : 'False'},  # Don't condition on previous text for speed
        }

        # Transcribe with standard whisper
        result = model.transcribe(audio_path, **transcribe_options)

    # Measure and report performance
    end_time = time.time()
    duration = end_time - start_time
    print(f"Transcription completed in {duration:.2f} seconds", file=sys.stderr)

    # Generate SRT content
    srt_content = generate_srt(result.get('segments', []))

    # Add SRT to the result
    result['srt'] = srt_content

    # Generate plain text file content (just the transcription)
    result['txt'] = result.get('text', '')

    # Print directly to stdout for simple parsing
    print(json.dumps(result))

    # AGGRESSIVE OPTIMIZATION: Minimal cleanup for speed
    ${isMedium ? `
    # Medium model: MINIMAL cleanup for speed
    del model
    print("AGGRESSIVE MEDIUM MODEL: Minimal cleanup for maximum speed", file=sys.stderr)
    ` : `
    # Base model: Standard cleanup
    del model
    gc.collect()
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    `}

except Exception as e:
    print(f"Error during transcription: {e}", file=sys.stderr)
    import traceback
    print(traceback.format_exc(), file=sys.stderr)
    sys.exit(1)
`;
  }

  /**
   * Run a command and return the output
   */
  private async runCommand(
    command: string,
    args: string[],
    onData?: (data: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Running command: ${command} ${args.join(' ')}`);

      try {
        const process = spawn(command, args);
        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          const dataStr = data.toString();
          output += dataStr;
          if (onData) {
            onData(dataStr);
          }
        });

        process.stderr.on('data', (data) => {
          const dataStr = data.toString();
          errorOutput += dataStr;
          if (onData) {
            onData(dataStr);
          }
        });

        process.on('close', (code) => {
          console.log(`Command exited with code ${code}`);
          if (code === 0) {
            resolve(output);
          } else {
            const errorMessage = `Command failed with code ${code}.\nCommand: ${command} ${args.join(' ')}\nError output: ${errorOutput}\nStandard output: ${output}`;
            console.error(errorMessage);
            reject(new Error(errorMessage));
          }
        });

        process.on('error', (error) => {
          const errorMessage = `Failed to execute command: ${command} ${args.join(' ')}\nError: ${error.message}`;
          console.error(errorMessage);
          reject(new Error(errorMessage));
        });

        // Add a timeout to prevent hanging
        setTimeout(() => {
          try {
            process.kill();
          } catch (e) {
            // Process might already be terminated
          }
          const timeoutMinutes = this.getTimeoutForModel() / (60 * 1000);
          reject(new Error(`Command timed out after ${timeoutMinutes} minutes: ${command} ${args.join(' ')}`));
        }, this.getTimeoutForModel()); // Dynamic timeout based on model
      } catch (error) {
        const errorMessage = `Exception while spawning process: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }
}

// Export a singleton instance
export const whisperService = WhisperService.getInstance();
