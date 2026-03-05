// Application configuration
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  features: {
    voiceChat: import.meta.env.VITE_ENABLE_VOICE !== 'false', // Enabled by default
  },
};
