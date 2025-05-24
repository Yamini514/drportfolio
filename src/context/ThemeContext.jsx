import React, { createContext, useState, useContext, useEffect } from 'react';
import { themes } from '../styles/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const currentTheme = themes[theme];

  useEffect(() => {
    document.body.className = theme;
    document.body.style.backgroundColor = currentTheme.background;
    document.body.style.color = currentTheme.text.primary;
  }, [theme, currentTheme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
