import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../components/Login';
import App from '../App';
import ProtectedRoute from '../components/ProtectedRoute';
import JoinInvite from '../components/JoinInvite';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/:code',
    element: (
      <ProtectedRoute>
        <JoinInvite />
      </ProtectedRoute>
    ),
  },
  {
    path: '/channels/@me',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
  {
    path: '/channels/@me/:dmId',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
  {
    path: '/channels/:serverId/:channelId',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/channels/@me" replace />,
  },
]);
