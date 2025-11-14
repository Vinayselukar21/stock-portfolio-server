// Fetch scraping interval values from environment or fallback to 20000 (seconds)
export const YAHOO_SCRAPE_INTERVAL = process.env.YAHOO_SCRAPE_INTERVAL
    ? parseInt(process.env.YAHOO_SCRAPE_INTERVAL, 10)
    : 20000;
export const GOOGLE_SCRAPE_INTERVAL = process.env.GOOGLE_SCRAPE_INTERVAL
    ? parseInt(process.env.GOOGLE_SCRAPE_INTERVAL, 10)
    : 20000;