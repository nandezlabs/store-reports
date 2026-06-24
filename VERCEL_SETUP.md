# Vercel Deployment Guide

Quick guide to deploy the API proxy to Vercel.

---

## 1. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New** → **Project**
4. Search for and select: **nandezlabs/create_reports**
5. Keep all default settings (Vercel auto-detects Vite)
6. Click **Deploy**

Vercel will build and deploy in ~1 minute.

---

## 2. Add Environment Variable

After the first deploy:

1. Go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Your Anthropic API key (get it from [console.anthropic.com](https://console.anthropic.com))
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**

---

## 3. Redeploy

After adding the API key:

1. Go to **Deployments** tab
2. Click **...** (three dots) on the latest deployment
3. Click **Redeploy**

OR just push a new commit to GitHub — Vercel auto-deploys.

---

## 4. Get Your Vercel URL

Your API will be available at:

```
https://create-reports.vercel.app/api/generate
```

(Or whatever custom domain Vercel assigns)

---

## 5. Verify It Works

Test the API endpoint:

```bash
curl -X POST https://create-reports.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hi in 3 words"}],
    "system": "You are a helpful assistant.",
    "max_tokens": 20
  }'
```

You should get a JSON response with Claude's reply. If you get an error:
- ❌ **"Missing API key"** → Add `ANTHROPIC_API_KEY` in Vercel settings
- ❌ **"Invalid API key"** → Check your key at console.anthropic.com
- ❌ **404** → Make sure `/api/generate.js` exists in your repo

---

## 6. Update App.jsx (Already Done ✅)

The `apiEndpoint` in `src/App.jsx` is already set to:

```js
apiEndpoint: 'https://create-reports.vercel.app/api/generate',
```

If Vercel assigns a different URL, update it here.

---

## 7. Test Locally (Optional)

To test with the production Vercel API:

```bash
npm run dev
```

Open http://localhost:5173 and try generating a report. It will use your Vercel API.

To test with a local API proxy instead:
1. Create a `.env` file with `ANTHROPIC_API_KEY=sk-ant-...`
2. Update `apiEndpoint` in App.jsx to `'/api/generate'`
3. Configure Vite to proxy requests (add to `vite.config.js`):

```js
export default defineConfig({
  plugins: [react()],
  base: '/store-reports/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

4. Run a local serverless function emulator (Vercel CLI)

---

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- Push to `main` → Production deployment
- Push to other branches → Preview deployment
- Every commit gets a unique URL for testing

---

## Custom Domain (Optional)

To use a custom domain like `reports.yourdomain.com`:

1. Go to **Settings** → **Domains**
2. Add your domain
3. Configure DNS with your provider:
   - Type: `CNAME`
   - Name: `reports` (or `@` for root)
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (5-60 minutes)
5. Vercel automatically provisions SSL

Then update `apiEndpoint` in App.jsx to your custom domain.

---

## Troubleshooting

### "Function execution timed out"
- Anthropic API might be slow. Increase timeout in `api/generate.js`:
  ```js
  export const config = {
    maxDuration: 30, // seconds
  }
  ```

### "Rate limit exceeded"
- You've hit Anthropic's free tier limits
- Upgrade your Anthropic plan or wait for the limit to reset

### CORS errors
- Vercel functions automatically handle CORS
- Make sure you're calling the correct URL with `https://`

### Environment variable not working
- Make sure you redeployed after adding the variable
- Check the variable name matches exactly: `ANTHROPIC_API_KEY`
- Verify in **Settings** → **Environment Variables**

---

**All set!** Your API proxy is now live on Vercel. 🚀
