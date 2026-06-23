'use client';
import { useState } from 'react';

export default function Home() {
  const [sport, setSport] = useState('baseball_mlb');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ games: 0, arbs: 0, bestEdge: null });

  function americanToImplied(odds) {
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }

  async function scan() {
    setLoading(true);
    setResults([]);
    const res = await fetch(`/api/odds?sport=${sport}`);
    const games = await res.json();

    const arbs = [];

    for (const game of games) {
      const h2h = game.bookmakers.map(b => {
        const market = b.markets.find(m => m.key === 'h2h');
        if (!market) return null;
        return { book: b.title, outcomes: market.outcomes };
      }).filter(Boolean);

      if (h2h.length < 2) continue;

      const teamNames = game.bookmakers[0]?.markets[0]?.outcomes.map(o => o.name) || [];
      if (teamNames.length < 2) continue;

      const [home, away] = teamNames;
      let bestHome = null, bestAway = null;
      let bestHomeBook = '', bestAwayBook = '';
      let bestHomeOdds, bestAwayOdds;

      for (const b of h2h) {
        for (const o of b.outcomes) {
          const imp = americanToImplied(o.price);
          if (o.name === home && (bestHome === null || imp < bestHome)) {
            bestHome = imp; bestHomeBook = b.book; bestHomeOdds = o.price;
          }
          if (o.name === away && (bestAway === null || imp < bestAway)) {
            bestAway = imp; bestAwayBook = b.book; bestAwayOdds = o.price;
          }
        }
      }

      if (bestHome !== null && bestAway !== null) {
        const total = bestHome + bestAway;
        if (total < 1) {
          const edge = (1 - total) * 100;
          arbs.push({
            game: `${away} @ ${home}`,
            commence: game.commence_time,
            edge, total,
            home, away,
            bestHomeBook, bestAwayBook,
            bestHomeOdds, bestAwayOdds,
            bestHome, bestAway
          });
        }
      }
    }

    arbs.sort((a, b) => b.edge - a.edge);
    setStats({ games: games.length, arbs: arbs.length, bestEdge: arbs[0]?.edge || null });
    setResults(arbs);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: '1.5rem' }}>Arb Finder</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem' }}>
        <select value={sport} onChange={e => setSport(e.target.value)} style={{ padding: '8px 12px', fontSize: 14 }}>
          <option value="baseball_mlb">MLB</option>
          <option value="basketball_nba">NBA</option>
          <option value="americanfootball_nfl">NFL</option>
          <option value="icehockey_nhl">NHL</option>
        </select>
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
        const stake = 1000;
        const homeStake = (stake * a.bestAway / (a.bestHome + a.bestAway)).toFixed(2);
        const awayStake = (stake * a.bestHome / (a.bestHome + a.bestAway)).toFixed(2);
        const profit = (stake * (1 / a.total - 1)).toFixed(2);
        const gameTime = new Date(a.commence).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        return (
          <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 500, margin: '0 0 2px' }}>{a.game}</p>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{gameTime}</p>
              </div>
              <span style={{ background: '#e6f4ea', color: '#2e7d32', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 6 }}>+{a.edge.toFixed(2)}% edge</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 10 }}>
                <p style={{ color: '#666', margin: '0 0 2px' }}>{a.home}</p>
                <p style={{ fontWeight: 500, margin: '0 0 2px' }}>{a.bestHomeOdds > 0 ? '+' : ''}{a.bestHomeOdds} — {a.bestHomeBook}</p>
                <p style={{ color: '#666', margin: 0 }}>Stake ${homeStake}</p>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 10 }}>
                <p style={{ color: '#666', margin: '0 0 2px' }}>{a.away}</p>
                <p style={{ fontWeight: 500, margin: '0 0 2px' }}>{a.bestAwayOdds > 0 ? '+' : ''}{a.bestAwayOdds} — {a.bestAwayBook}</p>
                <p style={{ color: '#666', margin: 0 }}>Stake ${awayStake}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#2e7d32', margin: '10px 0 0' }}>Guaranteed profit on $1000: ${profit}</p>
          </div>
        );
      })}
    </main>
  );
}