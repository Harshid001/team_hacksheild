const fs = require('fs');
const path = require('path');
const srcDir = 'd:/NewVolumeE/HackSheild/team_hacksheild/mf-voice-advisor/apps/web/src';

// translations.ts
const transPath = path.join(srcDir, 'lib/translations.ts');
let trans = fs.readFileSync(transPath, 'utf8');
trans = "import { APP_NAME } from '../config/constants'\n" + trans;
trans = trans.replace(/FundWise/g, '${APP_NAME}');
trans = trans.replace(/`\$\{APP_NAME\} (cannot|आपकी|আপনার|توهان|உங்கள்|మీ|آپ|ਤੁਹਾਡੀ|તમારા|ನಿಮ್ಮ|നിങ്ങൾക്കു|तुमच्यासाठी)/g, (match, p1) => '${APP_NAME} ' + p1);
trans = trans.replace(/body: \"\$\{APP_NAME\} ([^\"]+)\"/g, 'body: `\\${APP_NAME} $1`');
trans = trans.replace(/footerCopy: \"© 2025 \$\{APP_NAME\} ([^\"]+)\"/g, 'footerCopy: `© 2025 \\${APP_NAME} $1`');
fs.writeFileSync(transPath, trans);

// TextFallback.tsx
const tfPath = path.join(srcDir, 'components/TextFallback.tsx');
let tf = fs.readFileSync(tfPath, 'utf8');
tf = "import { APP_NAME } from '../config/constants'\n" + tf;
tf = tf.replace(/'FundWise is thinking\.\.\.'/g, '`${APP_NAME} is thinking...`');
tf = tf.replace(/'FundWise is speaking\.\.\.'/g, '`${APP_NAME} is speaking...`');
fs.writeFileSync(tfPath, tf);

// ListeningIndicator.tsx
const liPath = path.join(srcDir, 'components/ListeningIndicator.tsx');
let li = fs.readFileSync(liPath, 'utf8');
li = "import { APP_NAME } from '../config/constants'\n" + li;
li = li.replace(/'FundWise is speaking'/g, '`${APP_NAME} is speaking`');
fs.writeFileSync(liPath, li);

// ConversationBubble.tsx
const cbPath = path.join(srcDir, 'components/ConversationBubble.tsx');
let cb = fs.readFileSync(cbPath, 'utf8');
cb = "import { APP_NAME } from '../config/constants'\n" + cb;
cb = cb.replace(/\"FundWise is typing\"/g, '{`${APP_NAME} is typing`}');
fs.writeFileSync(cbPath, cb);

// App.tsx
const appPath = path.join(srcDir, 'App.tsx');
let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/FundWise/g, 'MF Advisor');
app = "import { APP_NAME } from './config/constants'\n" + app;
app = app.replace(/function App\(\) \{/, 'function App() {\n  document.title = APP_NAME + \' — AI Mutual Fund Advisor\'');
fs.writeFileSync(appPath, app);

// ConversationPage.tsx
const cpPath = path.join(srcDir, 'pages/ConversationPage.tsx');
let cp = fs.readFileSync(cpPath, 'utf8');
cp = "import { APP_NAME } from '../config/constants'\n" + cp;
cp = cp.replace(/Hello! I\'m your MF Advisor/g, 'Hello! I\\\'m your ${APP_NAME}');
cp = cp.replace(/handleNewQuestion\('Hello! I\\'m your \$\{APP_NAME\}\./g, 'handleNewQuestion(`Hello! I\\\'m your ${APP_NAME}.');
cp = cp.replace(/tell me your age\?'\)/g, 'tell me your age?`)');
fs.writeFileSync(cpPath, cp);

// LandingPage.tsx
const lpPath = path.join(srcDir, 'pages/LandingPage.tsx');
let lp = fs.readFileSync(lpPath, 'utf8');
lp = "import { APP_NAME } from '../config/constants'\n" + lp;
lp = lp.replace(/>MF Advisor</g, '>{APP_NAME}<');
fs.writeFileSync(lpPath, lp);

console.log("Done");
