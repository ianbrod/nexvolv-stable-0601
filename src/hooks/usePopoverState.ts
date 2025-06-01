'use client';

import { useState, useCallback } from 'react';

export function usePopoverState() {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  const onSelect = useCallback((callback?: () => void) => {
    return () => {
      if (callback) callback();
      setOpen(false);
    };
  }, []);

  return {
    open,
    setOpen,
    onOpenChange,
    onSelect,
  };
}
