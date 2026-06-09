import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Platform icons
const PLATFORM_ICONS = {
  "DHgate": "🛒",
  "Reddit": "💬",
  "Superbuy": "📦",
  "Wegobuy": "📦",
  "Weidian": "🏪",
  "Taobao": "🏪",
  "AliExpress": "🛍️",
  "Web": "🌐"
};

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.status(400).json({ error: 'Query required' });
    }

    const results = [];

    // 1. Fetch from Reddit r/repsneakers
    try {
      const redditResults = await searchReddit(query);
      results.push(...redditResults);
    } catch (err) {
      console.error('Reddit fetch error:', err.message);
    }

    // 2. Add direct links to popular platforms
    const platformLinks = generatePlatformLinks(query);
    results.push(...platformLinks);

    // Deduplicate and limit results
    const unique = Array.from(
      new Map(results.map(r => [r.link, r])).values()
    ).slice(0, 8);

    res.json({ items: unique });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Fetch from Reddit API
async function searchReddit(query) {
  const url = `https://www.reddit.com/r/repsneakers/search.json?q=${encodeURIComponent(query)}&limit=10&sort=top`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Dupeify-Bot/1.0' }
  });

  if (!response.ok) throw new Error(`Reddit API: ${response.status}`);
  const data = await response.json();

  return (data.data?.children || []).map((post) => {
    const p = post.data;
    return {
      title: p.title,
      link: `https://reddit.com${p.permalink}`,
      displayLink: 'reddit.com',
      snippet: p.selftext?.substring(0, 150) || 'Community discussion on replica quality and where to buy.',
      platform: 'Reddit',
      price: null,
      image: null
    };
  }).slice(0, 3); // Return top 3 Reddit posts
}

// Generate direct platform links
function generatePlatformLinks(query) {
  const links = [];
  const q = encodeURIComponent(query.replace(/ rep$/, ''));

  // DHgate
  links.push({
    title: `${query} - DHgate`,
    link: `https://www.dhgate.com/wholesale/search.do?searchkey=${q}`,
    displayLink: 'dhgate.com',
    snippet: 'Browse verified sellers on DHgate. Filter by rating and price. Free returns available.',
    platform: 'DHgate',
    price: null,
    image: null
  });

  // AliExpress
  links.push({
    title: `${query} - AliExpress`,
    link: `https://www.aliexpress.com/wholesale?SearchText=${q}`,
    displayLink: 'aliexpress.com',
    snippet: 'Fast shipping and buyer protection. Check seller ratings and reviews before purchase.',
    platform: 'AliExpress',
    price: null,
    image: null
  });

  // Weidian
  links.push({
    title: `${query} - Weidian`,
    link: `https://weidian.com/?direct=true&keyword=${q}`,
    displayLink: 'weidian.com',
    snippet: 'Chinese marketplace. WeChat required for direct communication with sellers.',
    platform: 'Weidian',
    price: null,
    image: null
  });

  // Taobao
  links.push({
    title: `${query} - Taobao`,
    link: `https://s.taobao.com/search?q=${q}`,
    displayLink: 'taobao.com',
    snippet: 'Requires agent like Superbuy, Wegobuy, or Cssbuy for international orders.',
    platform: 'Taobao',
    price: null,
    image: null
  });

  // Reddit search
  links.push({
    title: `${query} - r/Repsneakers`,
    link: `https://www.reddit.com/r/repsneakers/search/?q=${q}`,
    displayLink: 'reddit.com',
    snippet: 'Community reviews, W2C (Where To Cop) links, and quality comparisons.',
    platform: 'Reddit',
    price: null,
    image: null
  });

  return links;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Dupeify backend running on http://localhost:${PORT}`);
  console.log(`📍 Search endpoint: GET http://localhost:${PORT}/api/search?q=Jordan%201%20Bred%20rep`);
});
