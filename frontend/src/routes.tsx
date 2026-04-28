import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Spinner } from './components/ui/Spinner'
import { useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'

// Lazy-load feature pages
const GeneratePage = lazy(() => import('./pages/GeneratePage'))
const EditPage = lazy(() => import('./pages/EditPage'))
const GalleryPage = lazy(() => import('./pages/GalleryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <Spinner size="lg" className="text-primary-500" />
  </div>
)

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (!user?.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/generate" replace />
          </ProtectedRoute>
        }
      />

      {/* Protected shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route
          path="/generate"
          element={
            <Suspense fallback={<PageLoader />}>
              <GeneratePage />
            </Suspense>
          }
        />
        <Route
          path="/edit"
          element={
            <Suspense fallback={<PageLoader />}>
              <EditPage />
            </Suspense>
          }
        />
        <Route
          path="/gallery"
          element={
            <Suspense fallback={<PageLoader />}>
              <GalleryPage />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminPage />
              </Suspense>
            </AdminRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
