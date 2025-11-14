// Import core modules and dependencies
import dotenv from "dotenv"; // To handle environment variable loading
import express from "express"; // Express framework for API and server
import { MergeScrapedData } from "./services/scraper-service"; // Service to merge Google/Yahoo and local data

// Import supporting libraries and local modules
import cors from "cors"; // Middleware to enable CORS
import { router } from "./routes";
import { ScrapeGoogleFinance } from "./scrapers/google-finance";
import { GOOGLE_SCRAPE_INTERVAL, YAHOO_SCRAPE_INTERVAL } from "./utils/envs";
import { Log } from "./utils/log";
import { google_symbols } from "./utils/portfolio-symbol-list";

// Initializing express app and setting up port
const app = express();
const PORT = process.env.PORT || 8080;

// CORS origins from environment variable, block traffic when no environment is provided
const ENVIRONMENT = process.env.ENVIRONMENT || "development";
let allowedOrigins;

if (ENVIRONMENT === "production" && process.env.ALLOWED_ORIGINS) {
    allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map(url => url.trim());
} else if (ENVIRONMENT === "development") {
    allowedOrigins = "*";
} else {
    allowedOrigins = []
}

app.use(
    cors({
        origin: allowedOrigins,
    })
);
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Run an initial Google Finance scrape on server startup
try {
    await ScrapeGoogleFinance(google_symbols);
} catch (error) {
    console.error(`[Startup] Google Finance scraping failed:`, error instanceof Error ? error.message : error);
}

// Merge data from Google and Yahoo, and cache enriched results on disk
let length = 0;
try {
    length = await MergeScrapedData();
    // Log number of stocks processed in initial run
    Log(length);
} catch (error) {
    console.error(`[Startup] MergeScrapedData failed:`, error instanceof Error ? error.message : error);
    // Log with 0 length to indicate no stocks were processed
    Log(0);
}

// Periodically fetch latest Google Finance data using a set interval (in seconds)
setInterval(async () => {
    try {
        await ScrapeGoogleFinance(google_symbols);
    } catch (error) {
        console.error(`[Periodic] Google Finance scraping failed:`, error instanceof Error ? error.message : error);
    }
}, GOOGLE_SCRAPE_INTERVAL * 1000);

// Periodically re-merge and log Yahoo Finance data at configured interval (in seconds)
setInterval(async () => {
    try {
        const length = await MergeScrapedData();
        Log(length);
    } catch (error) {
        console.error(`[Periodic] MergeScrapedData failed:`, error instanceof Error ? error.message : error);
        Log(0);
    }
}, YAHOO_SCRAPE_INTERVAL * 1000);

app.use("/api", router)

// Start the Express server and print server location to console
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
