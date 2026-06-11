import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── DuckDuckGo Image Search (no API key needed) ─────────────────────────────
async function fetchShoeImage(query) {
  try {
    const searchQuery = query.replace(/ rep$/i, '').trim() + ' sneaker';

    // Step 1: get a vqd token from DDG (required for image search)
    const initRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!initRes.ok) return null;
    const initHtml = await initRes.text();

    // Extract the vqd token DDG requires
    const vqdMatch = initHtml.match(/vqd=["']?([\d-]+)["']?/);
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    // Step 2: hit the DDG image search API
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&vqd=${vqd}&f=,,,,,&p=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();

    // Return the first image URL
    const results = imgData?.results || [];
    for (const r of results) {
      if (r.image && r.image.startsWith('http')) {
        return r.image;
      }
    }

    return null;
  } catch (err) {
    console.error('Image fetch error:', err.message);
    return null;
  }
}

// ── Reddit image extraction ─────────────────────────────────────────────────
function extractRedditImage(post) {
  if (post.preview?.images?.[0]?.source?.url) {
    return post.preview.images[0].source.url.replace(/&amp;/g, '&');
  }
  if (post.thumbnail && post.thumbnail.startsWith('http')) {
    return post.thumbnail;
  }
  return null;
}

// ── Search endpoint ─────────────────────────────────────────────────────────
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

    // Deduplicate
    const unique = Array.from(
      new Map(results.map(r => [r.link, r])).values()
    ).slice(0, 12);

    // 3. Fetch ONE shoe image from Bing for the whole query,
    //    then share it across all cards that don't have their own image.
    //    This way we only make 1 Bing request per search, not one per card.
    const sharedImage = await fetchShoeImage(query);
    console.log(`Image for "${query}":`, sharedImage || 'none found');

    unique.forEach(item => {
      if (!item.image && sharedImage) {
        item.image = sharedImage;
      }
    });

    res.json({ items: unique });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── Reddit search ───────────────────────────────────────────────────────────
async function searchReddit(query) {
  const url = `https://www.reddit.com/r/repsneakers/search.json?q=${encodeURIComponent(query)}&limit=10&sort=top`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(8000),
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
      image: extractRedditImage(p),
    };
  }).slice(0, 3);
}

// ── Platform pricing estimates ──────────────────────────────────────────────
const PLATFORM_PRICES = {
  DHgate:     { min: 35, max: 65 },
  AliExpress: { min: 30, max: 60 },
  Weidian:    { min: 25, max: 55 },
  Taobao:     { min: 20, max: 50 },
  PandaVault: { min: 40, max: 80 },
  Reddit:     null,
};

function estimatePrice(platform) {
  const range = PLATFORM_PRICES[platform];
  if (!range) return null;
  return Math.round((range.min + range.max) / 2);
}

// ── Platform link generation ────────────────────────────────────────────────
function generatePlatformLinks(query) {
  const q = encodeURIComponent(query.replace(/ rep$/i, ''));
  const qRaw = query.replace(/ rep$/i, '');

  return [
    {
      title: `${qRaw} — DHgate`,
      link: `https://www.dhgate.com/wholesale/search.do?searchkey=${q}`,
      displayLink: 'dhgate.com',
      snippet: 'Browse verified sellers on DHgate. Filter by rating and price. Free returns available.',
      platform: 'DHgate',
      price: estimatePrice('DHgate'),
      image: null,
    },
    {
      title: `${qRaw} — AliExpress`,
      link: `https://www.aliexpress.com/wholesale?SearchText=${q}`,
      displayLink: 'aliexpress.com',
      snippet: 'Fast shipping and buyer protection. Check seller ratings and reviews before purchase.',
      platform: 'AliExpress',
      price: estimatePrice('AliExpress'),
      image: null,
    },
    {
      title: `${qRaw} — Weidian`,
      link: `https://weidian.com/?direct=true&keyword=${q}`,
      displayLink: 'weidian.com',
      snippet: 'Chinese marketplace with detailed product photos. Use Superbuy or Wegobuy as agent.',
      platform: 'Weidian',
      price: estimatePrice('Weidian'),
      image: null,
    },
    {
      title: `${qRaw} — Taobao`,
      link: `https://s.taobao.com/search?q=${q}`,
      displayLink: 'taobao.com',
      snippet: 'Requires agent like Superbuy, Wegobuy, or Cssbuy for international orders.',
      platform: 'Taobao',
      price: estimatePrice('Taobao'),
      image: null,
    },
    {
      title: `${qRaw} — PandaVault`,
      link: `https://pandavault.x.yupoo.com/search/album?uid=1&sort=&q=${q}`,
      displayLink: 'pandavault.x.yupoo.com',
      snippet: 'Curated rep catalog with QC photos and batch listings. Browse by category.',
      platform: 'PandaVault',
      price: estimatePrice('PandaVault'),
      image: null,
    },
    {
      title: `${qRaw} — r/Repsneakers`,
      link: `https://www.reddit.com/r/repsneakers/search/?q=${q}`,
      displayLink: 'reddit.com',
      snippet: 'Community reviews, W2C (Where To Cop) links, and quality comparisons.',
      platform: 'Reddit',
      price: estimatePrice('Reddit'),
      image: null,
    },
  ];
}

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Dupeify backend running on http://localhost:${PORT}`);
  console.log(`📍 Test: http://localhost:${PORT}/api/search?q=Jordan+1+Bred+rep`);
});