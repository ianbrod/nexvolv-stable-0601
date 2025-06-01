/**
 * Global recording events for triggering recording modal from anywhere in the app
 */

export const RECORDING_EVENTS = {
  TRIGGER_RECORDING: 'trigger-recording',
  TRIGGER_UPLOAD: 'trigger-upload',
  MINIMIZE_RECORDING: 'minimize-recording',
  MAXIMIZE_RECORDING: 'maximize-recording'
} as const;

export type RecordingEventType = typeof RECORDING_EVENTS[keyof typeof RECORDING_EVENTS];

/**
 * Trigger recording modal from anywhere in the app
 */
export function triggerRecording() {
  const event = new CustomEvent(RECORDING_EVENTS.TRIGGER_RECORDING);
  window.dispatchEvent(event);
}

/**
 * Trigger upload modal from anywhere in the app
 */
export function triggerUpload() {
  const event = new CustomEvent(RECORDING_EVENTS.TRIGGER_UPLOAD);
  window.dispatchEvent(event);
}

/**
 * Minimize recording modal to floating widget
 */
export function minimizeRecording() {
  const event = new CustomEvent(RECORDING_EVENTS.MINIMIZE_RECORDING);
  window.dispatchEvent(event);
}

/**
 * Maximize recording widget back to modal
 */
export function maximizeRecording() {
  const event = new CustomEvent(RECORDING_EVENTS.MAXIMIZE_RECORDING);
  window.dispatchEvent(event);
}

/**
 * Listen for recording events
 */
export function addRecordingEventListener(
  eventType: RecordingEventType,
  handler: () => void
) {
  window.addEventListener(eventType, handler);
  return () => window.removeEventListener(eventType, handler);
}
