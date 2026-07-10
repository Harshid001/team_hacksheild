import { createBrowserRouter, Navigate } from 'react-router-dom'
import LandingPage       from './pages/LandingPage'
import DisclaimerPage    from './pages/DisclaimerPage'
import ConversationPage  from './pages/ConversationPage'
import ReportPage        from './pages/ReportPage'
import DemoPage          from './pages/DemoPage'

/**
 * Route definitions matching specifications:
 * - "/" → LandingPage
 * - "/start" → DisclaimerPage
 * - "/conversation" → ConversationPage
 * - "/report/:sessionId" → ReportPage
 */
export const router = createBrowserRouter([
  { path: '/',                   element: <LandingPage /> },
  { path: '/start',              element: <DisclaimerPage /> },
  { path: '/conversation',       element: <ConversationPage /> },
  { path: '/report/:sessionId',  element: <ReportPage /> },
  { path: '/demo',               element: <DemoPage /> },
  { path: '*',                   element: <Navigate to="/" replace /> },
])
