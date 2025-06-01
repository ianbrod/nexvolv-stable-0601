/**
 * Utility functions for exporting data to files
 */

/**
 * Export text content to a file and trigger download
 */
export function exportTextToFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  try {
    // Create a blob with the content
    const blob = new Blob([content], { type: mimeType });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    // Append to the document, click, and remove
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error exporting file:', error);
    throw error;
  }
}

/**
 * Export transcription data to a text file
 */
export function exportTranscription(transcription: string, title: string): void {
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${sanitizedTitle}_transcription.txt`;
  exportTextToFile(transcription, filename);
}

/**
 * Export SRT data to a file
 */
export function exportSRT(srtData: string, title: string): void {
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${sanitizedTitle}.srt`;
  exportTextToFile(srtData, filename, 'text/srt');
}

/**
 * Create a data URL from a blob
 */
export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a data URL to a blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Export audio file from URL
 */
export async function exportAudioFile(audioUrl: string, title: string): Promise<void> {
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const blob = await response.blob();

    // Determine file extension from blob type or URL
    let extension = 'webm'; // default
    if (blob.type.includes('wav')) {
      extension = 'wav';
    } else if (blob.type.includes('mp3') || blob.type.includes('mpeg')) {
      extension = 'mp3';
    } else if (blob.type.includes('aac')) {
      extension = 'aac';
    } else if (blob.type.includes('ogg')) {
      extension = 'ogg';
    } else if (audioUrl.includes('.')) {
      // Try to extract from URL
      const urlExtension = audioUrl.split('.').pop()?.toLowerCase();
      if (urlExtension && ['wav', 'mp3', 'aac', 'ogg', 'webm'].includes(urlExtension)) {
        extension = urlExtension;
      }
    }

    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedTitle}_audio.${extension}`;

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error exporting audio file:', error);
    throw error;
  }
}

/**
 * Export complete package as ZIP file
 */
export async function exportCompletePackage(entry: any): Promise<void> {
  try {
    // Dynamic import of JSZip to avoid bundle size issues
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const sanitizedTitle = entry.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Add transcription if available
    if (entry.transcription) {
      zip.file(`${sanitizedTitle}_transcription.txt`, entry.transcription);
    }

    // Add SRT file if available
    if (entry.srtData) {
      zip.file(`${sanitizedTitle}.srt`, entry.srtData);
    }

    // Add summary if available
    if (entry.summary) {
      // Strip HTML tags for plain text summary
      const plainTextSummary = entry.summary.replace(/<[^>]*>/g, '');
      zip.file(`${sanitizedTitle}_summary.txt`, plainTextSummary);
    }

    // Add notes if available
    if (entry.notes) {
      zip.file(`${sanitizedTitle}_notes.txt`, entry.notes);
    }

    // Add metadata file
    const metadata = {
      title: entry.title,
      duration: entry.duration,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      isFavorite: entry.isFavorite,
      tags: entry.tags || [],
      folderId: entry.folderId,
      folderType: entry.folderType,
    };
    zip.file(`${sanitizedTitle}_metadata.json`, JSON.stringify(metadata, null, 2));

    // Add audio file if available
    if (entry.audioUrl) {
      try {
        const response = await fetch(entry.audioUrl);
        if (response.ok) {
          const audioBlob = await response.blob();

          // Determine audio file extension
          let extension = 'webm';
          if (audioBlob.type.includes('wav')) {
            extension = 'wav';
          } else if (audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg')) {
            extension = 'mp3';
          } else if (audioBlob.type.includes('aac')) {
            extension = 'aac';
          } else if (audioBlob.type.includes('ogg')) {
            extension = 'ogg';
          }

          zip.file(`${sanitizedTitle}_audio.${extension}`, audioBlob);
        }
      } catch (audioError) {
        console.warn('Could not include audio file in package:', audioError);
        // Continue without audio file
      }
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Create download link
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedTitle}_complete_package.zip`;

    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error exporting complete package:', error);
    throw error;
  }
}
