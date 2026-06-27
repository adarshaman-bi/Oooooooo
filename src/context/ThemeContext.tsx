import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  showThemeToast: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [showThemeToast, setShowThemeToast] = useState(false);

  useEffect(() => {
    // Initialize from localStorage on mount
    const saved = localStorage.getItem('biovised-theme') as ThemeMode | null;
    if (saved) {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    // Apply theme class AND data attribute to document root for maximum compatibility
    const root = document.documentElement;
    
    // Clear both classes first
    root.classList.remove('light-theme', 'dark-theme', 'light', 'dark');
    
    if (themeMode === 'light') {
      root.classList.add('light-theme', 'light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark-theme', 'dark');
      root.setAttribute('data-theme', 'dark');
    }
    
    // Persist to localStorage
    localStorage.setItem('biovised-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      const newMode = prev === 'dark' ? 'light' : 'dark';
      // Trigger toast animation
      setShowThemeToast(true);
      setTimeout(() => setShowThemeToast(false), 2000);
      return newMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, toggleTheme, showThemeToast }}>
      {children}
    </ThemeContext.Provider>
  );
};
