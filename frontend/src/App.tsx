import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { useAuth } from './lib/auth-context'
import { AdminPage } from './pages/admin-page'
import { AlertsPage } from './pages/alerts-page'
import { AnalyticsPage } from './pages/analytics-page'
import { ChargingStationsPage } from './pages/charging-stations-page'
import { DashboardPage } from './pages/dashboard-page'
import { LandingPage } from './pages/landing-page'
import { LoginPage } from './pages/login-page'
import { RobotsPage } from './pages/robots-page'
import { SignupPage } from './pages/signup-page'
import { TasksPage } from './pages/tasks-page'
import { WaypointsPage } from './pages/waypoints-page'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-6 py-5 font-headline text-sm uppercase tracking-[0.18em]">
          Booting command center...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/robots"
          element={
            <ProtectedRoute>
              <RobotsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/waypoints"
          element={
            <ProtectedRoute>
              <WaypointsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/charging-stations"
          element={
            <ProtectedRoute>
              <ChargingStationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/alerts"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
