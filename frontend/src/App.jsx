import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage     from './pages/ChatPage';
import { ApiUrlModal } from './components/common/ApiUrlModal';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <ErrorBoundary>
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background:  'var(--bg-elevated)',
                  color:       'var(--text-primary)',
                  border:      '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  fontSize:    '13px',
                  fontFamily:  'var(--font-sans)',
                  boxShadow:   'var(--shadow-md)',
                },
                success: {
                  iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-elevated)' },
                },
                error: {
                  iconTheme: { primary: 'var(--error)', secondary: 'var(--bg-elevated)' },
                },
              }}
            />

            <Routes>
              {/* Public routes (redirect if authenticated) */}
              <Route element={<PublicRoute />}>
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/chat" element={<ChatPage />} />
              </Route>

              {/* Default redirect */}
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>

            {/* In-app API Server Connection Modal */}
            <ApiUrlModal />
          </ErrorBoundary>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
