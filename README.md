# The Nansh Times — One-Click Demo

A self-contained Next.js app that has:
- A homepage with a Google-like search box and clean article layout.
- A built-in serverless API (`/api/synthesize`) that searches trusted Indian publishers,
  extracts article text (non-paywalled), and asks an LLM to write a fresh, simple-English
  article with citations.

## Quick Start

```bash
npm i
cp .env.example .env.local
# edit .env.local with keys
npm run dev
# open http://localhost:3000
```

## Environment

```
GOOGLE_CSE_ID=your_google_cse_id
GOOGLE_CSE_KEY=your_google_cse_key
OPENAI_API_KEY=your_openai_key
```

> Note: This app avoids copying full articles, respects paywalls (skips), and cites sources.
