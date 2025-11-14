# Stock Scraper Platform

Stock Scraper is a Bun-powered data collection and serving layer designed to keep a curated equity portfolio in sync with live market data. It pulls structured quotes from Yahoo Finance, enriches them with detailed valuation metrics scraped from Google Finance, and exposes both a REST API and an SSE stream for consumers that need live-ish data. Local caching, log rotation, and portfolio metadata allow the service to be deployed as a lightweight portfolio telemetry backend.

---

## System Overview

- **Scraping engines**  
  - `ScrapeYahooFinance`: calls the official `yahoo-finance2` API with rotating headers/proxies to capture price, exchange, and naming metadata.  
  - `ScrapeGoogleFinance`: performs resilient HTML scraping against google.com/finance pages to pull current P/E ratio and EPS data, rotating user agents to reduce blocking.
- **Merge pipeline** (`services/scraper-service.ts`)  
  - Reads the most recent Google scrape cache, combines it with fresh Yahoo results, enriches with portfolio attributes, and materializes one JSON document per stock under `services/localcache/stocks/`.
- **Delivery layer** (`index.ts`)  
  - Express server (running on Bun) exposes `/health`, `/stocks` (batched JSON), and `/stocks/stream` (Server-Sent Events) along with background schedulers that keep caches warm.
- **Portfolio source of truth** (`portfolio/stocks.ts`)  
  - Declarative list of holdings with identifiers, sector, weighting, and acquisition data. Drives both scrapers.
- **Local cache + observability** (`services/localcache/`)  
  - Human-readable text files for sync timestamps and append-only scrape logs, alongside structured JSON caches that make it easy to inspect the latest snapshot without hitting remote APIs.

---

## Data Flow

1. **Portfolio seed** – `portfolioStocks` provides Google and Yahoo symbols plus investment metadata for each holding.
2. **Google scrape** – `ScrapeGoogleFinance` is triggered on startup and then every `GOOGLE_SCRAPE_INTERVAL` seconds. Results are written to `services/localcache/google-peratio-earnings-cache.json` and a last-sync marker.
3. **Yahoo scrape + merge** – `MergeScrapedData` runs on startup and every `YAHOO_SCRAPE_INTERVAL` seconds. It:
   - Requests current market data via `ScrapeYahooFinance`.
   - Reads the cached Google metrics.
   - Enriches each stock with valuation metrics, investment metadata, and an expiry timestamp, then persists one file per stock under `services/localcache/stocks/<id>.json`.
   - Writes the number of stocks processed plus an IST timestamp to `services/localcache/logs.txt` and `lastSync.txt`.
4. **API delivery** – Requests to `/stocks` aggregate every cached stock file into a single payload. `/stocks/stream` pushes the same aggregate every 20 seconds over SSE, ideal for dashboards that prefer push updates.

---

## Directory Structure

```
.
├── index.ts                     # Express app, schedulers, REST + SSE endpoints
├── portfolio/
│   └── stocks.ts                # Portfolio configuration & symbols
├── scrapers/
│   ├── google-finance.ts        # Google scraper with anti-blocking strategies
│   └── yahoo-finance.ts         # Yahoo Finance client with proxy/header rotation
├── services/
│   ├── scraper-service.ts       # Merge pipeline and per-stock cache writer
│   └── localcache/              # Generated JSON snapshots, logs, sync markers
├── types/                       # Shared TypeScript interfaces
├── utils/                       # (Reserved for future helpers)
└── portfolio/portfolioStocks    # Source for scraper symbol lists
```

Generated artifacts inside `services/localcache/` are intentionally committed here for inspection but can be git-ignored in downstream deployments if desired.

---

## API Surface

| Endpoint          | Method | Description |
|-------------------|--------|-------------|
| `/health`         | GET    | Basic liveness probe (returns a string). |
| `/stocks`         | GET    | Aggregates every cached `services/localcache/stocks/*.json` entry and returns `{ success, data, message }`. |
| `/stocks/stream`  | GET    | Server-Sent Events feed that emits the aggregated stock array immediately and every 20s thereafter. |

All responses already include merged Google/Yahoo metrics plus investment metadata: purchase price, quantity, and portfolio percentage. Consumers do not need to join across files.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Express server port. |
| `YAHOO_SCRAPE_INTERVAL` | `20000` seconds | Frequency for Yahoo fetch + merge cycle. |
| `GOOGLE_SCRAPE_INTERVAL` | `20000` seconds | Frequency for Google scrape refresh. |
| `YAHOO_HEADER_VARIANTS` | *(optional JSON array)* | Overrides default header rotation for Yahoo requests. |
| `YAHOO_PROXY_LIST` | *(optional comma-separated URLs)* | Enables proxy rotation for Yahoo calls. |

Create a `.env` file in the project root (loaded via `dotenv`) to override defaults.

---

## Getting Started

1. **Install Bun (if needed)**  
   Follow https://bun.sh to install Bun ≥ 1.3.

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **(Optional) Configure environment**
   ```bash
   cp .env.example .env   # if/when an example file is provided
   # edit .env to set PORT or scrape intervals
   ```

4. **Run the service**
   ```bash
   bun run index.ts
   ```
   The server logs each scrape in `services/localcache/logs.txt` and prints the listening URL (`http://localhost:PORT`).

5. **Monitor data**
   - Browse `services/localcache/stocks/` to inspect enriched per-stock JSON.
   - Hit `http://localhost:8080/stocks` (or your configured port) for the aggregated API response.
   - Consume `http://localhost:8080/stocks/stream` using an SSE-capable client for auto-refreshing dashboards.

---

## Extending the Portfolio

1. Add a new stock entry to `portfolio/stocks.ts` with a unique `id`, Google/Yahoo tickers, and investment metadata.
2. Restart the service (or wait for the next scrape cycle). The new stock will automatically be scraped, merged, cached, and published via the API/stream.

---

## Operational Notes

- **Caching & durability**: All scrape outputs live in `services/localcache/`, making failures recoverable between restarts and enabling offline inspection. Consider mounting a persistent volume when deploying to containers.
- **Rate limiting**: Yahoo calls leverage rotating headers and optional proxy lists. Google scraping cycles through multiple user agents and introduces randomized backoff.
- **Time zones**: All timestamps written to disk use `Asia/Kolkata` for quick readability in IST environments.
- **Security**: The `/stocks` endpoint currently exposes the entire portfolio dataset to any caller with access to the server. Front the service with authentication if required.

---

## Tooling & Dependencies

- Runtime: [Bun](https://bun.sh) with native TypeScript execution.
- Web server: `express@5` with `cors` for local development.
- HTTP clients: native `fetch` for Google scraping, `axios` + `yahoo-finance2` for Yahoo data with proxy/header rotation plumbing.
- Type definitions: colocated under `types/` to keep scraper outputs strongly typed.

---

## Future Enhancements (Ideas)

- Persist caches in Redis or SQLite for horizontal scalability.
- Add WebSocket support or GraphQL endpoints for richer clients.
- Implement alerting based on price thresholds or valuation bands.
- Integrate structured logging/metrics (e.g., pino + OpenTelemetry).
- Containerize with a lightweight Bun-based base image for deployment.

---

With this README you should be able to understand the architecture, configure scrape behavior, and run the Stock Scraper platform locally or in production. Feel free to extend the portfolio or plug the API into dashboards, alerting systems, or personal finance tooling.
