/**
 * Utility functions for handling transcription and audio synchronization
 */

/**
 * Find the active segment using binary search for efficiency
 */
export function findActiveSegmentBinarySearch(
  segments: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>,
  currentTime: number
): number {
  // Handle edge cases
  if (!segments || segments.length === 0 || isNaN(currentTime) || currentTime < 0) {
    return -1;
  }

  let left = 0;
  let right = segments.length - 1;

  // Binary search for exact match
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const segment = segments[mid];

    // Skip invalid segments
    if (typeof segment.startTime !== 'number' || isNaN(segment.startTime) ||
        typeof segment.endTime !== 'number' || isNaN(segment.endTime)) {
      // Instead of returning -1 immediately, we'll continue the search
      // by moving to the next segment in the appropriate direction
      if (currentTime < segment.startTime || isNaN(segment.startTime)) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
      continue;
    }

    // Check if current time is within this segment
    if (currentTime >= segment.startTime && currentTime <= segment.endTime) {
      return mid;
    }

    if (currentTime < segment.startTime) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // If we didn't find an exact match, find the closest segment
  // This handles gaps between segments
  let closestSegment = -1;
  let minDistance = Number.MAX_VALUE;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Skip invalid segments
    if (typeof segment.startTime !== 'number' || isNaN(segment.startTime) ||
        typeof segment.endTime !== 'number' || isNaN(segment.endTime)) {
      continue;
    }

    // Calculate multiple distances to find the best match
    const distanceToStart = Math.abs(currentTime - segment.startTime);
    const distanceToEnd = Math.abs(currentTime - segment.endTime);
    const distanceToMidpoint = Math.abs(currentTime - ((segment.startTime + segment.endTime) / 2));

    // Use the minimum of these distances, with a bias toward the midpoint
    const distance = Math.min(distanceToStart * 1.2, distanceToEnd * 1.2, distanceToMidpoint);

    if (distance < minDistance) {
      minDistance = distance;
      closestSegment = i;
    }
  }

  return closestSegment;
}

/**
 * Split a transcription into segments with accurate timestamps
 */
export function splitTranscriptionIntoSegmentsImproved(
  transcription: string,
  duration: number
): Array<{
  text: string;
  startTime: number;
  endTime: number;
}> {
  if (!transcription || !duration || isNaN(duration) || duration <= 0) {
    return [];
  }

  // First try to split by sentences
  const sentenceRegex = /([.!?]+\s+)/g;
  let parts = transcription.split(sentenceRegex);

  // Recombine the split parts to include the punctuation
  let segments: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i] + (parts[i + 1] || '');
    if (sentence.trim().length > 0) {
      segments.push(sentence.trim());
    }
  }

  // If we don't have enough sentences, try splitting by commas and other natural pauses
  if (segments.length <= 2) {
    const pauseRegex = /([,;:]\s+)/g;
    parts = transcription.split(pauseRegex);

    // Recombine the split parts to include the punctuation
    segments = [];
    for (let i = 0; i < parts.length; i += 2) {
      const segment = parts[i] + (parts[i + 1] || '');
      if (segment.trim().length > 0) {
        segments.push(segment.trim());
      }
    }

    // If still not enough segments, split by word count
    if (segments.length <= 2) {
      const words = transcription.split(/\s+/).filter(w => w.trim().length > 0);
      const segmentSize = Math.max(3, Math.min(5, Math.ceil(words.length / 8))); // Adaptive segment size
      segments = [];

      for (let i = 0; i < words.length; i += segmentSize) {
        segments.push(words.slice(i, i + segmentSize).join(' '));
      }
    }
  }

  // Calculate total characters to distribute time proportionally
  const totalChars = segments.reduce((sum, segment) => sum + segment.length, 0);

  // Add a small buffer between segments
  const buffer = 0.1; // 100ms buffer

  let currentTime = 0;
  return segments.map((segment, index) => {
    // Calculate segment duration based on character proportion
    // This is more accurate than naive approaches
    const segmentDuration = (segment.length / totalChars) * duration;

    const startTime = currentTime;
    const endTime = Math.min(duration, currentTime + segmentDuration - (index < segments.length - 1 ? buffer : 0));

    // Update current time for next segment
    currentTime = endTime + buffer;

    return {
      text: segment,
      startTime,
      endTime
    };
  });
}

/**
 * Group segments into paragraphs for better readability
 * This preserves all original segments and their timestamps for audio sync
 * but visually groups them into paragraphs for display
 */
export function groupSegmentsIntoParagraphs(
  segments: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>
): Array<{
  segments: Array<{
    text: string;
    startTime: number;
    endTime: number;
    index: number;
  }>;
  startTime: number;
  endTime: number;
}> {
  if (!segments || segments.length === 0) {
    return [];
  }

  const paragraphs: Array<{
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      index: number;
    }>;
    startTime: number;
    endTime: number;
  }> = [];

  let currentParagraph: {
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      index: number;
    }>;
    startTime: number;
    endTime: number;
  } = {
    segments: [],
    startTime: 0,
    endTime: 0
  };

  // Process each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentWithIndex = {
      ...segment,
      index: i
    };

    // Start a new paragraph if needed
    if (currentParagraph.segments.length === 0) {
      currentParagraph.segments.push(segmentWithIndex);
      currentParagraph.startTime = segment.startTime;
      currentParagraph.endTime = segment.endTime;
      continue;
    }

    const lastSegment = currentParagraph.segments[currentParagraph.segments.length - 1];

    // Check if we should start a new paragraph
    const shouldStartNewParagraph =
      // If the current segment starts with a capital letter after the previous segment ends with a period
      (segment.text.match(/^[A-Z]/) &&
       lastSegment.text.match(/[.!?]$/)) ||
      // Or if there's a significant pause between segments (more than 1 second)
      (segment.startTime - lastSegment.endTime > 1) ||
      // Or if we've reached a reasonable paragraph size (5-7 sentences)
      currentParagraph.segments.length >= 5;

    if (shouldStartNewParagraph) {
      // Finalize the current paragraph
      paragraphs.push({...currentParagraph});

      // Start a new paragraph with the current segment
      currentParagraph = {
        segments: [segmentWithIndex],
        startTime: segment.startTime,
        endTime: segment.endTime
      };
    } else {
      // Add the segment to the current paragraph
      currentParagraph.segments.push(segmentWithIndex);
      currentParagraph.endTime = segment.endTime;
    }
  }

  // Add the last paragraph if there is one
  if (currentParagraph.segments.length > 0) {
    paragraphs.push(currentParagraph);
  }

  return paragraphs;
}