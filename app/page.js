'use client';
import { useState } from 'react';

export default function Home() {
  const [sport, setSport] = useState('baseball_mlb');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ games: 0, arbs: 0, bestEdge: null });
  const [stake, setStake] = useState(1000);

  function americanToImplied(odds) {
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }

  async function scan() {
    setLoading(true);
    setResults([]);
    const res = await fetch(`/api/odds?sport=${sport}&markets=h2h,spreads,totals`);
    const games = await res.json();

    const arbs = [];

    for (const game of games) {
      const marketTypes = ['h2h', 'spreads', 'totals'];

      for (const marketType of marketTypes) {
        const bookOdds = game.bookmakers.map(b => {
          const market = b.markets.find(m => m.key === marketType);
          if (!market) return null;
          return { book: b.title, outcomes: market.outcomes };
        }).filter(Boolean);

        if (bookOdds.length < 2) continue;

        const outcomeNames = bookOdds[0]?.outcomes.map(o => o.name) || [];
        if (outcomeNames.length < 2) continue;

        const [side1, side2] = outcomeNames;
        let best1 = null, best2 = null;
        let best1Book = '', best2Book = '';
        let best1Odds, best2Odds;
        let best1Point, best2Point;

        for (const b of bookOdds) {
          for (const o of b.outcomes) {
            const imp = americanToImplied(o.price);
            if (o.name === side1 && (best1 === null || imp < best1)) {
              best1 = imp; best1Book = b.book; best1Odds = o.price; best1Point = o.point;
            }
            if (o.name === side2 && (best2 === null || imp < best2)) {
              best2 = imp; best2Book = b.book; best2Odds = o.price; best2Point = o.point;
            }
          }
        }

        if (best1 !== null && best2 !== null) {
          const total = best1 + best2;
          if (total < 1) {
            const edge = (1 - total) * 100;
            arbs.push({
              game: `${game.away_team} @ ${game.home_team}`,
              market: marketType,
              commence: game.commence_time,
              edge, total,
              side1, side2,
              best1Book, best2Book,
              best1Odds, best2Odds,
              best1Point, best2Point,
              best1, best2
            });
          }
        }
      }
    }

    arbs.sort((a, b) => b.edge - a.edge);
    setStats({ games: games.length, arbs: arbs.length, bestEdge: arbs[0]?.edge || null });
    setResults(arbs);
    setLoading(false);
  }

  const marketLabel = { h2h: 'Moneyline', spreads: 'Spread', totals: 'Total' };

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: '1.5rem' }}>Arb Finder</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={sport} onChange={e => setSport(e.target.value)} style={{ padding: '8px 12px', fontSize: 14 }}>
          <option value="baseball_mlb">MLB</option>
          <option value="basketball_nba">NBA</option>
          <option value="americanfootball_nfl">NFL</option>
          <option value="icehockey_nhl">NHL</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 14 }}>Stake $</label>
          <input type="number" value={stake} onChange={e => setStake(Number(e.target.value))} style={{ width: 100, padding: '8px 12px', fontSize: 14 }} />
        </div>
        <button onClick={scan} disabled={loading} style={{ padding: '8px 20px', fontSize: 14, cursor: 'pointer' }}>
          {loading ? 'Scanning...' : 'Scan for arbs'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[['Games scanned', stats.games], ['Arbs found', stats.arbs], ['Best edge', stats.bestEdge ? `+${stats.bestEdge.toFixed(2)}%` : '—']].map(([label, val]) => (
          <div key={label} style={{ background: '#f5f5f5', borderRadius: 8, padding: '1rem' }}>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 4px' }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 500, margin: 0, color: label === 'Best edge' && stats.bestEdge ? 'green' : 'inherit' }}>{val || '—'}</p>
          </div>
        ))}
      </div>

      {results.map((a, i) => {
        const s1Stake = (stake * a.best2 / (a.best1 + a.best2)).toFixed(2);
        const s2Stake = (stake * a.best1 / (a.best1 + a.best2)).toFixed(2);
        const profit = (stake * (1 / a.total - 1)).toFixed(2);
        const gameTime = new Date(a.commence).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        return (
          <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 500, margin: '0 0 2px' }}>{a.game}</p>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{gameTime} · {marketLabel[a.market]}</p>
              </div>
              <span style={{ background: '#e6f4ea', color: '#2e7d32', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 6 }}>+{a.edge.toFixed(2)}% edge</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 10 }}>
                <p style={{ color: '#666', margin: '0 0 2px' }}>{a.side1}{a.best1Point !== undefined ? ` ${a.best1Point > 0 ? '+' : ''}${a.best1Point}` : ''}</p>
                <p style={{ fontWeight: 500, margin: '0 0 2px' }}>{a.best1Odds > 0 ? '+' : ''}{a.best1Odds} — {a.best1Book}</p>
                <p style={{ color: '#666', margin: 0 }}>Stake ${s1Stake}</p>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 10 }}>
                <p style={{ color: '#666', margin: '0 0 2px' }}>{a.side2}{a.best2Point !== undefined ? ` ${a.best2Point > 0 ? '+' : ''}${a.best2Point}` : ''}</p>
                <p style={{ fontWeight: 500, margin: '0 0 2px' }}>{a.best2Odds > 0 ? '+' : ''}{a.best2Odds} — {a.best2Book}</p>
                <p style={{ color: '#666', margin: 0 }}>Stake ${s2Stake}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#2e7d32', margin: '10px 0 0' }}>Guaranteed profit on ${stake}: ${profit}</p>
          </div>
        );
      })}

      {results.length === 0 && !loading && stats.games > 0 && (
        <p style={{ color: '#666', fontSize: 14 }}>No arbs found. Markets are tight right now — try again later.</p>
      )}
    </main>
  );
}