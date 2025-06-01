'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts help when user presses F1 or ? (Shift+/)
      if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Close on Escape key
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            Keyboard Shortcuts
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate the application more efficiently.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <h3 className="text-sm font-medium">Navigation</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-mono bg-muted p-1 rounded">Alt + Left Arrow</div>
            <div>Toggle left navigation panel</div>
            
            <div className="font-mono bg-muted p-1 rounded">Alt + Right Arrow</div>
            <div>Toggle AI assistant panel</div>
            
            <div className="font-mono bg-muted p-1 rounded">F1 or ?</div>
            <div>Show this help dialog</div>
            
            <div className="font-mono bg-muted p-1 rounded">Escape</div>
            <div>Close dialogs</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
