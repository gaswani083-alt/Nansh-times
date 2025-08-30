import { useState } from 'react';

export default function Home() {
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState<'home'|'loading'|'article'|'error'>('home');
  const [article, setArticle] = useState<any>(null);
  const [err, setErr] = useState('');

  const submit = async (e: any) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticle(data);
      setPhase('article');
    } catch (e:any) {
      setErr(e.message || 'Error');
      setPhase('error');
    }
  };

  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', background:'#f8fafc', minHeight:'100vh'}}>
      <header style={{background:'#0f172a', color:'#fff', padding:'24px 0', position:'sticky', top:0, zIndex:10}}>
        <div style={{maxWidth:960, margin:'0 auto', textAlign:'center', padding:'0 16px'}}>
          <h1 style={{fontSize:36, fontWeight:800}}>The <span style={{color:'#10b981'}}>Nansh</span> Times</h1>
        </div>
      </header>

      {phase !== 'article' && (
        <main style={{maxWidth:960, margin:'48px auto 0', padding:'0 16px'}}>
          <form onSubmit={submit} style={{display:'flex', justifyContent:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #e2e8f0', borderRadius:999, padding:'12px 16px', width:'100%', maxWidth:720, boxShadow:'0 4px 12px rgba(15,23,42,.06)'}}>
              <input
                placeholder="Search headlines, topics, symbols…"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                style={{flex:1, outline:'none', border:'none', fontSize:18}}
              />
              <button style={{background:'#10b981', color:'#fff', border:'none', borderRadius:999, padding:'8px 16px'}}>Search</button>
            </div>
          </form>
          {phase === 'loading' && (
            <div style={{textAlign:'center', marginTop:24, color:'#475569'}}>Researching trusted Indian sources…</div>
          )}
          {phase === 'error' && (
            <div style={{textAlign:'center', marginTop:24, color:'#dc2626'}}>Failed: {err}</div>
          )}
        </main>
      )}

      {phase === 'article' && article && (
        <section style={{maxWidth:960, margin:'40px auto', padding:'0 16px'}}>
          <article style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, boxShadow:'0 4px 16px rgba(15,23,42,.06)', padding:24}}>
            <div style={{fontSize:12, color:'#64748b'}}>Updated {new Date(article.updatedAt || Date.now()).toLocaleString()}</div>
            <h2 style={{fontSize:28, fontWeight:800, color:'#0f172a', marginTop:8}}>{article.title}</h2>
            <div style={{marginTop:16, color:'#334155', lineHeight:1.7}} dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
            <div style={{marginTop:24, borderTop:'1px solid #e2e8f0', paddingTop:16}}>
              <h3 style={{fontSize:14, fontWeight:700, color:'#0f172a'}}>Sources</h3>
              {article.sources?.length ? (
                <ul style={{marginTop:8, paddingLeft:18}}>
                  {article.sources.map((s:any, i:number)=>(
                    <li key={i}><a href={s.url} target="_blank" rel="noreferrer" style={{color:'#0ea5e9'}}>{s.title || s.url}</a></li>
                  ))}
                </ul>
              ) : <p style={{color:'#64748b'}}>No sources listed.</p>}
              <div style={{marginTop:16, display:'flex', gap:8}}>
                <button onClick={()=>setPhase('home')} style={{border:'1px solid #e2e8f0', borderRadius:999, padding:'8px 16px'}}>New search</button>
              </div>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
