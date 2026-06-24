# GitHub Pages Setup Guide

## Prerequisites

1. ✅ Your code is pushed to a GitHub repository
2. ✅ API proxy is deployed to Vercel or Netlify (required — GitHub Pages can't host serverless functions)
3. ✅ EmailJS is configured

---

## Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Save

---

## Step 2: Add GitHub Secrets

GitHub Actions needs your EmailJS credentials to build the app.

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add these three secrets:

   | Name | Value |
   |------|-------|
   | `VITE_EMAILJS_SERVICE_ID` | Your EmailJS Service ID |
   | `VITE_EMAILJS_TEMPLATE_ID` | Your EmailJS Template ID |
   | `VITE_EMAILJS_PUBLIC_KEY` | Your EmailJS Public Key |

**Note:** These are **public keys** that will be bundled in your client-side code, so they're safe to add as secrets. The ANTHROPIC_API_KEY should **never** be added here — it stays on Vercel/Netlify only.

---

## Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New** → **Project**
3. Import your repository: `nandezlabs/create_reports`
4. Vercel will auto-detect the configuration — just click **Deploy**
5. Once deployed, go to **Settings** → **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key (starts with `sk-ant-`)
6. Redeploy to apply the API key

**Your Vercel URL will be:** `https://create-reports.vercel.app`

### Update API Endpoint (if different)

If Vercel gives you a different URL, update `src/App.jsx`:

```js
apiEndpoint: 'https://YOUR-PROJECT.vercel.app/api/generate',
```

---

## Step 4: Verify the Setup

Test your Vercel deployment:

```bash
curl -X POST https://create-reports.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"system":"test","max_tokens":10}'
```

You should get a response from Claude. If you get an error, check that `ANTHROPIC_API_KEY` is set in Vercel.

---

## Step 5: Push to GitHub

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

GitHub Actions will automatically:
1. Install dependencies
2. Build the Vite app
3. Deploy to GitHub Pages

---

## Step 5: Access Your Site

After deployment completes (usually 1-2 minutes), your site will be live at:

```
https://YOUR_USERNAME.github.io/store-reports/
```

You can find the exact URL in **Settings** → **Pages** → **Your site is live at...**

---

## Deployment Status

- View deployment progress: **Actions** tab in your repo
- Each push to `main` triggers a new deployment automatically
- Red ❌ = build failed (check the logs)
- Green ✅ = deployed successfully

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  GitHub Pages (Static Hosting)          │
│  https://you.github.io/store-reports    │
│                                          │
│  • React App (UI)                        │
│  • EmailJS (sends emails)                │
│  • Makes API calls to ↓                  │
└─────────────────────────────────────────┘
                  ↓
                  ↓ HTTPS request
                  ↓
┌─────────────────────────────────────────┐
│  Vercel/Netlify (Serverless Function)   │
│  /api/generate                           │
│                                          │
│  • Proxies to Anthropic API              │
│  • Keeps ANTHROPIC_API_KEY server-side   │
└─────────────────────────────────────────┘
```

---

## Troubleshooting

### Build fails in GitHub Actions
- Check the **Actions** tab for error logs
- Verify all three EmailJS secrets are added correctly
- Make sure `package.json` dependencies are correct

### Site loads but reports don't generate
- Verify `CONFIG.apiEndpoint` points to your Vercel/Netlify function URL
- Check that ANTHROPIC_API_KEY is set in Vercel/Netlify environment variables
- Test the API endpoint directly: `curl -X POST https://your-app.vercel.app/api/generate`

### 404 errors on refresh
- This is normal for SPAs on GitHub Pages (no server-side routing)
- Users should navigate from the homepage

### Styling looks broken
- Verify `base: '/store-reports/'` is set in `vite.config.js`
- Make sure the repo name matches the base path

---

## Custom Domain (Optional)

To use a custom domain like `reports.yourdomain.com`:

1. Add a `CNAME` file to `/public/CNAME` with your domain
2. Configure DNS with your domain provider:
   - Type: `CNAME`
   - Name: `reports` (or `@` for root)
   - Value: `YOUR_USERNAME.github.io`
3. Go to **Settings** → **Pages** → **Custom domain** and enter your domain
4. Wait for DNS to propagate (5-60 minutes)
5. Enable **Enforce HTTPS** once DNS verification completes

---

## Maintenance

- **Update EmailJS credentials:** Change secrets in GitHub → Settings → Secrets
- **Update API key:** Change in Vercel/Netlify environment variables (GitHub never sees it)
- **Change store config:** Edit `src/App.jsx` and push to `main`
- **View analytics:** GitHub Pages doesn't include analytics — add Google Analytics if needed

---

**All set!** Your store reports app will now auto-deploy on every push to `main`. 🚀
