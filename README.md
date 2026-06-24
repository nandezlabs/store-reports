# Store Reports — PX 1775

AI-powered report generator for Daily Metrics, Weekly Recaps, and Visit Reports.  
Built with React + Vite. Generates reports in first-person voice via Claude API.

---

## Stack

- **Frontend** — React + Vite (static, deployable to Netlify/Vercel/GitHub Pages)
- **AI** — Claude Sonnet via Anthropic API (routed through a serverless proxy)
- **Email** — EmailJS (free tier, no backend needed for sending)

---

## Project Structure

```
store-reports/
├── src/
│   ├── App.jsx          ← All app logic and UI (main file)
│   └── index.css        ← Global styles and CSS variables
├── api/
│   └── generate.js      ← Serverless proxy for Anthropic API (Vercel/Netlify)
├── public/
├── index.html
├── vite.config.js
├── package.json
├── .env.example         ← Copy to .env and fill in your keys
└── .gitignore
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/nandezlabs/store-reports.git
cd store-reports
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
```

### 3. EmailJS setup (one-time)

1. Go to [emailjs.com](https://emailjs.com) and create a free account
2. **Email Services** → Add New Service → Gmail → connect your Gmail
3. **Email Templates** → Create Template with these variables:
   ```
   To: {{to_email}}
   Subject: {{subject}}
   Body: {{body}}
   From Name: {{from_name}}
   ```
4. Copy your Service ID, Template ID, and Public Key into `.env`

### 4. Deploy the API proxy

The file at `/api/generate.js` is a serverless function that keeps your Anthropic API key server-side.

**Vercel (recommended):**
1. Push this repo to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` in Project Settings → Environment Variables
4. Deploy — Vercel auto-detects `/api/*.js` as functions

**Netlify:**
1. Copy `api/generate.js` to `netlify/functions/generate.js`
2. Add `ANTHROPIC_API_KEY` in Site Settings → Environment Variables
3. Update `CONFIG.apiEndpoint` in `App.jsx` to `/.netlify/functions/generate`

### 5. Update CONFIG

Open `src/App.jsx` and update the `CONFIG` block at the top:

```js
const CONFIG = {
  storeNumber:  '1775',
  managerName:  'Duvan',
  managerEmail: 'your.personal@gmail.com',
  acoName:      'Luis',
  rdoName:      'Lily',
  recipients: {
    weekly: ['your.work@pandarg.com'],
    visit:  ['your.work@pandarg.com'],
  },
  // ...
}
```

### 6. Run locally

```bash
npm run dev
```

---

## Deploy

```bash
npm run build   # builds to /dist
```

Push to GitHub → Vercel/Netlify auto-deploys on every push to `main`.

---

## Customization

All the things you might want to change are labeled with `← change` comments in `App.jsx`:

| What | Where |
|------|-------|
| Store number, manager name | `CONFIG` block, top of `App.jsx` |
| Default visitor names | `CONFIG.acoName` / `CONFIG.rdoName` |
| Email recipients | `CONFIG.recipients` |
| OT thresholds | `CONFIG.otThresholds` |
| AI model | `api/generate.js` → `model:` field |
| Report tone / format | `buildDailyPrompt()`, `buildWeeklyPrompt()`, `buildVisitPrompt()` functions |
| Colors / fonts | `src/index.css` CSS variables |

---

## Fiscal Calendar

Uses Panda Express's 4-4-5 fiscal calendar.  
**Anchor point:** P7 W1 = Monday, June 16, 2026.  
Period week counts: P3, P6, P9, P12 have 5 weeks — all others have 4.

To update the anchor if fiscal years shift, edit these two constants in `App.jsx`:
```js
const FISCAL_ANCHOR = new Date('2026-06-16')
const FISCAL_ANCHOR_PERIOD = 7
```
