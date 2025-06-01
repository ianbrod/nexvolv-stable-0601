/**
 * Utility for chunking audio files into smaller pieces
 */

/**
 * Split an audio blob into smaller chunks
 * 
 * @param audioBlob The audio blob to split
 * @param maxChunkSize The maximum size of each chunk in bytes (default: 1MB)
 * @returns An array of smaller audio blobs
 */
export async function splitAudioIntoChunks(audioBlob: Blob, maxChunkSize: number = 1024 * 1024): Promise<Blob[]> {
  // If the blob is already small enough, return it as is
  if (audioBlob.size <= maxChunkSize) {
    return [audioBlob];
  }

  // Calculate the number of chunks needed
  const numChunks = Math.ceil(audioBlob.size / maxChunkSize);
  const chunks: Blob[] = [];

  // Split the blob into chunks
  for (let i = 0; i < numChunks; i++) {
    const start = i * maxChunkSize;
    const end = Math.min(start + maxChunkSize, audioBlob.size);
    chunks.push(audioBlob.slice(start, end));
  }

  return chunks;
}

/**
 * Convert a data URL to a Blob
 * 
 * @param dataURL The data URL to convert
 * @returns A Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Convert a Blob to a data URL
 * 
 * @param blob The Blob to convert
 * @returns A Promise that resolves to a data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
