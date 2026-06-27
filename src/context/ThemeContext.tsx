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
    // Apply theme class to document root
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    }
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
