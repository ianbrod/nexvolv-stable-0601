import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Create temporary files
    const tempDir = os.tmpdir();
    const inputFilePath = path.join(tempDir, `input-${Date.now()}.${getExtension(audioFile.name)}`);
    const outputFilePath = path.join(tempDir, `output-${Date.now()}.webm`);

    // Write the uploaded file to disk
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFileAsync(inputFilePath, buffer);

    try {
      // Check if ffmpeg is available
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.error('FFmpeg is not installed:', error);
      return NextResponse.json(
        { error: 'FFmpeg is not installed on the server' },
        { status: 500 }
      );
    }

    try {
      // Convert the audio file to webm format
      await execAsync(`ffmpeg -i "${inputFilePath}" -c:a libopus "${outputFilePath}"`);
    } catch (error) {
      console.error('Error converting audio:', error);
      return NextResponse.json(
        { error: 'Failed to convert audio file' },
        { status: 500 }
      );
    }

    // Read the converted file
    const convertedBuffer = await readFileAsync(outputFilePath);

    // Clean up temporary files
    try {
      await unlinkAsync(inputFilePath);
      await unlinkAsync(outputFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }

    // Return the converted audio as a blob
    return new NextResponse(convertedBuffer, {
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Disposition': 'attachment; filename="converted.webm"'
      }
    });
  } catch (error) {
    console.error('Error in convert-audio API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()! : 'unknown';
}
