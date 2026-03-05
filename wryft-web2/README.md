# Wryft Web Frontend

React + Vite frontend for Wryft Chat application.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at http://localhost:5173

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

## Project Structure

```
wryft-web/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── styles/         # CSS files
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── public/             # Static assets
├── index.html          # HTML template
└── vite.config.js      # Vite configuration
```

## Tech Stack

- React 18
- Vite
- React Router
- WebSocket for real-time communication
- Tauri (for desktop app)

## Backend

The backend API runs separately. See `../backend/README.md` for backend setup.
