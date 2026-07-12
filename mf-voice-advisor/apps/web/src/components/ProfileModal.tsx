import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

interface ProfileModalProps {
  onClose: () => void
}

// Mock data to simulate backend fetch
const MOCK_BACKEND_DATA = {
  riskProfile: 'Moderate', // Set to null to see empty state
  kycStatus: 'Verified' as const, // Set to 'Pending' to see pending state
  linkedAccounts: [
    { id: 1, bank: 'HDFC Bank', type: 'Savings', last4: '4091', isPrimary: true }
  ] // Set to [] to see empty state
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [profileData, setProfileData] = useState<typeof MOCK_BACKEND_DATA | null>(null)

  useEffect(() => {
    // Simulate API fetch to demonstrate loading states
    const timer = setTimeout(() => {
      setProfileData(MOCK_BACKEND_DATA)
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md max-h-[100dvh] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-display font-bold text-slate-800">My Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{user?.name || 'User'}</h3>
              <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
              <p className="text-xs text-blue-600 font-semibold mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-full">Pro Member</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Risk Profile */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group cursor-pointer hover:bg-slate-100 transition-colors">
              <p className="text-xs text-slate-500 mb-1">Risk Profile <span className="text-[10px] bg-slate-200 px-1 rounded">(Demo)</span></p>
              {isLoading ? (
                <div className="h-5 bg-slate-200 rounded animate-pulse w-24"></div>
              ) : profileData?.riskProfile ? (
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {profileData.riskProfile}
                  </p>
                  <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-400">Not set</p>
                  <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Set profile</span>
                </div>
              )}
            </div>

            {/* KYC Status */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">KYC Status <span className="text-[10px] bg-slate-200 px-1 rounded">(Demo)</span></p>
              {isLoading ? (
                <div className="h-5 bg-slate-200 rounded animate-pulse w-24"></div>
              ) : profileData?.kycStatus === 'Verified' ? (
                <p className="font-semibold text-green-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified
                </p>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-amber-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending
                  </p>
                  <button className="text-xs text-blue-600 font-medium hover:underline">Complete KYC</button>
                </div>
              )}
            </div>
          </div>

          {/* Linked Accounts */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              Linked Accounts <span className="text-xs font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">(Demo)</span>
            </h4>
            
            {isLoading ? (
              <div className="p-3 border border-gray-100 rounded-xl flex items-center gap-3 bg-slate-50">
                <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ) : profileData?.linkedAccounts && profileData.linkedAccounts.length > 0 ? (
              <div className="space-y-2">
                {profileData.linkedAccounts.map((account) => (
                  <div key={account.id} className="p-3 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21l9-5-9-5-9 5 9 5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            {account.bank}
                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </p>
                          <p className="text-xs text-slate-500">{account.type} •••• {account.last4}</p>
                        </div>
                      </div>
                      {account.isPrimary && (
                        <span className="text-xs font-medium text-slate-400">Primary</span>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded text-xs text-slate-500 px-2 py-1.5 flex items-center gap-1.5 border border-slate-100">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      Read-only — MF Advisor cannot move funds
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-gray-300 rounded-xl bg-slate-50">
                <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm font-medium text-slate-700">No linked accounts yet</p>
                <p className="text-xs text-slate-500 mt-1">Link one to get personalized guidance</p>
                <button className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors">
                  Link Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
