import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  danger: string;
  success: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const DarkColors: ThemeColors = {
  background: '#101010',
  surface: '#1E1E1E',
  surfaceLight: 'rgba(255, 255, 255, 0.05)',
  text: '#FFFFFF',
  textSecondary: '#A8A8A8',
  border: 'rgba(255, 255, 255, 0.1)',
  primary: '#E63946',
  danger: '#E63946',
  success: '#43A047',
};

const LightColors: ThemeColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLight: 'rgba(0, 0, 0, 0.03)',
  text: '#121212',
  textSecondary: '#666666',
  border: 'rgba(0, 0, 0, 0.08)',
  primary: '#E63946',
  danger: '#E63946',
  success: '#2E7D32',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceTheme = useDeviceColorScheme();
  const [theme, setTheme] = useState<ThemeMode>('dark'); // Default to dark as per GymGuard style

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const colors = theme === 'dark' ? DarkColors : LightColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};
