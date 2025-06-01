'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const shortcuts = useMemo(() => [
    { keys: ['Ctrl/⌘', '←'], description: 'Previous period' },
    { keys: ['Ctrl/⌘', '→'], description: 'Next period' },
    { keys: ['Ctrl/⌘', 'T'], description: 'Go to today' },
    { keys: ['Ctrl/⌘', 'W'], description: 'Switch to week view' },
    { keys: ['Ctrl/⌘', 'M'], description: 'Switch to month view' },
    { keys: ['Ctrl/⌘', 'Y'], description: 'Switch to year view' },
    { keys: ['Ctrl/⌘', 'N'], description: 'Add new task' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ], []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate the calendar more efficiently.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="text-sm">{shortcut.description}</div>
                <div className="flex items-center space-x-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <React.Fragment key={keyIndex}>
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && <span>+</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(KeyboardShortcutsHelp);
