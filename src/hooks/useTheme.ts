// hooks/useTheme.ts
import { useState, useEffect } from 'react';

export const useTheme = () => {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('medp_theme') as 'dark' | 'light') || 'light';
    });

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('medp_theme', next);
    };

    const isDark = theme === 'dark';

    useEffect(() => {
        if (isDark) {
            document.body.style.backgroundColor = '#161b22';
            document.body.style.color = '#c9d1d9';
            document.documentElement.style.backgroundColor = '#161b22';
        } else {
            document.body.style.backgroundColor = '#f6f8fa';
            document.body.style.color = '#1f2328';
            document.documentElement.style.backgroundColor = '#f6f8fa';
        }
    }, [isDark]);

    return { theme, toggleTheme, isDark };
};