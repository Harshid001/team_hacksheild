import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import LandingPage       from './pages/LandingPage'
import DisclaimerPage    from './pages/DisclaimerPage'
import ConversationPage  from './pages/ConversationPage'
import ReportPage        from './pages/ReportPage'
import DemoPage          from './pages/DemoPage'
import SignupPage        from './pages/SignupPage'
import OAuthCallback     from './pages/OAuthCallback'

const ProtectedRoute = ({ children, redirectIfHasProfile }: { children: ReactNode; redirectIfHasProfile?: string }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-semibold">Loading your profile...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/signup" replace />
  }
  
  if (redirectIfHasProfile && user?.hasProfile) {
    return <Navigate to={redirectIfHasProfile} replace />
  }

  return children
}

export const router = createBrowserRouter([
  { path: '/',                   element: <LandingPage /> },
  { path: '/signup',             element: <SignupPage /> },
  { path: '/oauth-callback',     element: <OAuthCallback /> },
  { path: '/start',              element: <ProtectedRoute redirectIfHasProfile="/report"><DisclaimerPage /></ProtectedRoute> },
  { path: '/conversation',       element: <ProtectedRoute redirectIfHasProfile="/report"><ConversationPage /></ProtectedRoute> },
  { path: '/report/:sessionId?', element: <ProtectedRoute><ReportPage /></ProtectedRoute> },
  { path: '/demo',               element: <DemoPage /> },
  { path: '*',                   element: <Navigate to="/" replace /> },
])
