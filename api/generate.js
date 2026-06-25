// ============================================================
//  api/generate.js  —  Serverless Proxy for Anthropic API
// ============================================================
//  Deploy this as a Netlify Function or Vercel Serverless Function.
//  It keeps your ANTHROPIC_API_KEY off the client (browser).
//
//  Netlify: place this file at /netlify/functions/generate.js
//           Set ANTHROPIC_API_KEY in Netlify → Site Settings → Env Variables
//
//  Vercel:  place this file at /api/generate.js (already here)
//           Set ANTHROPIC_API_KEY in Vercel → Project Settings → Env Variables
// ============================================================

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens = 1000 } = req.body;

  if (!messages || !system) {
    return res.status(400).json({ error: "Missing messages or system prompt" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY, // ← key lives here, server-side only
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", // ← change model here if needed
        max_tokens,
        system,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.error?.message || "API error" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
