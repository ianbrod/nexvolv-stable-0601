import { describe, it, expect } from 'vitest';
import { calculateViewport, shouldLoadItem, getItemLoadingPriority } from './lazy-loading';

describe('lazy-loading utilities', () => {
  // Mock item height function
  const mockGetItemHeight = (index: number) => {
    return 50; // Fixed height for testing
  };

  describe('calculateViewport', () => {
    it('should calculate correct viewport indices for fixed height items', () => {
      const scrollOffset = 100;
      const scrollDirection = 'forward';
      const containerHeight = 200;
      const itemCount = 100;

      const viewport = calculateViewport(
        scrollOffset,
        scrollDirection,
        containerHeight,
        itemCount,
        mockGetItemHeight,
        5, // overscanCount
        10 // loadingThreshold
      );

      // With scrollOffset 100 and item height 50, visible start index should be 2
      expect(viewport.visibleStartIndex).toBe(2);

      // With container height 200 and item height 50, visible end index should be 6
      expect(viewport.visibleEndIndex).toBe(6);

      // Start index should include overscan and loading threshold for forward direction
      expect(viewport.startIndex).toBeLessThanOrEqual(viewport.visibleStartIndex);

      // End index should include overscan and loading threshold for forward direction
      expect(viewport.endIndex).toBeGreaterThan(viewport.visibleEndIndex + 5);
    });

    it('should adjust overscan based on scroll direction', () => {
      const forwardViewport = calculateViewport(
        100, 'forward', 200, 100, mockGetItemHeight, 5, 10
      );

      const backwardViewport = calculateViewport(
        100, 'backward', 200, 100, mockGetItemHeight, 5, 10
      );

      // Forward direction should have more overscan at the end
      expect(forwardViewport.endIndex - forwardViewport.visibleEndIndex)
        .toBeGreaterThan(backwardViewport.endIndex - backwardViewport.visibleEndIndex);

      // Backward direction should have more overscan at the start
      expect(backwardViewport.visibleStartIndex - backwardViewport.startIndex)
        .toBeGreaterThanOrEqual(forwardViewport.visibleStartIndex - forwardViewport.startIndex);
    });
  });

  describe('shouldLoadItem', () => {
    it('should return true for visible items', () => {
      const viewport = {
        startIndex: 0,
        endIndex: 20,
        visibleStartIndex: 5,
        visibleEndIndex: 10,
        scrollOffset: 100,
        scrollDirection: 'forward' as const,
        containerHeight: 200
      };

      // Item in visible range
      expect(shouldLoadItem(7, viewport)).toBe(true);
    });

    it('should return true for items in overscan range', () => {
      const viewport = {
        startIndex: 0,
        endIndex: 20,
        visibleStartIndex: 5,
        visibleEndIndex: 10,
        scrollOffset: 100,
        scrollDirection: 'forward' as const,
        containerHeight: 200
      };

      // Item in overscan range
      expect(shouldLoadItem(2, viewport)).toBe(true);
      expect(shouldLoadItem(18, viewport)).toBe(true);
    });

    it('should return true for items in prefetch range based on scroll direction', () => {
      const viewport = {
        startIndex: 5,
        endIndex: 20,
        visibleStartIndex: 10,
        visibleEndIndex: 15,
        scrollOffset: 100,
        scrollDirection: 'forward' as const,
        containerHeight: 200
      };

      // Item in prefetch range (forward direction)
      expect(shouldLoadItem(25, viewport, 10)).toBe(true);

      // Item outside prefetch range
      expect(shouldLoadItem(35, viewport, 10)).toBe(false);
    });
  });

  describe('getItemLoadingPriority', () => {
    it('should return priority 1 for visible items', () => {
      const viewport = {
        startIndex: 0,
        endIndex: 20,
        visibleStartIndex: 5,
        visibleEndIndex: 10,
        scrollOffset: 100,
        scrollDirection: 'forward' as const,
        containerHeight: 200
      };

      expect(getItemLoadingPriority(7, viewport)).toBe(1);
    });

    it('should return priority 2 for items in overscan range', () => {
      const viewport = {
        startIndex: 0,
        endIndex: 20,
        visibleStartIndex: 5,
        visibleEndIndex: 10,
        scrollOffset: 100,
        scrollDirection: 'forward' as const,
        containerHeight: 200
      };

      expect(getItemLoadingPriority(2, viewport)).toBe(2);
    });

    it('should return priority 3 for items outside viewport and overscan', () => {
      const viewport = {
        startIndex: 5,
        endIndex: 20,
        visibleStartIndex: 10,
        visibleEndIndex: 15,
        scrollOffset: 100,
        scrollDirection: 'forward' as const,
        containerHeight: 200
      };

      expect(getItemLoadingPriority(30, viewport)).toBe(3);
    });
  });
});
