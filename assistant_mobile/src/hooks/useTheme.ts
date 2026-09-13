import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import React from 'react';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setTheme: (isDark) => set({ isDarkMode: isDark }),
}));

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const { isDarkMode, toggleTheme, setTheme } = useThemeStore();

  // Initialize theme based on system preference
  React.useEffect(() => {
    if (systemColorScheme) {
      setTheme(systemColorScheme === 'dark');
    }
  }, [systemColorScheme]);

  const theme = {
    colors: {
      primary: isDarkMode ? '#BB86FC' : '#6200EE',
      secondary: isDarkMode ? '#03DAC6' : '#03DAC6',
      background: isDarkMode ? '#121212' : '#FFFFFF',
      surface: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      card: isDarkMode ? '#2D2D2D' : '#F5F5F5',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSecondary: isDarkMode ? '#B0B0B0' : '#666666',
      border: isDarkMode ? '#333333' : '#E0E0E0',
      error: isDarkMode ? '#CF6679' : '#B00020',
      success: isDarkMode ? '#4CAF50' : '#4CAF50',
      warning: isDarkMode ? '#FFC107' : '#FFC107',
      info: isDarkMode ? '#2196F3' : '#2196F3',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    typography: {
      h1: {
        fontSize: 32,
        fontWeight: 'bold',
      },
      h2: {
        fontSize: 24,
        fontWeight: 'bold',
      },
      h3: {
        fontSize: 20,
        fontWeight: 'bold',
      },
      body1: {
        fontSize: 16,
      },
      body2: {
        fontSize: 14,
      },
      caption: {
        fontSize: 12,
      },
    },
  };

  return {
    theme,
    isDarkMode,
    toggleTheme,
    setTheme,
  };
}; 