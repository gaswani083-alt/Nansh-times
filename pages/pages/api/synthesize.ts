import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const TRUSTED = [
  'economictimes.indiatimes.com',
  'www.moneycontrol.com',
  'www.hindustantimes.com',
  'timesofindia.indiatimes.com',
  'www.thehindu.com',
  'www.ndtv.com',
  'www.bloomberg.com',
];

const PAYWALL_RX = [/subscribe/i, /paywall/i, /sign-?in/i, /metered/i];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'Missing query' });

    const CSE_ID = process.env.GOOGLE_CSE_ID as string;
    const CSE_KEY = process.env.GOOGLE_CSE_KEY as string;
    const OPENAI_KEY = process.env.OPENAI_API_KEY as string;

    if (!CSE_ID || !CSE_KEY || !OPENAI_KEY) return res.status(500).json({ error: 'Missing environment keys' });

    const searchQ = `${query} site:(${TRUSTED.join(' OR ')})`;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQ)}&cx=${CSE_ID}&key=${CSE_KEY}&num=10`;
    const search = await fetch(url).then(r => r.json());
    const items = (search.items || []).filter((i: any) => i.link);

    const docs: Array<{ url: string; title: string; text: string }> = [];
    for (const it of items) {
      try {
        const u = new URL(it.link);
        if (!TRUSTED.some(d => u.hostname.endsWith(d.replace(/^www\\./,'')))) continue;
        const html = await fetch(it.link, { headers: { 'User-Agent': 'NanshBot/1.0' }}).then(r => r.text()).catch(() => null);
        if (!html) continue;
        if (PAYWALL_RX.some(rx => rx.test(html))) continue;
        const dom = new JSDOM(html, { url: it.link });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (!article?.textContent || article.textContent.length < 400) continue;
        docs.push({ url: it.link, title: it.title || article.title, text: article.textContent.slice(0, 8000) });
        if (docs.length >= 6) break;
      } catch {}
    }

    if (docs.length === 0) {
      return res.status(200).json({
        title: `No solid coverage found for: ${query}`,
        bodyHtml: `<p>We could not locate non-paywalled reports from our trusted Indian sources for “${escapeHtml(query)}”. Try another query or broaden the topic.</p>`,
        sources: [],
        updatedAt: new Date().toISOString(),
      });
    }

    const prompt =
`You are a news writer for The Nansh Times in India. Write a clear article in simple English for a general reader. Combine the factual details from the following sources without copying any sentences. Keep it neutral and concise. Include dates, key numbers, names, and outcomes. Avoid opinions. Indian English tone.

Sources:

${docs.map((d,i)=>`[${i+1}] ${d.title} — ${d.url}
---
${d.text}`).join('\\n\\n')}`;

    const llmRes: any = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.1-mini',
        input: [
          { role: 'system', content: 'You are a helpful news summarizer. Do not quote more than 90 characters from any source.' },
          { role: 'user', content: prompt }
        ]
      })
    }).then(r => r.json());

    const article = llmRes.output_text || 'Could not generate article.';
    const bodyHtml = article
      .split('\\n')
      .map((line: string) => line.trim())
      .map((line: string) => line.startsWith('# ') ? `<h2>${escapeHtml(line.slice(2))}</h2>` : (line ? `<p>${escapeHtml(line)}</p>` : ''))
      .join('');

    res.status(200).json({
      title: `Explained: ${query}`,
      bodyHtml,
      sources: docs.map(d => ({ title: d.title, url: d.url })),
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}

function escapeHtml(s: string){
  return s.replace(/[&<>\\\"]/g,(c)=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",\"\\\"\":\"&quot;\"}[c]));
}
