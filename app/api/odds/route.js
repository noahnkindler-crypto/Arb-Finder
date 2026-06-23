export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'baseball_mlb';
  const markets = searchParams.get('markets') || 'h2h,spreads,totals';

  const apiKey = process.env.ODDS_API_KEY;

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us,eu&markets=${markets}&oddsFormat=american`;

  const res = await fetch(url);
  const data = await res.json();

  return Response.json(data);
}