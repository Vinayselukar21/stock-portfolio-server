import dotenv from "dotenv";
dotenv.config(); // ✅ Load env FIRST

import express from "express";
import { MergeScrapedData } from "./services/scraper-service";
import cors from "cors";
import { router } from "./routes";
import { ScrapeGoogleFinance } from "./scrapers/google-finance";
import { GOOGLE_SCRAPE_INTERVAL, YAHOO_SCRAPE_INTERVAL } from "./utils/envs";
import { Log } from "./utils/log";
import { google_symbols } from "./utils/portfolio-symbol-list";

const app = express();
const PORT = process.env.PORT || 8080;

// CORS setup
const ENVIRONMENT = process.env.ENVIRONMENT || "development";
let allowedOrigins;

if (ENVIRONMENT === "production" && process.env.ALLOWED_ORIGINS) {
    allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map(url => url.trim());
} else if (ENVIRONMENT === "development") {
    allowedOrigins = "*";
} else {
    allowedOrigins = [];
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startBackgroundJobs(); // 👈 Start scrapers AFTER server is live
});

async function startBackgroundJobs() {
    console.log("[Startup] Initial scrapes starting...");

    try {
        await ScrapeGoogleFinance(google_symbols);
    } catch (e) {
        console.error("[Startup] Google Finance scrape failed:", e);
    }

    try {
        const length = await MergeScrapedData();
        Log(length);
    } catch (e) {
        console.error("[Startup] MergeScrapedData failed:", e);
        Log(0);
    }

    // Google Finance scheduled scraping
    setInterval(async () => {
        try {
            await ScrapeGoogleFinance(google_symbols);
        } catch (error) {
            console.error("[Periodic] Google Finance scrape failed:", error);
        }
    }, GOOGLE_SCRAPE_INTERVAL * 1000);

    // Yahoo merge scheduled scraping
    setInterval(async () => {
        try {
            const length = await MergeScrapedData();
            Log(length);
        } catch (error) {
            console.error("[Periodic] MergeScrapedData failed:", error);
            Log(0);
        }
    }, YAHOO_SCRAPE_INTERVAL * 1000);

    console.log("[Startup] Background jobs initialized.");
}
