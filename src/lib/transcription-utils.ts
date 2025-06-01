/**
 * Utility functions for handling transcription and audio synchronization
 */

/**
 * Split a transcription into segments for time-aligned highlighting
 */
export function splitTranscriptionIntoSegments(transcription: string, duration: number): Array<{
  text: string;
  startTime: number;
  endTime: number;
}> {
  if (!transcription || !duration) {
    return [];
  }

  // First try to split by sentences (periods, exclamation marks, question marks followed by space)
  const sentenceRegex = /([.!?]+\s+)/g;
  let parts = transcription.split(sentenceRegex);

  // Recombine the split parts to include the punctuation
  let sentences = [];
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i] + (parts[i + 1] || '');
    if (sentence.trim().length > 0) {
      sentences.push(sentence.trim());
    }
  }

  // If we don't have enough sentences, try splitting by commas and other natural pauses
  if (sentences.length <= 2) {
    const pauseRegex = /([,;:]\s+)/g;
    parts = transcription.split(pauseRegex);

    // Recombine the split parts to include the punctuation
    let segments = [];
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
      const newSegments = [];

      for (let i = 0; i < words.length; i += segmentSize) {
        newSegments.push(words.slice(i, i + segmentSize).join(' '));
      }

      return assignTimesToSegments(newSegments, duration);
    }

    return assignTimesToSegments(segments, duration);
  }

  return assignTimesToSegments(sentences, duration);
}

/**
 * Assign start and end times to segments based on their relative length
 * with a small overlap between segments for smoother transitions
 */
function assignTimesToSegments(segments: string[], duration: number) {
  // Safety check for invalid duration
  if (!duration || isNaN(duration) || duration <= 0) {
    console.warn('Invalid duration provided to assignTimesToSegments:', duration);
    duration = 60; // Default to 60 seconds if invalid
  }

  // Safety check for empty segments
  if (!segments || segments.length === 0) {
    return [];
  }

  // If only one segment, it spans the entire duration
  if (segments.length === 1) {
    return [{
      text: segments[0],
      startTime: 0,
      endTime: duration
    }];
  }

  // Calculate total length considering word count and character length
  let totalLength = 0;
  try {
    totalLength = segments.reduce((sum, segment) => {
      // Consider both character length and word count for better timing
      const wordCount = segment.split(/\s+/).filter(w => w.trim().length > 0).length || 1;
      return sum + (segment.length + wordCount * 2); // Give extra weight to word count
    }, 0);
  } catch (error) {
    console.error('Error calculating total length:', error);
    totalLength = segments.length * 10; // Fallback value
  }

  // Safety check for zero or invalid totalLength
  if (!totalLength || totalLength <= 0 || isNaN(totalLength) || !isFinite(totalLength)) {
    console.warn('Invalid totalLength, using fallback distribution');
    // Use even distribution as fallback
    const segmentDuration = duration / segments.length;
    return segments.map((segment, index) => ({
      text: segment,
      startTime: index * segmentDuration,
      endTime: (index + 1) * segmentDuration
    }));
  }

  // Distribute time evenly if totalLength is too small
  if (totalLength < 10) {
    const segmentDuration = duration / segments.length;
    return segments.map((segment, index) => ({
      text: segment,
      startTime: index * segmentDuration,
      endTime: (index + 1) * segmentDuration
    }));
  }

  // Normal case - distribute based on segment length
  // Use a more accurate approach with fixed segment boundaries
  try {
    // First, calculate the total duration needed based on segment weights
    let totalDuration = 0;
    const segmentWeights = segments.map(segment => {
      try {
        const wordCount = segment.split(/\s+/).filter(w => w.trim().length > 0).length || 1;
        // Give more weight to longer segments and those with more words
        return segment.length + (wordCount * 3);
      } catch (error) {
        return segment.length || 10; // Fallback weight
      }
    });

    const totalWeight = segmentWeights.reduce((sum, weight) => sum + weight, 0) || segments.length;

    // Calculate segment durations and boundaries
    const segmentInfo = [];
    let currentTime = 0;

    for (let i = 0; i < segments.length; i++) {
      try {
        // Calculate proportional duration
        const proportion = segmentWeights[i] / totalWeight;
        let segmentDuration = proportion * duration;

        // Safety check for invalid segmentDuration
        if (isNaN(segmentDuration) || !isFinite(segmentDuration) || segmentDuration <= 0) {
          segmentDuration = duration / segments.length; // Fallback to even distribution
        }

        // Add a small minimum duration for very short segments
        const minDuration = 0.8; // Minimum duration per segment
        const adjustedDuration = Math.max(minDuration, segmentDuration);

        // Calculate start and end times
        const startTime = currentTime;
        const endTime = Math.min(duration, startTime + adjustedDuration);

        segmentInfo.push({
          text: segments[i],
          startTime,
          endTime
        });

        // Update currentTime for next segment
        currentTime = endTime;
      } catch (error) {
        console.error('Error processing segment:', error);
        // Fallback for individual segment errors
        const segmentDuration = duration / segments.length;
        segmentInfo.push({
          text: segments[i],
          startTime: i * segmentDuration,
          endTime: (i + 1) * segmentDuration
        });
      }
    }

    return segmentInfo;
  } catch (error) {
    console.error('Error in segment mapping:', error);
    // Final fallback - even distribution
    const segmentDuration = duration / segments.length;
    return segments.map((segment, index) => ({
      text: segment,
      startTime: index * segmentDuration,
      endTime: (index + 1) * segmentDuration
    }));
  }
}

/**
 * Find the segment that corresponds to a specific time in the audio
 */
export function findSegmentAtTime(segments: Array<{
  text: string;
  startTime: number;
  endTime: number;
}>, time: number) {
  // Safety check for invalid inputs
  if (!segments || segments.length === 0 || typeof time !== 'number' || isNaN(time) || !isFinite(time)) {
    return -1;
  }

  // Apply an offset to the time to compensate for the delay
  // This helps align the audio playback position with the correct text segment
  // Use a larger offset (3 seconds) to fix the 1-2 block delay
  const offsetTime = time + 3.0; // Add a 3-second offset to compensate for the delay

  // Only log occasionally to reduce console spam
  if (Math.floor(time) % 5 === 0) {
    console.log(`Finding segment at time: ${time}s (adjusted to ${offsetTime}s)`);
  }

  // First check for exact matches (time falls within segment boundaries)
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Ensure segment times are valid
    if (typeof segment.startTime !== 'number' || isNaN(segment.startTime) || !isFinite(segment.startTime) ||
        typeof segment.endTime !== 'number' || isNaN(segment.endTime) || !isFinite(segment.endTime)) {
      continue; // Skip invalid segments
    }

    // Use the offset time for matching
    if (offsetTime >= segment.startTime && offsetTime < segment.endTime) {
      console.log(`Found exact match at segment ${i}: ${segment.startTime}s - ${segment.endTime}s`);
      return i;
    }
  }

  // If no exact match, find the closest segment using a weighted approach
  let bestMatch = -1;
  let minDistance = Number.MAX_VALUE;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Skip invalid segments
    if (typeof segment.startTime !== 'number' || isNaN(segment.startTime) || !isFinite(segment.startTime) ||
        typeof segment.endTime !== 'number' || isNaN(segment.endTime) || !isFinite(segment.endTime)) {
      continue;
    }

    // Calculate distance to segment start and end using the offset time
    const distanceToStart = Math.abs(offsetTime - segment.startTime);
    const distanceToEnd = Math.abs(offsetTime - segment.endTime);
    const distanceToMidpoint = Math.abs(offsetTime - ((segment.startTime + segment.endTime) / 2));

    // Use the minimum of these distances, with a bias toward the midpoint
    const distance = Math.min(distanceToStart * 1.2, distanceToEnd * 1.2, distanceToMidpoint);

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = i;
    }
  }

  // If we still don't have a match, fall back to a simple index-based approach
  if (bestMatch === -1) {
    // Calculate which segment the time would fall into if segments were evenly distributed
    const totalDuration = segments.length > 0 && segments[segments.length - 1].endTime > 0 ?
      segments[segments.length - 1].endTime : 60; // Default to 60 seconds if no valid duration

    const segmentIndex = Math.floor((time / totalDuration) * segments.length);
    return Math.max(0, Math.min(segmentIndex, segments.length - 1));
  }

  return bestMatch;
}

/**
 * Find the segment that corresponds to a click position in the transcription element
 */
export function findSegmentFromClick(
  event: React.MouseEvent<HTMLElement>,
  segments: Array<{ text: string; startTime: number; endTime: number; }>
): number {
  // Get all span elements inside the container
  const spanElements = Array.from(event.currentTarget.querySelectorAll('span'));

  if (segments.length === 0 || spanElements.length === 0) {
    return 0;
  }

  // Calculate which span was clicked
  for (let i = 0; i < spanElements.length; i++) {
    const span = spanElements[i];
    const rect = span.getBoundingClientRect();

    // Check if click is within this span's boundaries with a small buffer
    const buffer = 2; // 2px buffer around the element
    if (
      event.clientX >= rect.left - buffer &&
      event.clientX <= rect.right + buffer &&
      event.clientY >= rect.top - buffer &&
      event.clientY <= rect.bottom + buffer
    ) {
      console.log(`Clicked on segment ${i}:`, segments[i]);
      return i;
    }
  }

  // Improved fallback if no span was directly clicked
  // Find the closest span to the click point
  let closestSpan = 0;
  let minDistance = Number.MAX_VALUE;

  spanElements.forEach((span, index) => {
    if (index >= segments.length) return;

    const rect = span.getBoundingClientRect();
    const spanCenterX = (rect.left + rect.right) / 2;
    const spanCenterY = (rect.top + rect.bottom) / 2;

    // Calculate Euclidean distance from click to span center
    const distance = Math.sqrt(
      Math.pow(event.clientX - spanCenterX, 2) +
      Math.pow(event.clientY - spanCenterY, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestSpan = index;
    }
  });

  return closestSpan;
}

/**
 * Generate SRT format from segments
 *
 * @param segments - Array of segments with text, start and end times
 * @returns SRT formatted string
 */
export function generateSRTFromSegments(segments: Array<{ text: string; start: number; end: number }>): string {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  try {
    const srtParts: string[] = [];

    segments.forEach((segment, index) => {
      // Format the timestamps
      const startTime = formatSRTTimestamp(segment.start);
      const endTime = formatSRTTimestamp(segment.end);

      // Create the SRT entry
      const srtEntry = `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      srtParts.push(srtEntry);
    });

    return srtParts.join('\n');
  } catch (error) {
    console.error('Error generating SRT data:', error);
    return '';
  }
}

/**
 * Format seconds to SRT timestamp format (00:00:00,000)
 *
 * @param seconds - Time in seconds
 * @returns Formatted timestamp string in SRT format
 */
function formatSRTTimestamp(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '00:00:00,000';
  }

  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '00:00:00,000';
  }
}