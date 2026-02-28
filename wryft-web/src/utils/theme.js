export const defaultTheme = {
    '--primary-color': '#2F6CCE',
    '--primary-hover': '#2558a8',
    '--bg-main': '#1a1a1a',
    '--bg-sidebar': '#111111',
    '--bg-servers': '#0a0a0a',
    '--bg-chat': '#1a1a1a',
    '--bg-input': '#0a0a0a',
    '--bg-modal': '#0a0a0a',
    '--text-main': '#dcddde',
    '--text-muted': '#b9bbbe',
    '--text-header': '#ffffff',
    '--border-main': '#2a2a2a',
    '--border-light': '#222222',
    '--border-strong': '#3a3a3a',
    '--bg-darker': '#050505',
    '--accent-color': '#2F6CCE',
};

export const coalTheme = {
    '--primary-color': '#2F6CCE',
    '--primary-hover': '#2558a8',
    '--bg-main': '#070706',
    '--bg-sidebar': '#050504',
    '--bg-servers': '#030302',
    '--bg-chat': '#070706',
    '--bg-input': '#030302',
    '--bg-modal': '#030302',
    '--text-main': '#e8e8e8',
    '--text-muted': '#a0a0a0',
    '--text-header': '#ffffff',
    '--border-main': '#1a1a19',
    '--border-light': '#121211',
    '--border-strong': '#2a2a28',
    '--bg-darker': '#020201',
    '--accent-color': '#2F6CCE',
};

export const themes = {
    default: defaultTheme,
    coal: coalTheme,
};

export const loadTheme = () => {
    const savedTheme = localStorage.getItem('wryft_custom_theme');
    if (savedTheme) {
        try {
            const theme = JSON.parse(savedTheme);
            applyTheme(theme);
            return theme;
        } catch (e) {
            console.error('Failed to parse saved theme:', e);
        }
    }
    return {};
};

export const applyTheme = (theme) => {
    Object.keys(theme).forEach((key) => {
        document.documentElement.style.setProperty(key, theme[key]);
    });
};

export const saveTheme = (theme) => {
    localStorage.setItem('wryft_custom_theme', JSON.stringify(theme));
    applyTheme(theme);
};

export const resetTheme = () => {
    localStorage.removeItem('wryft_custom_theme');
    Object.keys(defaultTheme).forEach((key) => {
        document.documentElement.style.removeProperty(key);
    });
};
