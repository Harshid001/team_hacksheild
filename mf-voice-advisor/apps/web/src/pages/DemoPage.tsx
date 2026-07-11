import { Link } from 'react-router-dom'
import { getMockReport, getMockReportConservative } from '../lib/api'
import ReportCard from '../components/ReportCard'
import type { FundRecommendation } from '../../../../packages/shared/src/types'

export default function DemoPage() {
  const moderateReport = getMockReport('demo-mod')
  const conservativeReport = getMockReportConservative('demo-cons')

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <header className="text-center space-y-4 mb-12">
          <h1 className="text-3xl font-display font-bold text-slate-800">Adaptive AI Demonstration</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This page demonstrates how the LLM dynamically branches the conversation and generates completely different recommendations based on user answers.
          </p>
          <Link to="/" className="btn-secondary inline-block mt-4">← Back to Main Flow</Link>
        </header>

        <div className="grid lg:grid-cols-2 gap-10">
          
          {/* Path A */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-t-4 border-blue-500 shadow-sm">
              <h2 className="font-bold text-lg text-slate-800 mb-4">Path A: The Wealth Builder</h2>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg"><span className="font-semibold text-slate-700">Q:</span> What brings you here?</div>
                <div className="bg-blue-50 p-3 rounded-lg text-blue-900"><span className="font-semibold">User:</span> I want to grow my wealth over the next 15 years.</div>
                <div className="bg-gray-50 p-3 rounded-lg"><span className="font-semibold text-slate-700">Q:</span> (Adaptive) 15 years is a great horizon. How would you react if your portfolio dropped 20% in a bad year?</div>
                <div className="bg-blue-50 p-3 rounded-lg text-blue-900"><span className="font-semibold">User:</span> I'd probably buy more while it's cheap.</div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inferred Profile</span>
                <span className="text-sm font-bold text-slate-700">Moderate / Long-term</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {moderateReport.recommendedFunds.map((rec: FundRecommendation) => (
                <ReportCard key={rec.category} recommendation={rec} />
              ))}
            </div>
          </div>

          {/* Path B */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-t-4 border-amber-500 shadow-sm">
              <h2 className="font-bold text-lg text-slate-800 mb-4">Path B: The Cautious Saver</h2>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg"><span className="font-semibold text-slate-700">Q:</span> What brings you here?</div>
                <div className="bg-amber-50 p-3 rounded-lg text-amber-900"><span className="font-semibold">User:</span> I'm saving for a down payment on a house next year.</div>
                <div className="bg-gray-50 p-3 rounded-lg"><span className="font-semibold text-slate-700">Q:</span> (Adaptive) Exciting! Since you need the money soon, protecting it is key. How much risk are you willing to take?</div>
                <div className="bg-amber-50 p-3 rounded-lg text-amber-900"><span className="font-semibold">User:</span> None at all. I can't afford to lose this money.</div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inferred Profile</span>
                <span className="text-sm font-bold text-slate-700">Conservative / Short-term</span>
              </div>
            </div>

            <div className="space-y-6">
              {conservativeReport.recommendedFunds.map((rec: FundRecommendation) => (
                <ReportCard key={rec.category} recommendation={rec} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
