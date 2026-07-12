const fs = require('fs');
const path = require('path');
const cpPath = path.join('d:/NewVolumeE/HackSheild/team_hacksheild/mf-voice-advisor/apps/web/src/pages/ConversationPage.tsx');
let cp = fs.readFileSync(cpPath, 'utf8');

// 1. Add showKeyboard state
cp = cp.replace('const [isAiTyping, setIsAiTyping] = useState(false)', 'const [isAiTyping, setIsAiTyping] = useState(false)\n  const [showKeyboard, setShowKeyboard] = useState(false)');

// 2. Add renderProfileField helper
const renderProfileField = `
  const renderProfileField = (label: string, value: string | undefined, activeStepIndex: number) => {
    const isCurrent = stageIndex === activeStepIndex;
    const isAnswered = !!value;
    return (
      <div className={\`border rounded-xl p-4 transition-all duration-300 \${
        isCurrent 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm'
      }\`}>
        <p className={\`text-xs mb-1 \${isCurrent ? 'text-blue-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}\`}>
          {label}
        </p>
        <p className={\`font-semibold \${
          isAnswered ? 'text-slate-800 dark:text-white' : 'text-gray-300 dark:text-gray-600'
        }\`}>
          {value || '—'}
        </p>
      </div>
    )
  }
`;
cp = cp.replace('return (', renderProfileField + '\n  return (');

// 3. Replace Bottom Input Area & Live Profile Sidebar & Remove Voice Overlay
const startInputAreaIndex = cp.indexOf('{/* ── Bottom Input Area');
if (startInputAreaIndex !== -1) {
  cp = cp.substring(0, startInputAreaIndex) + `{/* ── Bottom Input Area ────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pt-3 pb-6 px-4 flex-shrink-0 relative z-20">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Reverse SIP Calculator Widget */}
            <AnimatePresence>
              {!isAiTyping && orbState !== 'thinking' && stageIndex === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <SipCalculatorWidget
                    horizonString={liveProfile.horizon}
                    onSelectSip={handleSendAnswer}
                    disabled={orbState === 'listening'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Replies row */}
            <AnimatePresence>
              {!isAiTyping && orbState !== 'thinking' && QUICK_OPTIONS[stageIndex] && QUICK_OPTIONS[stageIndex].length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <QuickReplies
                    options={QUICK_OPTIONS[stageIndex]}
                    onSelect={(val) => handleSendAnswer(val)}
                    disabled={orbState === 'listening'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary Input Container */}
            <div className="flex flex-col items-center justify-center min-h-[120px]">
              <AnimatePresence mode="wait">
                {!showKeyboard ? (
                  <motion.div 
                    key="voice"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center w-full relative"
                  >
                    {/* Live interim transcript floating above orb */}
                    <AnimatePresence>
                      {interimText && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-14 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg max-w-xs truncate z-50"
                        >
                          "{interimText}..."
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="transform scale-75 sm:scale-90 origin-center -my-4">
                      <ListeningIndicator
                        state={orbState}
                        onClick={handleOrbClick}
                        disabled={!sessionId || isMuted}
                      />
                    </div>

                    {!isAiTyping && orbState === 'idle' && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        You can type, tap a suggestion, or just speak your answer
                      </p>
                    )}

                    <button
                      onClick={() => setShowKeyboard(true)}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                    >
                      Type instead
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="keyboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex flex-col items-center"
                  >
                    <TextFallback
                      onSend={(val) => {
                         setShowKeyboard(false)
                         handleSendAnswer(val)
                      }}
                      disabled={orbState === 'thinking' || !sessionId}
                      orbState={orbState}
                    />
                    <button
                      onClick={() => setShowKeyboard(false)}
                      className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors"
                    >
                      Use voice instead
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Profile Sidebar ─────────────────────────────────── */}
      <div className="hidden md:flex w-80 bg-slate-50 dark:bg-slate-900 flex-col border-l border-gray-200 dark:border-slate-800 relative z-20">
        <div className="p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Live Profile</h3>
          
          <div className="space-y-4">
            {renderProfileField('Age Group', liveProfile.age, 1)}
            {renderProfileField('Time Horizon', liveProfile.horizon, 2)}
            
            {liveProfile.targetGoal && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 dark:bg-blue-800/50 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold mb-1 relative z-10">Target Goal</p>
                <p className="font-bold text-slate-800 dark:text-white text-lg relative z-10">{liveProfile.targetGoal}</p>
              </motion.div>
            )}

            {renderProfileField('Monthly Investment', liveProfile.amount, 3)}
            
            <div className={\`border rounded-xl p-4 transition-all duration-300 \${
              stageIndex === 4 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm'
            }\`}>
              <p className={\`text-xs mb-1 \${stageIndex === 4 ? 'text-blue-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}\`}>Risk Comfort</p>
              <p className={\`font-semibold flex items-center gap-2 \${
                liveProfile.risk ? 'text-slate-800 dark:text-white' : 'text-gray-300 dark:text-gray-600'
              }\`}>
                {liveProfile.risk && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                {liveProfile.risk || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
`;
}

fs.writeFileSync(cpPath, cp);
console.log('ConversationPage redesigned successfully.');
