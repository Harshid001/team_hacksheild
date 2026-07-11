import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/axios'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  GoogleAuthFailed: 'Google sign-in failed. Please try again.',
  DatabaseUnavailable: 'Database is temporarily unavailable. Please try again shortly.',
  MissingCode: 'Google sign-in was interrupted. Please try again.',
  InvalidGoogleToken: 'Google returned an invalid token. Please try again.',
  SessionInitFailed: 'Could not complete sign-in. Please try again.',
  NoTokenProvided: 'Sign-in did not return a valid session. Please try again.',
}

function formatAuthError(code: string | null): string {
  if (!code) return ''
  return AUTH_ERROR_MESSAGES[code] ?? code
}

export default function SignupPage() {
  const { setAuthData, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const initialError = searchParams.get('error')
  
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(formatAuthError(initialError))

  // Form State
  const [name, setName] = useState('Jane Doe')
  const [email, setEmail] = useState('test@test.com')
  const [password, setPassword] = useState('password123')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/start', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth flow
    const isLocal = window.location.hostname === 'localhost';
    window.location.href = `${isLocal ? 'http://localhost:3000' : ''}/api/auth/google`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic client validation
    if (mode === 'signup' && !name) {
      setError('Name is required')
      setLoading(false)
      return
    }
    if (!email || !password) {
      setError('Email and password are required')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      if (mode === 'signup') {
        setAuthData('mock-jwt-token', { id: 'mock-user-123', name, email, hasProfile: false })
        navigate('/start', { replace: true })
      } else {
        setAuthData('mock-jwt-token', { id: 'mock-user-123', name: 'Jhon Doe', email, hasProfile: false })
        navigate('/start', { replace: true })
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please try again.'
      setError(`Error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md mx-auto mb-4">
          M
        </div>
        <h2 className="mt-2 text-center text-3xl font-display font-extrabold text-gray-900 dark:text-white">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
            {mode === 'login' ? 'start your free profile setup' : 'sign in to your existing account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-slate-700">

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 uppercase tracking-widest text-xs font-semibold">Or continue with</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter your full name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-70 disabled:cursor-wait mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
