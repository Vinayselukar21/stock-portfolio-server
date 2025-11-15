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

// Helper for India market hours (NSE/BSE)
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MIN = 15;
const MARKET_CLOSE_HOUR = 15;
const MARKET_CLOSE_MIN = 30;
const MARKET_DAYS = [1, 2, 3, 4, 5]; // Monday-Friday

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
    scheduleMarketJobController(); // 👈 Start the market job controller AFTER server is live
});

// --- Helpers for market timings ---
function getIndiaTime() {
    // India Standard Time = UTC+5:30
    const nowUTC = new Date();
    // convert to millis in IST
    const utcOffset = nowUTC.getTime() + (330 * 60 * 1000); // 330 min = 5h30m
    const istNow = new Date(utcOffset);
    return istNow;
}

function isMarketOpenNow() {
    const now = getIndiaTime();
    const day = now.getUTCDay(); // Sunday=0, Monday=1, ..., Saturday=6 (but IST date)
    if (!MARKET_DAYS.includes(day)) {
        return false;
    }
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // Market opens at 9:15, closes at 15:30 IST.
    if (
        (hour > MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR) ||
        (hour === MARKET_OPEN_HOUR && minute >= MARKET_OPEN_MIN) ||
        (hour === MARKET_CLOSE_HOUR && minute < MARKET_CLOSE_MIN)
    ) {
        return true;
    }
    return false;
}

let googleInterval: NodeJS.Timeout | null = null;
let yahooInterval: NodeJS.Timeout | null = null;

// Controller that starts/stops jobs as per India stock market time
function scheduleMarketJobController() {
    console.log("🚀 Scheduling Jobs... 📈")
    // Check every minute whether to start/stop the jobs
    setInterval(marketJobControlLoop, 15 * 60 * 1000);
    // Run on startup
    marketJobControlLoop();
}

async function marketJobControlLoop() {
    if (isMarketOpenNow()) {
        console.log("Market Open - Scrapers Active... ✅")
        if (!googleInterval && !yahooInterval) {
            console.log("[Market] Market open! Starting background jobs...");
            await startBackgroundJobs();
        }
    } else {
        console.log("Market Closed - Scrapers Inactive... ❌")
        // Market is closed, stop if they are running
        if (googleInterval || yahooInterval) {
            console.log("[Market] Market closed! Stopping background jobs...");
            stopBackgroundJobs();
        }
    }
}

async function startBackgroundJobs() {
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
    googleInterval = setInterval(async () => {
        try {
            await ScrapeGoogleFinance(google_symbols);
        } catch (error) {
            console.error("[Periodic] Google Finance scrape failed:", error);
        }
    }, GOOGLE_SCRAPE_INTERVAL * 1000);

    // Yahoo merge scheduled scraping
    yahooInterval = setInterval(async () => {
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

function stopBackgroundJobs() {
    if (googleInterval) {
        clearInterval(googleInterval);
        googleInterval = null;
    }
    if (yahooInterval) {
        clearInterval(yahooInterval);
        yahooInterval = null;
    }
    console.log("[Market] All background jobs stopped.");
}
