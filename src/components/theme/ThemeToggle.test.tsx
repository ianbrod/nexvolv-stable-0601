import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore } from '@/stores/themeStore';

// Mock the themeStore
vi.mock('@/stores/themeStore', () => ({
  useThemeStore: vi.fn()
}));

describe('ThemeToggle Component', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render light mode toggle when theme is dark', () => {
    // Mock the theme store to return dark theme
    (useThemeStore as any).mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme
    });

    render(<ThemeToggle />);

    // Check if the light mode text is displayed
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveTextContent('Light Mode');
  });

  it('should render dark mode toggle when theme is light', () => {
    // Mock the theme store to return light theme
    (useThemeStore as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeToggle />);

    // Check if the dark mode text is displayed
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveTextContent('Dark Mode');
  });

  it('should toggle theme when clicked', () => {
    // Mock the theme store to return light theme
    (useThemeStore as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeToggle />);

    // Click the toggle button
    fireEvent.click(screen.getByRole('switch'));

    // Check if setTheme was called with the opposite theme
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
