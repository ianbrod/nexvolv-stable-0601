import React from 'react';

/**
 * Custom Target Icon with an arrow
 * Multicolored target board with blue outer ring, red middle ring, white inner ring, and an arrow
 */
export function CustomTargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Blue outer ring */}
      <circle cx="12" cy="12" r="10" stroke="#3b82f6" fill="none" />

      {/* Red middle ring */}
      <circle cx="12" cy="12" r="6" stroke="#ef4444" fill="none" />

      {/* White inner ring (bullseye) */}
      <circle cx="12" cy="12" r="2" stroke="white" fill="none" />

      {/* Arrow */}
      <path d="M19 5L10 12L8 10" stroke="currentColor" fill="none" />
    </svg>
  );
}

/**
 * Custom Bullseye Icon
 * A more traditional bullseye target with multiple colored rings
 */
export function CustomBullseyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Blue outer ring */}
      <circle cx="12" cy="12" r="10" stroke="#3b82f6" fill="none" />

      {/* Orange middle ring */}
      <circle cx="12" cy="12" r="7" stroke="#f97316" fill="none" />

      {/* Red inner ring */}
      <circle cx="12" cy="12" r="4" stroke="#ef4444" fill="none" />

      {/* Bullseye center */}
      <circle cx="12" cy="12" r="1.5" fill="#ef4444" />
    </svg>
  );
}

/**
 * Custom Calendar Icon
 * Calendar with blue, grey, black, and orange accents
 */
export function CustomCalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Calendar outline */}
      <rect width="18" height="18" x="3" y="4" rx="2" stroke="#2563eb" fill="none" />

      {/* Top bar */}
      <path d="M3 10h18" stroke="#64748b" />

      {/* Calendar hangers */}
      <path d="M8 2v4" stroke="#1e293b" />
      <path d="M16 2v4" stroke="#1e293b" />

      {/* Highlighted day */}
      <circle cx="12" cy="15" r="2" fill="#f97316" stroke="none" />
    </svg>
  );
}

/**
 * Custom Notepad Icon with text lines and spiral binding
 * Matches the design system styling and sizing
 */
export function CustomNotepadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="scale-[0.92] dark:scale-[0.92]"
      {...props}
    >
      {/* Spiral binding at top */}
      <path d="M8 2v4" stroke="currentColor" />
      <path d="M12 2v4" stroke="currentColor" />
      <path d="M16 2v4" stroke="currentColor" />

      {/* Notepad body */}
      <rect width="16" height="18" x="4" y="4" rx="2" stroke="currentColor" fill="none" />

      {/* Text lines */}
      <path d="M8 10h6" stroke="currentColor" className="opacity-70" />
      <path d="M8 14h8" stroke="currentColor" className="opacity-70" />
      <path d="M8 18h5" stroke="currentColor" className="opacity-70" />
    </svg>
  );
}

/**
 * Custom Pen Icon with solid fill
 * Smaller in dark mode with transparent border
 * @deprecated - Replaced by CustomNotepadIcon for Captain's Log
 */
export function CustomPenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="scale-[0.92] dark:scale-[0.92] dark:[&>path]:stroke-transparent"
      {...props}
    >
      {/* Pen body with solid fill */}
      <path
        d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke="currentColor"
        fill="currentColor"
      />

      {/* Pen tip */}
      <path
        d="M15 5L19 9"
        stroke="white"
        strokeWidth="1.5"
        className="pen-tip dark:stroke-[#333333]"
      />
    </svg>
  );
}
