# Dupeify — Replica Shoe Finder

A simple, fast web app to find replica shoes across popular platforms (DHgate, AliExpress, Weidian, Taobao, Reddit). No API keys needed — just search and browse.

## Tech Stack

- **Frontend:** Vanilla JavaScript + HTML + CSS (zero dependencies)
- **Backend:** Node.js + Express
- **Data sources:** Reddit API (r/repsneakers) + direct platform links

## Local Setup (3 steps)

### 1. Install dependencies
```bash
npm install
```

### 2. Start the backend
```bash
npm start
```

The backend will run at `http://localhost:5000`

### 3. Open the app
Open `repfinder.html` in your browser (file:// works locally). Search for any shoe, and results appear immediately.

## How It Works

1. You type a shoe query (e.g., "Jordan 1 Bred rep")
2. Frontend calls the backend at `/api/search?q=...`
3. Backend fetches from Reddit's r/repsneakers community + builds direct platform links
4. Results show up with filtering and sorting by price

## Deploy to Production

### Option A: Deploy backend to Railway (recommended — free tier works)

1. Install Railway CLI: `brew install railway`
2. Login: `railway login`
3. Create project: `railway init`
4. Deploy: `railway up`
5. Get your deployed URL from Railway dashboard
6. Update `BACKEND_URL` in `repfinder.html` to your Railway URL
7. Deploy frontend to Netlify or Vercel (free)

### Option B: Deploy to Render (also free)

1. Push code to GitHub
2. Connect Render to GitHub repo
3. Create new Web Service
4. Set start command to `npm start`
5. Copy deployed URL, update `BACKEND_URL` in HTML

### Option C: Deploy everything to Vercel (frontend only)

Since the backend is lightweight, you can run it serverless on Vercel Functions:
- Update backend to use Vercel Functions format
- Deploy HTML + backend together
- Single URL for everything

## Files

- `repfinder.html` — Main UI (embedded JavaScript + CSS)
- `server.js` — Express backend with search endpoint
- `package.json` — Dependencies (Express, CORS, node-fetch)
- `style.css` — (embedded in HTML for simplicity)
- `app.js` — Empty (can be used later for organization)

## Next Steps

- Add real image thumbnails from listings
- Implement price scraping (optional — requires BeautifulSoup in Python sidecar or Playwright)
- Add more platforms (Superbuy, Wegobuy direct links)
- Add sorting by seller rating
- Create a database to cache results (faster searches)

## License

MIT
