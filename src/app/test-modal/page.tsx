'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function TestModalPage() {
  const [isOuterModalOpen, setIsOuterModalOpen] = useState(false);
  const [isInnerModalOpen, setIsInnerModalOpen] = useState(false);
  
  // Add debug logging
  console.log('TestModalPage render', { isOuterModalOpen, isInnerModalOpen });

  return (
    <div className="p-10">
      <h1 className="text-2xl mb-4">Modal Test Page</h1>
      
      <Button onClick={() => {
        console.log('Opening outer modal');
        setIsOuterModalOpen(true);
      }}>
        Open Outer Modal
      </Button>
      
      <Dialog 
        open={isOuterModalOpen} 
        onOpenChange={(open) => {
          console.log('Outer modal onOpenChange:', open);
          setIsOuterModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[525px]">
          <DialogTitle>Outer Modal</DialogTitle>
          <div className="py-4">
            <p>This is the outer modal content</p>
            <Button 
              onClick={(e) => {
                console.log('Opening inner modal');
                e.stopPropagation();
                setIsInnerModalOpen(true);
              }}
              className="mt-4"
            >
              Open Inner Modal
            </Button>
          </div>
          
          <Dialog 
            open={isInnerModalOpen} 
            onOpenChange={(open) => {
              console.log('Inner modal onOpenChange:', open);
              setIsInnerModalOpen(open);
            }}
          >
            <DialogContent className="sm:max-w-[400px]">
              <DialogTitle>Inner Modal</DialogTitle>
              <div className="py-4">
                <p>This is the inner modal content</p>
                <Button 
                  onClick={() => {
                    console.log('Closing inner modal');
                    setIsInnerModalOpen(false);
                  }}
                  className="mt-4"
                >
                  Close Inner Modal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </div>
  );
}
