import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchReport, generateReport } from '../lib/api'
import type { Report, FundRecommendation } from '../../../../packages/shared/src/types'
import DisclaimerBanner from '../components/DisclaimerBanner'
import ReportCard from '../components/ReportCard'

const LOADING_STEPS_EN = [
  "Pulling real fund data...",
  "Computing your risk profile...",
  "Preparing your report..."
]

const LOADING_STEPS_HI = [
  "वास्तविक फंड डेटा निकाला जा रहा है...",
  "आपके जोखिम प्रोफाइल की गणना की जा रही है...",
  "आपकी रिपोर्ट तैयार की जा रही है..."
]

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState(false)

  const lang = localStorage.getItem('pref-lang') || 'en'
  const loadingSteps = lang === 'hi' ? LOADING_STEPS_HI : LOADING_STEPS_EN

  useEffect(() => {
    if (!sessionId) return

    // 1. Cycle loading steps sequentially
    const interval = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, loadingSteps.length - 1))
    }, 1200)

    // 2. Fetch/Generate report
    const load = async () => {
      try {
        let data;
        try {
          // First attempt to generate a new report
          data = await generateReport(sessionId)
        } catch (genErr: any) {
          // If generation fails (e.g. report already exists or generated before), try fetching it
          console.warn('Report generation encountered an error (might already exist), fetching instead:', genErr.message)
          data = await fetchReport(sessionId)
        }
        setReport(data)
        // Keep loading visible for at least 3.6s to show all steps to the user
        await new Promise(resolve => setTimeout(resolve, 3600))
      } catch (err) {
        console.error(err)
        setError(true)
      } finally {
        setLoading(false)
        clearInterval(interval)
      }
    }
    load()

    return () => clearInterval(interval)
  }, [sessionId, loadingSteps.length])

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <svg className="w-16 h-16 text-blue-400 animate-spin mb-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>

          <h1 className="text-2xl font-display font-semibold mb-6">
            {lang === 'hi' ? "आपके प्रोफाइल का विश्लेषण किया जा रहा है" : "Analyzing your profile"}
          </h1>

          <div className="h-12 relative w-full flex justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-gray-300 text-sm absolute font-medium"
              >
                {loadingSteps[stepIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </main>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-red-600 font-medium">
          {lang === 'hi' ? "रिपोर्ट लोड करने में विफल।" : "Failed to load report."}
        </p>
        <Link to="/" className="btn-secondary">
          {lang === 'hi' ? "फिर से शुरू करें" : "Start Over"}
        </Link>
      </div>
    )
  }

  // Translate reports on-the-fly for Hindi
  const translateFundCategory = (catName: string) => {
    if (lang !== 'hi') return catName
    if (catName.includes('Large Cap')) return 'लार्ज कैप इक्विटी (Large Cap Equity)'
    if (catName.includes('Hybrid') || catName.includes('Balanced')) return 'बैलेंस्ड हाइब्रिड (Balanced Hybrid)'
    if (catName.includes('Multi Cap')) return 'मल्टी कैप इक्विटी (Multi Cap Equity)'
    if (catName.includes('Liquid')) return 'लिक्विड फंड (Liquid Fund)'
    if (catName.includes('Debt')) return 'डेब्ट फंड (Debt Fund)'
    return catName
  }

  let profileHeadline = report.profileSummary.headline
  let profileDescription = report.profileSummary.description

  if (lang === 'hi') {
    if (report.profileSummary.riskLevel === 'Moderate') {
      profileHeadline = "आप एक मध्यम जोखिम, दीर्घकालिक निवेशक हैं"
      profileDescription = "संतुलित जोखिम उठाने की क्षमता और लंबी अवधि के साथ, आप विविधीकृत निवेश के माध्यम से धन बनाने के लिए अच्छी स्थिति में हैं। आपको जल्द ही पैसे की आवश्यकता नहीं है, और आप अल्पकालिक उतार-चढ़ाव देखने में सहज हैं।"
    } else if (report.profileSummary.riskLevel === 'Conservative') {
      profileHeadline = "आप एक सुरक्षित, अल्पकालिक निवेशक हैं"
      profileDescription = "आप अपने पैसे को सुरक्षित रखना पसंद करते हैं, और आपको इसकी अपेक्षाकृत जल्दी आवश्यकता है। अभी आपके लिए जो कुछ भी है उसकी सुरक्षा करना सबसे महत्वपूर्ण है।"
    } else {
      profileHeadline = "आप एक उच्च-जोखिम, दीर्घकालिक निवेशक हैं"
      profileDescription = "धन संचय पर ध्यान केंद्रित करने वाले एक आक्रामक निवेशक के रूप में, आप उच्च रिटर्न की तलाश में बाजार में अधिक उतार-चढ़ाव सहन करने के लिए तैयार हैं।"
    }
  }

  const translatedFunds = report.recommendedFunds.map((rec: FundRecommendation) => {
    if (lang !== 'hi') return rec
    let hiDesc = rec.description
    let hiAi = rec.aiExplanation
    if (rec.categoryName.includes('Large Cap')) {
      hiDesc = "भारत की सबसे बड़ी, सबसे स्थापित कंपनियाँ"
      hiAi = "आपके जैसे लक्ष्यों और जोखिम आराम के लिए, बड़ी और स्थापित कंपनियों में निवेश करने वाले फंड ने ऐतिहासिक रूप से अधिक स्थिरता प्रदान की है। ये भारत के प्रमुख व्यवसाय हैं — ये सबसे तेजी से बढ़ने वाले नहीं हैं, लेकिन इन्होंने विभिन्न बाजार चक्रों में स्थिरता साबित की है।"
    } else if (rec.categoryName.includes('Hybrid') || rec.categoryName.includes('Balanced')) {
      hiDesc = "आधा इक्विटी, आधा कर्ज — दोनों दुनिया का सर्वश्रेष्ठ हिस्सा"
      hiAi = "एक संतुलित हाइब्रिड फंड लगभग 40-60% शेयरों में और बाकी बॉन्ड में रखता है। आपके प्रोफाइल के लिए — यह श्रेणी ऐतिहासिक रूप से सबसे अच्छे जोखिम-समायोजित रिटर्न की पेशकश करती है, जिसका अर्थ है शुद्ध इक्विटी फंड की हलचल के बिना ठीक विकास।"
    } else if (rec.categoryName.includes('Multi Cap')) {
      hiDesc = "बड़ी, मध्यम और छोटी कंपनियों का मिश्रण"
      hiAi = "मल्टी-कैप फंड आपके पैसे को सभी आकारों के व्यवसायों में फैलाते हैं। यह आपको स्थिरता और विकास दोनों की क्षमता देता है। मध्यम-जोखिम के साथ यह ऐतिहासिक रूप से 7+ वर्ष के लिए सबसे अच्छे रिटर्न में से एक है।"
    } else if (rec.categoryName.includes('Liquid')) {
      hiDesc = "कम रिटर्न के साथ अल्पावधि के पैसे को सुरक्षित रखें"
      hiAi = "लिक्विड फंड को बैंक बचत खाते की तरह समझें, जहाँ सुरक्षित रूप से पैसे जमा करके अधिक ब्याज मिलता है और आप किसी भी समय इसे निकाल सकते हैं। 6-12 महीने की अवधि के लिए यह आदर्श है।"
    } else if (rec.categoryName.includes('Debt')) {
      hiDesc = "बॉन्ड और सरकारी प्रतिभूतियां — कम जोखिम"
      hiAi = "डेब्ट फंड कंपनियों और सरकार जारी बॉन्ड में निवेश करते हैं — संक्षेप में ऋण देकर ब्याज कमाते हैं। इनका उद्देश्य आक्रामक वृद्धि के बजाय पूंजी संरक्षण है।"
    }

    return {
      ...rec,
      categoryName: translateFundCategory(rec.categoryName),
      description: hiDesc,
      aiExplanation: hiAi
    }
  })

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Informational Disclaimer Banner at the top */}
        <DisclaimerBanner variant="informational" />

        {/* Profile Summary */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left"
        >
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
            {report.profileSummary.emoji}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">
              {profileHeadline}
            </h1>
            <p className="text-slate-200 leading-relaxed max-w-2xl text-sm sm:text-base">
              {profileDescription}
            </p>
          </div>
        </motion.section>

        {/* Categories Header */}
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-display font-semibold text-slate-800">
            {lang === 'hi' ? "फंड श्रेणियां जो आपके प्रोफाइल से मेल खाती हैं" : "Fund Categories That Match Your Profile"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'hi'
              ? "आपके बताए गए लक्ष्यों और जोखिम आराम के आधार पर, इस प्रकार के फंड ऐतिहासिक रूप से समान प्रोफाइल के साथ संरेखित रहे हैं।"
              : "Based on your stated goals and risk comfort, these types of funds have historically aligned with similar profiles."}
          </p>
        </div>

        {/* Report Cards */}
        <div className="space-y-8">
          {translatedFunds.map((rec: FundRecommendation) => (
            <ReportCard key={rec.category} recommendation={rec} />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400 italic mb-4">
            {lang === 'hi'
              ? "याद रखें: यह एक शैक्षिक विवरण है, खरीदने की सिफारिश नहीं।"
              : "Remember: This is an educational breakdown, not a recommendation to buy."}
          </p>
          <Link to="/" className="btn-secondary">
            {lang === 'hi' ? "नया प्रोफाइल शुरू करें" : "Start a New Profile"}
          </Link>
        </footer>
      </div>
    </main>
  )
}
