'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check initial preference from document class
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
      // Dispatch storage event to alert standard clients of change
      window.dispatchEvent(new Event('storage'));
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
      ) : (
        <Sun className="h-4.5 w-4.5 text-amber-500" />
      )}
    </button>
  );
}
