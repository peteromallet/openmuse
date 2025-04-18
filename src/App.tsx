import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import LoadingState from '@/components/LoadingState';
import { AuthProvider } from '@/providers/AuthProvider';
import AuthCallback from '@/pages/AuthCallback';
import RequireAuth from '@/components/RequireAuth';
import AssetDetailPage from './pages/AssetDetailPage';

const HomePage = lazy(() => import('./pages/Index'));
const UploadPage = lazy(() => import('./pages/upload/UploadPage'));
const AdminPage = lazy(() => import('./pages/Admin'));
const AuthPage = lazy(() => import('./pages/Auth'));
const VideoPage = lazy(() => import('./pages/VideoPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ManifestoPage = lazy(() => import('./pages/Manifesto'));

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-lime-800/70">
        <Router>
          <Suspense fallback={<LoadingState />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/manifesto" element={<ManifestoPage />} />
              <Route path="/videos/:id" element={<VideoPage />} />
              <Route path="/assets/:id" element={<AssetDetailPage />} />
              <Route path="/assets/loras/:id" element={<AssetDetailPage />} />
              <Route path="/profile/:displayName" element={<UserProfilePage />} />
              <Route path="/upload" element={<UploadPage />} />

              <Route 
                path="/admin"
                element={
                  <RequireAuth requireAdmin={true}>
                    <AdminPage />
                  </RequireAuth>
                }
              />
            </Routes>
          </Suspense>
          <Toaster />
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
