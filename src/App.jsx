// ============================================================
//  Store Reports — PX 1775
//  App.jsx  —  Main application component
// ============================================================
//
//  SETUP CHECKLIST (complete before running):
//  1. npm install
//  2. cp .env.example .env  →  fill in your API keys
//  3. Deploy /api/generate.js to Netlify or Vercel
//  4. Set up EmailJS at emailjs.com and add credentials to .env
//  5. Update the CONFIG block below with your store's info
//  6. npm run dev  →  test locally
//  7. git push  →  auto-deploys via Netlify/Vercel
//
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react'

// ============================================================
//  CONFIG — Update these values for your store
//  This is the only section you should need to edit regularly.
// ============================================================
const CONFIG = {
  // Store info
  storeNumber: '1775',
  storeName:   'PX 1775',

  // Your personal info
  managerName:  'Duvan',        // Used in report sign-offs
  managerEmail: 'your.personal@gmail.com',  // ← Your Gmail (EmailJS sends FROM here)

  // Default visitor names for Visit Reports
  acoName: 'Luis',   // ACO (direct supervisor)
  rdoName: 'Lily',   // RDO & Above

  // Who receives each report type (email addresses)
  recipients: {
    daily:   [],                              // Daily is clipboard-only, no email
    weekly:  ['your.work@pandarg.com'],       // ← Add your work email or team email
    visit:   ['your.work@pandarg.com'],       // ← Add your work email or team email
  },

  // API proxy endpoint — your Vercel function URL
  apiEndpoint: 'https://store-reports-nu.vercel.app/api/generate',

  // EmailJS credentials — from your .env file
  emailjs: {
    serviceId:  import.meta.env.VITE_EMAILJS_SERVICE_ID  || '',
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
    publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '',
  },

  // OT thresholds (hours/week before overtime kicks in)
  // PX policy: SM/GM = 55hrs, AM = 40hrs
  otThresholds: {
    smGm: 55,
    am:   40,
  },
}

// ============================================================
//  FISCAL CALENDAR
//  Panda Express uses a 4-4-5 fiscal calendar.
//  Anchor: P7 W1 starts Monday, June 16, 2026.
//  Period week counts: P3/P6/P9/P12 have 5 weeks, rest have 4.
// ============================================================
const FISCAL_ANCHOR = new Date('2026-06-16') // P7 W1 Monday
const FISCAL_ANCHOR_PERIOD = 7
const FISCAL_ANCHOR_WEEK = 1
const PERIOD_WEEK_COUNTS = [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4] // P1–P13

// Returns { period, week } for any given Date
function getFiscalPeriodWeek(date) {
  const msPerDay  = 86400000
  const msPerWeek = 7 * msPerDay

  // Normalize to Monday of the given date's week
  const dow = (date.getDay() + 6) % 7 // Mon=0 … Sun=6
  const monday = new Date(date.getTime() - dow * msPerDay)
  monday.setHours(0, 0, 0, 0)

  const anchorMonday = new Date(FISCAL_ANCHOR)
  anchorMonday.setHours(0, 0, 0, 0)

  const weekOffset = Math.round((monday - anchorMonday) / msPerWeek)

  // Walk forward/backward from anchor
  let p = FISCAL_ANCHOR_PERIOD - 1 // 0-indexed
  let w = FISCAL_ANCHOR_WEEK - 1   // 0-indexed
  let offset = weekOffset

  while (offset > 0) {
    const weeksInPeriod = PERIOD_WEEK_COUNTS[p % 13]
    if (w + offset < weeksInPeriod) { w += offset; offset = 0 }
    else { offset -= (weeksInPeriod - w); p = (p + 1) % 13; w = 0 }
  }
  while (offset < 0) {
    if (w + offset >= 0) { w += offset; offset = 0 }
    else { offset += w + 1; p = ((p - 1) + 13) % 13; w = PERIOD_WEEK_COUNTS[p] - 1 }
  }

  return { period: (p % 13) + 1, week: w + 1 }
}

// Returns the Monday date for a given period + week
function getMondayForFiscalWeek(period, week) {
  let p = FISCAL_ANCHOR_PERIOD - 1
  let w = FISCAL_ANCHOR_WEEK - 1
  let totalWeeks = 0

  const targetP = period - 1
  const targetW = week - 1

  // Count weeks from anchor to target
  if (targetP > p || (targetP === p && targetW >= w)) {
    while (p !== targetP || w !== targetW) {
      totalWeeks++
      w++
      if (w >= PERIOD_WEEK_COUNTS[p % 13]) { w = 0; p = (p + 1) % 13 }
    }
  } else {
    while (p !== targetP || w !== targetW) {
      totalWeeks--
      if (w === 0) { p = ((p - 1) + 13) % 13; w = PERIOD_WEEK_COUNTS[p] - 1 }
      else { w-- }
    }
  }

  const monday = new Date(FISCAL_ANCHOR)
  monday.setDate(monday.getDate() + totalWeeks * 7)
  return monday
}

// ============================================================
//  DATE HELPERS
// ============================================================
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function formatShortDate(date) {
  return `${MONTHS[date.getMonth()].slice(0,3)} ${date.getDate()}`
}

// Returns yesterday's date
function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

// Returns last week's Mon–Sun
function lastWeekRange() {
  const today = new Date()
  const dow   = (today.getDay() + 6) % 7 // Mon=0
  const mon   = new Date(today)
  mon.setDate(today.getDate() - dow - 7)
  const sun   = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { monday: mon, sunday: sun }
}

// ============================================================
//  INLINE SVG ICONS (no external dependency)
// ============================================================
const Icon = {
  Daily: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Weekly: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Visit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Copy: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Send: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Check: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
}

// ============================================================
//  PROMPT BUILDERS
//  Each report type has its own system prompt and user prompt.
//  Edit these to adjust the tone or structure of generated reports.
// ============================================================

function buildDailyPrompt(form) {
  const system = `You are a report writer for ${CONFIG.managerName}, Store Manager at Panda Express #${CONFIG.storeNumber}. 
Write in first person, direct, accountable tone. Use "I" statements and "I will..." for action items.
Keep action plans to 2 bullet points max per metric. Only include sections where numbers are provided.
Do not include section headers for metrics with no data. Do not use filler phrases.`

  const gemRows = form.gemRows.filter(r => r.metric && r.actual !== '')
    .map(r => `- ${r.metric}: ${r.actual}% (target ${r.target}%, var ${r.variance >= 0 ? '+' : ''}${r.variance}%)`)
    .join('\n')

  const user = `Generate a daily metrics message for ${formatDate(form.date)}.

METRICS:
- Net Sales: $${form.netSales}
- YOY/SSS%: ${form.sss}%
- SST%: ${form.sst}%
- Check Avg: $${form.checkAvg}

GUEST EXPERIENCE METRICS:
${gemRows || 'None provided'}

${form.notes ? `ADDITIONAL NOTES:\n${form.notes}` : ''}

Output a short, clear WhatsApp-style message (no subject line, no formal greeting). 
Start with the date and store number. List each metric with its value and a brief action if off-target.
End with your name: ${CONFIG.managerName}.`

  return { system, user }
}

function buildWeeklyPrompt(form) {
  const { period, week } = form.fiscalPW
  const isWeek4 = week === PERIOD_WEEK_COUNTS[period - 1]

  const system = `You are a report writer for ${CONFIG.managerName}, Store Manager at Panda Express #${CONFIG.storeNumber}.
Write in first person, direct, accountable tone. Use "I" and "we" appropriately. "I will..." for actions.
Keep action plans to 2 concise bullets per metric. Only include sections where numbers were provided.
Write an email with a clear subject line, professional opening, metric sections, and a signature.`

  const otNote = form.directOT > 0
    ? `Direct OT: ${form.directOT} hrs (pre-approved)`
    : form.smGmOT > 0 || form.amOT > 0
    ? `Calculated OT — SM/GM: ${form.smGmOT} hrs over ${CONFIG.otThresholds.smGm}hr threshold, AM: ${form.amOT} hrs over ${CONFIG.otThresholds.am}hr threshold`
    : 'No OT this week'

  const periodSection = isWeek4 && form.periodNetSales ? `
PERIOD REPORT (P${period} Full Period):
- Net Sales: $${form.periodNetSales}
- SSS%: ${form.periodSSS}%
- SST%: ${form.periodSST}%
- Labor%: ${form.periodLabor}%
- Food Cost%: ${form.periodFoodCost}%` : ''

  const user = `Generate a weekly recap email for P${period} W${week} (${formatShortDate(form.weekStart)}–${formatShortDate(form.weekEnd)}).

WEEKLY METRICS:
- Net Sales: $${form.netSales}
- SSS%: ${form.sss}%
- SST%: ${form.sst}%
- Labor%: ${form.labor}%
- OT: ${otNote}
- Food Cost%: ${form.foodCost}%

GUEST EXPERIENCE METRICS:
${form.gemRows.filter(r => r.metric && r.actual !== '').map(r =>
  `- ${r.metric}: ${r.actual}% (target ${r.target}%, var ${r.variance >= 0 ? '+' : ''}${r.variance}%)`
).join('\n') || 'None provided'}
${periodSection}

${form.notes ? `ADDITIONAL CONTEXT:\n${form.notes}` : ''}

Subject line format: "PX ${CONFIG.storeNumber} — Weekly Recap P${period} W${week}"
Sign off as ${CONFIG.managerName}, Store Manager, PX ${CONFIG.storeNumber}.`

  return { system, user }
}

function buildVisitPrompt(form) {
  const visitorName = form.visitorType === 'aco' ? (form.visitorName || CONFIG.acoName) : (form.visitorName || CONFIG.rdoName)
  const visitTypeLabel = form.visitorType === 'aco' ? 'ACO' : 'RDO & Above'
  const auditLabel = form.auditType === 'pass'
    ? 'PASS Audit'
    : form.auditType === 'foodsafety'
    ? 'Food Safety Audit'
    : 'Overall Operations'

  const system = `You are a report writer for ${CONFIG.managerName}, Store Manager at Panda Express #${CONFIG.storeNumber}.
Write in first person, professional, accountable tone. This is a visit report documenting a leadership visit.
Summarize the visit, list observations, and provide a clear action plan. Use "I will..." for commitments.`

  const user = `Generate a visit report for a ${visitTypeLabel} visit from ${visitorName} on ${formatDate(form.visitDate)}.

AUDIT TYPE: ${auditLabel}

${form.auditType === 'pass' ? `
OPPORTUNITIES OBSERVED:
${form.opportunities || 'None noted'}

ACTIONS COMMITTED:
${form.actions || 'None noted'}
` : form.auditType === 'foodsafety' ? `
VIOLATIONS NOTED:
${form.violations || 'None noted'}

CORRECTIVE ACTIONS:
${form.actions || 'None noted'}
` : `
OPPORTUNITIES:
${form.opportunities || 'None noted'}

ACTIONS:
${form.actions || 'None noted'}
`}

${form.notes ? `ADDITIONAL NOTES:\n${form.notes}` : ''}

Write an email documenting this visit for the record.
Subject: "PX ${CONFIG.storeNumber} — ${visitTypeLabel} Visit Summary ${formatDate(form.visitDate)}"
Sign off as ${CONFIG.managerName}, Store Manager, PX ${CONFIG.storeNumber}.`

  return { system, user }
}

// Grammar check prompt — used when output is edited before approving
function buildGrammarPrompt(text) {
  return {
    system: 'You are a silent grammar and spelling corrector. Return ONLY the corrected text with no commentary, no explanation, and no markdown. Preserve all line breaks and formatting exactly.',
    user: `Correct any grammar or spelling errors in this text:\n\n${text}`,
  }
}

// ============================================================
//  API CALL — routes through the proxy function
// ============================================================
async function callClaude(system, user, maxTokens = 1000) {
  const res = await fetch(CONFIG.apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ============================================================
//  EMAIL SEND via EmailJS
//  Template variables: {{to_email}}, {{subject}}, {{body}}, {{from_name}}
//  Set these up at emailjs.com → Email Templates
// ============================================================
async function sendEmail({ to, subject, body }) {
  if (!window.emailjs) throw new Error('EmailJS not loaded')
  window.emailjs.init(CONFIG.emailjs.publicKey)
  return window.emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, {
    to_email:  to.join(', '),
    subject,
    body,
    from_name: `${CONFIG.managerName} — PX ${CONFIG.storeNumber}`,
  })
}

// ============================================================
//  FORM DEFAULTS
// ============================================================
function defaultGemRows() {
  // TOF and AOO are always shown; others are added as needed
  return [
    { id: 1, metric: 'TOF',  target: '', actual: '', variance: 0 },
    { id: 2, metric: 'AOO',  target: '', actual: '', variance: 0 },
  ]
}

function defaultDailyForm() {
  return {
    date:     yesterday(),
    netSales: '', sss: '', sst: '', checkAvg: '',
    gemRows:  defaultGemRows(),
    notes:    '',
  }
}

function defaultWeeklyForm() {
  const { monday, sunday } = lastWeekRange()
  const { period, week }   = getFiscalPeriodWeek(monday)
  return {
    weekStart:       monday,
    weekEnd:         sunday,
    fiscalPW:        { period, week },
    netSales: '', sss: '', sst: '', labor: '',
    smGmHours: '', amHours: '',
    smGmOT: 0,  amOT: 0,
    directOT: '',            // pre-approved OT (leave blank to use calculated)
    foodCost: '',
    gemRows:  defaultGemRows(),
    // Period fields (auto-show when week === last week of period)
    periodNetSales: '', periodSSS: '', periodSST: '', periodLabor: '', periodFoodCost: '',
    notes: '',
  }
}

function defaultVisitForm() {
  return {
    visitDate:    new Date(),
    visitorType:  'aco',             // 'aco' | 'rdo'
    visitorName:  '',                // overrides default name if filled
    auditType:    'pass',            // 'pass' | 'foodsafety' | 'operations'
    opportunities: '',
    violations:    '',
    actions:       '',
    notes:         '',
  }
}

// ============================================================
//  TOAST COMPONENT
// ============================================================
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  const colors = {
    success: { bg: '#16A34A', icon: '✓' },
    error:   { bg: '#D0201A', icon: '✕' },
    info:    { bg: '#2563EB', icon: 'ℹ' },
  }
  const { bg, icon } = colors[type] || colors.info

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: '#fff', padding: '10px 18px',
      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 13, fontWeight: 500, zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      animation: 'fadeIn .15s ease',
    }}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  )
}

// ============================================================
//  GEM ROWS — Guest Experience Metric input rows
// ============================================================
function GemRows({ rows, onChange }) {
  const GEM_OPTIONS = ['TOF','AOO','GEM','OSAT','Cleanliness','Speed','Accuracy','Friendliness']

  function updateRow(id, field, value) {
    const updated = rows.map(r => {
      if (r.id !== id) return r
      const next = { ...r, [field]: value }
      // Auto-calculate variance when both target and actual are present
      if (field === 'actual' || field === 'target') {
        const a = parseFloat(field === 'actual' ? value : r.actual)
        const t = parseFloat(field === 'target' ? value : r.target)
        next.variance = isNaN(a) || isNaN(t) ? 0 : Math.round((a - t) * 10) / 10
      }
      return next
    })
    onChange(updated)
  }

  function addRow() {
    const id = Date.now()
    onChange([...rows, { id, metric: '', target: '', actual: '', variance: 0 }])
  }

  function removeRow(id) {
    onChange(rows.filter(r => r.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 28px', gap: 6, alignItems: 'center' }}>
          {/* Metric selector */}
          <select value={row.metric} onChange={e => updateRow(row.id, 'metric', e.target.value)} style={selectStyle}>
            <option value="">Metric</option>
            {GEM_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input
            type="number" placeholder="Target" value={row.target}
            onChange={e => updateRow(row.id, 'target', e.target.value)}
            style={inputStyle}
          />
          <input
            type="number" placeholder="Actual" value={row.actual}
            onChange={e => updateRow(row.id, 'actual', e.target.value)}
            style={inputStyle}
          />
          {/* Variance badge — green if positive, red if negative */}
          <div style={{
            textAlign: 'center', fontSize: 12, fontWeight: 600,
            color: row.variance >= 0 ? '#16A34A' : '#D0201A',
            fontFamily: 'var(--font-mono)',
          }}>
            {row.actual !== '' && row.target !== ''
              ? `${row.variance >= 0 ? '+' : ''}${row.variance}%`
              : '—'}
          </div>
          {i >= 2 && ( // First two rows (TOF/AOO) are not removable
            <button onClick={() => removeRow(row.id)} style={iconBtnStyle} title="Remove row">
              <Icon.Trash />
            </button>
          )}
        </div>
      ))}
      <button onClick={addRow} style={{ ...ghostBtnStyle, alignSelf: 'flex-start', fontSize: 12 }}>
        <Icon.Plus /> Add metric
      </button>
    </div>
  )
}

// ============================================================
//  FORM PANELS — one per report type
// ============================================================

function DailyForm({ form, onChange }) {
  function set(field, value) { onChange({ ...form, [field]: value }) }

  // Build date dropdown: past 14 days
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 1 - i)
    return d
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Date */}
      <FormGroup label="Date">
        <select value={form.date.toDateString()} onChange={e => set('date', new Date(e.target.value))} style={selectStyle}>
          {dateOptions.map(d => (
            <option key={d.toDateString()} value={d.toDateString()}>{formatDate(d)}</option>
          ))}
        </select>
      </FormGroup>

      {/* Sales */}
      <FormSection title="Sales">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Net Sales ($)">
            <input type="number" placeholder="0.00" value={form.netSales} onChange={e => set('netSales', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="YOY / SSS%">
            <input type="number" placeholder="0.0" value={form.sss} onChange={e => set('sss', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="SST%">
            <input type="number" placeholder="0.0" value={form.sst} onChange={e => set('sst', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Check Avg ($)">
            <input type="number" placeholder="0.00" value={form.checkAvg} onChange={e => set('checkAvg', e.target.value)} style={inputStyle} />
          </FormGroup>
        </div>
      </FormSection>

      {/* GEM */}
      <FormSection title="Guest Experience">
        <GemRows rows={form.gemRows} onChange={rows => set('gemRows', rows)} />
      </FormSection>

      {/* Notes */}
      <FormGroup label="Additional notes (optional)">
        <textarea placeholder="Context, callouts, team shoutouts..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 72, resize: 'vertical' }} />
      </FormGroup>
    </div>
  )
}

function WeeklyForm({ form, onChange }) {
  function set(field, value) { onChange({ ...form, [field]: value }) }

  const isWeek4 = form.fiscalPW.week === PERIOD_WEEK_COUNTS[form.fiscalPW.period - 1]

  // Auto-calculate OT when hours change
  function handleHoursChange(field, value) {
    const updated = { ...form, [field]: value }
    const smGm = parseFloat(field === 'smGmHours' ? value : form.smGmHours) || 0
    const am   = parseFloat(field === 'amHours'   ? value : form.amHours)   || 0
    updated.smGmOT = Math.max(0, smGm - CONFIG.otThresholds.smGm)
    updated.amOT   = Math.max(0, am   - CONFIG.otThresholds.am)
    onChange(updated)
  }

  // Change fiscal period/week
  function handleFiscalChange(field, value) {
    const p = field === 'period' ? Number(value) : form.fiscalPW.period
    const w = field === 'week'   ? Number(value) : form.fiscalPW.week
    const monday = getMondayForFiscalWeek(p, w)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    onChange({ ...form, fiscalPW: { period: p, week: w }, weekStart: monday, weekEnd: sunday })
  }

  const maxWeeks = PERIOD_WEEK_COUNTS[form.fiscalPW.period - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Fiscal period / week */}
      <FormSection title="Fiscal Period">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Period">
            <select value={form.fiscalPW.period} onChange={e => handleFiscalChange('period', e.target.value)} style={selectStyle}>
              {Array.from({ length: 13 }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>P{p}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Week">
            <select value={form.fiscalPW.week} onChange={e => handleFiscalChange('week', e.target.value)} style={selectStyle}>
              {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>W{w}{w === maxWeeks ? ' (Period)' : ''}</option>
              ))}
            </select>
          </FormGroup>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          {formatShortDate(form.weekStart)} – {formatShortDate(form.weekEnd)}
        </div>
      </FormSection>

      {/* Sales */}
      <FormSection title="Weekly Sales">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Net Sales ($)">
            <input type="number" placeholder="0.00" value={form.netSales} onChange={e => set('netSales', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="SSS%">
            <input type="number" placeholder="0.0" value={form.sss} onChange={e => set('sss', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="SST%">
            <input type="number" placeholder="0.0" value={form.sst} onChange={e => set('sst', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Labor%">
            <input type="number" placeholder="0.0" value={form.labor} onChange={e => set('labor', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Food Cost%">
            <input type="number" placeholder="0.0" value={form.foodCost} onChange={e => set('foodCost', e.target.value)} style={inputStyle} />
          </FormGroup>
        </div>
      </FormSection>

      {/* OT */}
      <FormSection title="Overtime">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label={`SM/GM Hours (OT >${CONFIG.otThresholds.smGm})`}>
            <input type="number" placeholder="0" value={form.smGmHours} onChange={e => handleHoursChange('smGmHours', e.target.value)} style={inputStyle} />
          </FormGroup>
          <FormGroup label={`AM Hours (OT >${CONFIG.otThresholds.am})`}>
            <input type="number" placeholder="0" value={form.amHours} onChange={e => handleHoursChange('amHours', e.target.value)} style={inputStyle} />
          </FormGroup>
        </div>
        {/* Calculated OT display */}
        {(form.smGmOT > 0 || form.amOT > 0) && (
          <div style={{ fontSize: 12, color: '#D0201A', marginTop: 6 }}>
            Calculated OT — SM/GM: {form.smGmOT}h, AM: {form.amOT}h
          </div>
        )}
        <FormGroup label="Direct OT (pre-approved, overrides above)" style={{ marginTop: 8 }}>
          <input type="number" placeholder="Leave blank to use calculated" value={form.directOT} onChange={e => set('directOT', e.target.value)} style={inputStyle} />
        </FormGroup>
      </FormSection>

      {/* GEM */}
      <FormSection title="Guest Experience">
        <GemRows rows={form.gemRows} onChange={rows => set('gemRows', rows)} />
      </FormSection>

      {/* Period report — auto-shows on week 4 */}
      {isWeek4 && (
        <FormSection title={`Period P${form.fiscalPW.period} Summary`} accent>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            Week 4 detected — period totals included in report.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['periodNetSales', 'Net Sales ($)', '0.00'],
              ['periodSSS',      'SSS%',          '0.0'],
              ['periodSST',      'SST%',          '0.0'],
              ['periodLabor',    'Labor%',        '0.0'],
              ['periodFoodCost', 'Food Cost%',    '0.0'],
            ].map(([field, label, ph]) => (
              <FormGroup key={field} label={label}>
                <input type="number" placeholder={ph} value={form[field]} onChange={e => set(field, e.target.value)} style={inputStyle} />
              </FormGroup>
            ))}
          </div>
        </FormSection>
      )}

      <FormGroup label="Additional notes (optional)">
        <textarea placeholder="Context, callouts, highlights..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 72, resize: 'vertical' }} />
      </FormGroup>
    </div>
  )
}

function VisitForm({ form, onChange }) {
  function set(field, value) { onChange({ ...form, [field]: value }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Date */}
      <FormGroup label="Visit Date">
        <input type="date" value={form.visitDate.toISOString().split('T')[0]}
          onChange={e => set('visitDate', new Date(e.target.value + 'T12:00:00'))}
          style={inputStyle} />
      </FormGroup>

      {/* Visitor type */}
      <FormSection title="Visitor">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Type">
            <select value={form.visitorType} onChange={e => set('visitorType', e.target.value)} style={selectStyle}>
              <option value="aco">ACO</option>
              <option value="rdo">RDO & Above</option>
            </select>
          </FormGroup>
          <FormGroup label={`Name (default: ${form.visitorType === 'aco' ? CONFIG.acoName : CONFIG.rdoName})`}>
            <input type="text" placeholder="Override name..." value={form.visitorName} onChange={e => set('visitorName', e.target.value)} style={inputStyle} />
          </FormGroup>
        </div>
      </FormSection>

      {/* Audit type */}
      <FormSection title="Audit Type">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { value: 'pass',       label: 'PASS Audit' },
            { value: 'foodsafety', label: 'Food Safety' },
            { value: 'operations', label: 'Operations' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => set('auditType', opt.value)}
              style={{
                ...ghostBtnStyle,
                background:   form.auditType === opt.value ? 'var(--red)' : '',
                color:        form.auditType === opt.value ? '#fff' : '',
                borderColor:  form.auditType === opt.value ? 'var(--red)' : '',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Audit fields */}
      <FormSection title="Observations">
        {form.auditType === 'foodsafety' ? (
          <FormGroup label="Violations">
            <textarea placeholder="List violations observed..." value={form.violations} onChange={e => set('violations', e.target.value)} style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
          </FormGroup>
        ) : (
          <FormGroup label="Opportunities">
            <textarea placeholder="Areas for improvement..." value={form.opportunities} onChange={e => set('opportunities', e.target.value)} style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
          </FormGroup>
        )}
        <FormGroup label="Actions / Commitments" style={{ marginTop: 10 }}>
          <textarea placeholder="What you committed to..." value={form.actions} onChange={e => set('actions', e.target.value)} style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
        </FormGroup>
      </FormSection>

      <FormGroup label="Additional notes (optional)">
        <textarea placeholder="Any other context..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 60, resize: 'vertical' }} />
      </FormGroup>
    </div>
  )
}

// ============================================================
//  OUTPUT CARD — editable preview with approve actions
// ============================================================
function OutputCard({ output, reportType, onApprove, onConfirmEdits, status }) {
  const [editing, setEditing]   = useState(false)
  const [editText, setEditText] = useState(output)
  const textRef = useRef(null)

  useEffect(() => { setEditText(output) }, [output])

  const hasEdits = editText !== output

  function handleApprove() {
    if (hasEdits && !editing) {
      // Trigger grammar check + approve
      onApprove(editText)
    } else {
      onApprove(editText)
    }
  }

  const isDaily    = reportType === 'daily'
  const isApproved = status === 'approved'

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${hasEdits ? 'var(--amber)' : 'var(--border)'}`,
      borderTop: `3px solid ${isApproved ? 'var(--green)' : hasEdits ? 'var(--amber)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
            {isDaily ? 'Message' : 'Email Draft'}
          </span>
          {/* Status pill */}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: isApproved ? 'var(--green-bg)' : 'var(--amber-bg)',
            color:      isApproved ? 'var(--green)'    : 'var(--amber)',
          }}>
            {isApproved ? 'Approved' : 'Draft'}
          </span>
        </div>
        {!isApproved && (
          <button onClick={() => setEditing(!editing)} style={iconBtnStyle} title={editing ? 'Done editing' : 'Edit'}>
            <Icon.Edit />
          </button>
        )}
      </div>

      {/* Output text */}
      <div style={{ padding: 14 }}>
        {editing ? (
          <textarea
            ref={textRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            style={{
              ...inputStyle, width: '100%', height: 260, resize: 'vertical',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}
          />
        ) : (
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', color: 'var(--text)', lineHeight: 1.7,
          }}>
            {editText}
          </pre>
        )}
      </div>

      {/* Actions */}
      {!isApproved && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          {hasEdits && (
            <button
              onClick={() => { setEditing(false); onConfirmEdits(editText) }}
              style={{ ...secondaryBtnStyle }}
            >
              <Icon.Check /> Confirm Edits
            </button>
          )}
          <button onClick={handleApprove} style={{ ...primaryBtnStyle, marginLeft: 'auto' }}>
            {isDaily
              ? <><Icon.Copy /> Approve & Copy</>
              : <><Icon.Send /> Approve & Send</>}
          </button>
        </div>
      )}

      {/* Approved state — just copy */}
      {isApproved && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => navigator.clipboard.writeText(editText)}
            style={{ ...ghostBtnStyle, marginLeft: 'auto', fontSize: 12 }}
          >
            <Icon.Copy /> Copy
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
//  MAIN APP
// ============================================================
export default function App() {
  const [reportType,  setReportType]  = useState('daily') // 'daily' | 'weekly' | 'visit'
  const [dailyForm,   setDailyForm]   = useState(defaultDailyForm)
  const [weeklyForm,  setWeeklyForm]  = useState(defaultWeeklyForm)
  const [visitForm,   setVisitForm]   = useState(defaultVisitForm)
  const [output,      setOutput]      = useState('')
  const [status,      setStatus]      = useState('idle') // 'idle' | 'loading' | 'ready' | 'approved'
  const [toast,       setToast]       = useState(null)
  const [mobileTab,   setMobileTab]   = useState('form') // 'form' | 'preview'

  const form = reportType === 'daily' ? dailyForm : reportType === 'weekly' ? weeklyForm : visitForm
  const setForm = reportType === 'daily' ? setDailyForm : reportType === 'weekly' ? setWeeklyForm : setVisitForm

  function showToast(message, type = 'success') {
    setToast({ message, type, key: Date.now() })
  }

  // ── Generate ────────────────────────────────────────────────
  async function handleGenerate() {
    setStatus('loading')
    setOutput('')
    setMobileTab('preview')
    try {
      let system, user
      if (reportType === 'daily')  ({ system, user } = buildDailyPrompt(dailyForm))
      if (reportType === 'weekly') ({ system, user } = buildWeeklyPrompt(weeklyForm))
      if (reportType === 'visit')  ({ system, user } = buildVisitPrompt(visitForm))
      const text = await callClaude(system, user, 1200)
      setOutput(text)
      setStatus('ready')
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error')
      setStatus('idle')
    }
  }

  // ── Confirm edits (grammar check) ───────────────────────────
  async function handleConfirmEdits(editedText) {
    showToast('Checking grammar…', 'info')
    try {
      const { system, user } = buildGrammarPrompt(editedText)
      const cleaned = await callClaude(system, user, 1200)
      setOutput(cleaned)
      showToast('Edits confirmed')
    } catch {
      setOutput(editedText) // fallback: keep edits as-is
      showToast('Grammar check skipped', 'info')
    }
  }

  // ── Approve ──────────────────────────────────────────────────
  async function handleApprove(finalText) {
    if (reportType === 'daily') {
      // Daily = clipboard only
      try {
        await navigator.clipboard.writeText(finalText)
        setStatus('approved')
        showToast('Copied to clipboard')
      } catch {
        showToast('Copy failed — try manually', 'error')
      }
      return
    }

    // Weekly / Visit = send via EmailJS
    try {
      const recipients = CONFIG.recipients[reportType] || []
      if (!recipients.length) {
        showToast('No recipients configured in CONFIG', 'error')
        return
      }
      const subject = reportType === 'weekly'
        ? `PX ${CONFIG.storeNumber} — Weekly Recap P${weeklyForm.fiscalPW.period} W${weeklyForm.fiscalPW.week}`
        : `PX ${CONFIG.storeNumber} — ${visitForm.visitorType === 'aco' ? 'ACO' : 'RDO'} Visit Summary ${formatDate(visitForm.visitDate)}`

      await sendEmail({ to: recipients, subject, body: finalText })
      setStatus('approved')
      showToast('Email sent successfully')
    } catch (err) {
      showToast(err.message || 'Email failed', 'error')
    }
  }

  // ── New report ───────────────────────────────────────────────
  function handleNew() {
    setOutput('')
    setStatus('idle')
    setMobileTab('form')
    if (reportType === 'daily')  setDailyForm(defaultDailyForm())
    if (reportType === 'weekly') setWeeklyForm(defaultWeeklyForm())
    if (reportType === 'visit')  setVisitForm(defaultVisitForm())
  }

  // ── Report type switch ───────────────────────────────────────
  function switchType(type) {
    setReportType(type)
    setOutput('')
    setStatus('idle')
    setMobileTab('form')
  }

  const canGenerate = status !== 'loading'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Top bar ── */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 52,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--red)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>PX</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Store Reports</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 2 }}>#{CONFIG.storeNumber}</span>
        </div>

      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Mobile tab bar ── */}
        <style>{`
          @media (max-width: 768px) {
            .desktop-panel { display: none !important; }
            .mobile-tabs   { display: flex !important; }
          }
          @media (min-width: 769px) {
            .mobile-tabs   { display: none !important; }
            .mobile-active-form    { display: flex !important; }
            .mobile-active-preview { display: flex !important; }
          }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        `}</style>

        {/* Mobile tabs */}
        <div className="mobile-tabs" style={{
          display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          zIndex: 20, padding: '8px 16px', gap: 8,
        }}>
          {['form','preview'].map(tab => (
            <button key={tab} onClick={() => setMobileTab(tab)} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              background: mobileTab === tab ? 'var(--red)' : 'var(--bg)',
              color:      mobileTab === tab ? '#fff'       : 'var(--muted)',
            }}>
              {tab === 'form' ? 'Form' : 'Preview'}
            </button>
          ))}
        </div>

        {/* ── Left panel — Form ── */}
        <div style={{
          width: 'var(--panel-w)', minWidth: 320, background: 'var(--surface)',
          borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
          overflowY: 'auto', flexShrink: 0,
        }}
          className={mobileTab === 'form' ? 'mobile-active-form' : 'desktop-panel'}
        >
          {/* Report type switcher */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <nav style={{ display: 'flex', gap: 4 }}>
              {[
                { type: 'daily',  label: 'Daily',  Icon: Icon.Daily  },
                { type: 'weekly', label: 'Weekly', Icon: Icon.Weekly },
                { type: 'visit',  label: 'Visit',  Icon: Icon.Visit  },
              ].map(({ type, label, Icon: Ic }) => (
                <button
                  key={type}
                  onClick={() => switchType(type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, transition: 'all .15s',
                    background: reportType === type ? 'var(--red)'  : 'transparent',
                    color:      reportType === type ? '#fff'        : 'var(--muted)',
                  }}
                >
                  <Ic /> <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div style={{ padding: 20, flex: 1 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {reportType === 'daily' ? 'Daily Metrics' : reportType === 'weekly' ? 'Weekly Report' : 'Visit Report'}
            </h2>

            {reportType === 'daily'  && <DailyForm  form={dailyForm}  onChange={setDailyForm}  />}
            {reportType === 'weekly' && <WeeklyForm form={weeklyForm} onChange={setWeeklyForm} />}
            {reportType === 'visit'  && <VisitForm  form={visitForm}  onChange={setVisitForm}  />}
          </div>

          {/* Generate button */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{ ...primaryBtnStyle, width: '100%', justifyContent: 'center', opacity: canGenerate ? 1 : 0.6 }}
            >
              {status === 'loading' ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* ── Right panel — Preview ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}
          className={mobileTab === 'preview' ? 'mobile-active-preview' : 'desktop-panel'}
        >
          {status === 'idle' && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 500 }}>Fill out the form and hit Generate</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Your report will appear here</div>
            </div>
          )}

          {status === 'loading' && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 13 }}>Generating your report…</div>
            </div>
          )}

          {(status === 'ready' || status === 'approved') && output && (
            <>
              <OutputCard
                output={output}
                reportType={reportType}
                status={status}
                onApprove={handleApprove}
                onConfirmEdits={handleConfirmEdits}
              />
              {status === 'approved' && (
                <button onClick={handleNew} style={{ ...ghostBtnStyle, alignSelf: 'center' }}>
                  <Icon.Refresh /> New Report
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ============================================================
//  SHARED UI PRIMITIVES
// ============================================================
function FormGroup({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function FormSection({ title, children, accent }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
        color: accent ? 'var(--red)' : 'var(--muted)',
        borderBottom: `1px solid ${accent ? 'var(--red-light)' : 'var(--border)'}`,
        paddingBottom: 6, marginBottom: 12,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// Shared style objects
const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)',
  background: 'var(--bg)', outline: 'none',
}

const selectStyle = { ...inputStyle, cursor: 'pointer' }

const primaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', border: 'none', borderRadius: 'var(--radius)',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: 'var(--red)', color: '#fff',
}

const secondaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  cursor: 'pointer', fontSize: 13, fontWeight: 500,
  background: 'var(--bg)', color: 'var(--text)',
}

const ghostBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  cursor: 'pointer', fontSize: 13, fontWeight: 500,
  background: 'transparent', color: 'var(--muted)',
}

const iconBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, border: 'none', borderRadius: 6,
  cursor: 'pointer', background: 'transparent', color: 'var(--muted)',
}
