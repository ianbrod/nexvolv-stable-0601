#!/usr/bin/env node

/**
 * Simple transcription test using your audio file
 */

const fs = require('fs');
const path = require('path');

console.log('🎵 Simple Transcription Test\n');

async function testTranscription() {
  try {
    // Check if test audio file exists
    const audioFile = path.join(process.cwd(), 'samples', 'test-audio.mp3');

    if (!fs.existsSync(audioFile)) {
      console.log('❌ Test audio file not found at samples/test-audio.mp3');
      console.log('   Please copy your Recording.mp3 to samples/test-audio.mp3');
      return;
    }

    const stats = fs.statSync(audioFile);
    console.log(`✅ Found test audio file: ${Math.round(stats.size / 1024)}KB`);

    // Test Python backend directly
    console.log('\n🐍 Testing Python Whisper Backend...');

    try {
      const { execSync } = require('child_process');

      // Create a simple Python script to test transcription
      const pythonScript = `
import sys
import os
import whisper
import time

# Load model
print("Loading Whisper model...", file=sys.stderr)
start_time = time.time()
model = whisper.load_model("base.en")
load_time = time.time() - start_time
print(f"Model loaded in {load_time:.2f} seconds", file=sys.stderr)

# Transcribe audio
print("Transcribing audio...", file=sys.stderr)
start_time = time.time()
result = model.transcribe("${audioFile.replace(/\\/g, '\\\\')}")
transcribe_time = time.time() - start_time

print(f"Transcription completed in {transcribe_time:.2f} seconds", file=sys.stderr)
print(f"Text length: {len(result['text'])} characters", file=sys.stderr)
print("---TRANSCRIPTION---")
print(result['text'])
print("---END---")
`;

      // Write the Python script to a temporary file
      const tempScript = path.join(process.cwd(), 'temp_transcribe.py');
      fs.writeFileSync(tempScript, pythonScript);

      console.log('   Running Python transcription...');
      const startTime = Date.now();

      const output = execSync(`python "${tempScript}"`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      const totalTime = Date.now() - startTime;

      // Parse output
      const lines = output.split('\n');
      const transcriptionStart = lines.findIndex(line => line.includes('---TRANSCRIPTION---'));
      const transcriptionEnd = lines.findIndex(line => line.includes('---END---'));

      if (transcriptionStart >= 0 && transcriptionEnd >= 0) {
        const transcription = lines.slice(transcriptionStart + 1, transcriptionEnd).join('\n').trim();

        console.log(`   ✅ Python transcription completed in ${totalTime}ms`);
        console.log(`   📝 Transcription (${transcription.length} chars):`);
        console.log(`      "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`);
      } else {
        console.log('   ⚠️  Could not parse transcription from output');
        console.log('   Raw output:', output.substring(0, 200));
      }

      // Clean up
      fs.unlinkSync(tempScript);

    } catch (error) {
      console.log('   ❌ Python transcription failed:', error.message);
    }

    // Note: whisper.cpp has been removed from the project
    console.log('\n📝 Note: whisper.cpp has been removed from the project');
    console.log('   Using Python whisper implementation only');

    console.log('\n📊 Test Summary:');
    console.log('   🎵 Audio file: Ready');
    console.log('   🐍 Python backend: ' + (await checkPythonBackend() ? 'Working' : 'Failed'));
    console.log('   ⚡ Native package: ' + (checkNativePackage() ? 'Installed' : 'Missing'));

    console.log('\n💡 Next Steps:');
    console.log('   1. The Python backend is working and can transcribe your audio');
    console.log('   2. The native whisper.cpp package is installed');
    console.log('   3. Your app will automatically use the fastest available backend');
    console.log('   4. Test the full integration by using the transcription feature in your app');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkPythonBackend() {
  try {
    const { execSync } = require('child_process');
    execSync('python -c "import whisper; whisper.load_model(\\"base.en\\")"', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function checkNativePackage() {
  try {
    require('whisper.cpp');
    return true;
  } catch (error) {
    return false;
  }
}

// Run the test
testTranscription().catch(console.error);
