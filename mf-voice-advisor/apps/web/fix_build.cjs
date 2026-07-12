const fs = require('fs');
const path = require('path');
const srcDir = 'd:/NewVolumeE/HackSheild/team_hacksheild/mf-voice-advisor/apps/web/src';

// 1. Fix translations.ts
const transPath = path.join(srcDir, 'lib/translations.ts');
let trans = fs.readFileSync(transPath, 'utf8');
trans = trans.replace(/\\\$\{APP_NAME\}/g, '${APP_NAME}');
fs.writeFileSync(transPath, trans);

// 2. Fix TextFallback.tsx
const tfPath = path.join(srcDir, 'components/TextFallback.tsx');
let tf = fs.readFileSync(tfPath, 'utf8');
tf = tf.replace(/\\\$\{APP_NAME\}/g, '${APP_NAME}');
fs.writeFileSync(tfPath, tf);

// 3. Fix ListeningIndicator.tsx
const liPath = path.join(srcDir, 'components/ListeningIndicator.tsx');
let li = fs.readFileSync(liPath, 'utf8');
li = li.replace(/\\\$\{APP_NAME\}/g, '${APP_NAME}');
fs.writeFileSync(liPath, li);

// 4. Fix ConversationBubble.tsx
const cbPath = path.join(srcDir, 'components/ConversationBubble.tsx');
let cb = fs.readFileSync(cbPath, 'utf8');
cb = cb.replace(/\\\$\{APP_NAME\}/g, '${APP_NAME}');
fs.writeFileSync(cbPath, cb);

// 5. Fix StageLabel.tsx
const slPath = path.join(srcDir, 'components/StageLabel.tsx');
let sl = fs.readFileSync(slPath, 'utf8');
sl = sl.replace('const progress = Math.round(((safeIndex) / (TOTAL_STAGES - 1)) * 100)\n', '');
fs.writeFileSync(slPath, sl);

// 6. Fix ConversationPage.tsx renderProfileField scoping
const cpPath = path.join(srcDir, 'pages/ConversationPage.tsx');
let cp = fs.readFileSync(cpPath, 'utf8');
const renderProfileFieldFunc = `
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

cp = cp.replace(renderProfileFieldFunc + '\n  return (', '  return (');
cp = cp.replace('  return (', renderProfileFieldFunc + '\n  return (');
fs.writeFileSync(cpPath, cp);

console.log('Fixed syntax errors and unused variables.');
