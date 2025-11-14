// Import core modules and dependencies
import express from "express";                   // Express framework for API and server
import { mkdirSync, readFileSync, writeFileSync } from "fs";  // File system utilities
import { dirname, resolve } from "path";         // Path utilities for cross-platform compatibility
import { MergeScrapedData } from "./services/scraper-service"; // Service to merge Google/Yahoo and local data
import dotenv from "dotenv";                     // To handle environment variable loading

// Import supporting libraries and local modules
import cors from "cors";                         // Middleware to enable CORS
import { portfolioStocks } from "./portfolio/stocks";           // Portfolio configuration for stocks
import { ScrapeYahooFinance } from "./scrapers/yahoo-finance";  // Yahoo finance scraper
import { ScrapeGoogleFinance } from "./scrapers/google-finance";

// Initialize Express app instance
const app = express();

// Get port, assign from environment or use 8080 as fallback
const PORT = process.env.PORT || 8080;

// Enable CORS for frontend running at http://localhost:3000
app.use(
    cors({
        origin: "http://localhost:3000",
    })
);

// Parse environment variables from .env file
dotenv.config();

// Enable parsing of JSON and URL-encoded bodies for incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fetch scraping interval values from environment or fallback to 20000 (seconds)
const YAHOO_SCRAPE_INTERVAL = process.env.YAHOO_SCRAPE_INTERVAL
    ? parseInt(process.env.YAHOO_SCRAPE_INTERVAL, 10)
    : 20000;
const GOOGLE_SCRAPE_INTERVAL = process.env.GOOGLE_SCRAPE_INTERVAL
    ? parseInt(process.env.GOOGLE_SCRAPE_INTERVAL, 10)
    : 20000;

// Define paths for keeping logs and last sync timestamps, relative to project root
const lastSyncOutputPath = resolve(process.cwd(), `services/localcache/lastSync.txt`);
const outputPath = resolve(process.cwd(), `services/localcache/logs.txt`);

// Log function to save last sync time and data fetch summary to disk
function Log(length?: number) {
    // Get current time in IST
    const currentTime = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });

    // Write last synchronization time to lastSync.txt
    mkdirSync(dirname(lastSyncOutputPath), { recursive: true });
    writeFileSync(lastSyncOutputPath, `Last sync at: ${currentTime}`, "utf-8");

    // Append logs about how many stocks were fetched to logs.txt
    mkdirSync(dirname(outputPath), { recursive: true });
    const fileContents = `Yahoo: Prices fetched for ${length} stocks ${currentTime}\n`;
    writeFileSync(outputPath, fileContents, { encoding: "utf8", flag: "a" });
}

// Prepare Yahoo symbols in the required [{ symbol, id }, ...] structure for scrapers
export const google_symbols = portfolioStocks?.flatMap(stock => {
    return { symbol: stock.symbol.google, id: stock.id };
});
// Run an initial Google Finance scrape on server startup
await ScrapeGoogleFinance(google_symbols);
// Merge data from Google and Yahoo, and cache enriched results on disk
const length = await MergeScrapedData();

// Log number of stocks processed in initial run
Log(length);
// Periodically fetch latest Google Finance data using a set interval (in seconds)
setInterval(async () => {
    await ScrapeGoogleFinance(google_symbols);

}, GOOGLE_SCRAPE_INTERVAL * 1000);

// Periodically re-merge and log Yahoo Finance data at configured interval (in seconds)
setInterval(async () => {
    const length = await MergeScrapedData();
    Log(length);
}, YAHOO_SCRAPE_INTERVAL * 1000);

// Health check route to verify server is running
app.get("/health", (req, res) => {
    res.send("Express server is running!");
});

// Serve all stocks (combined and cached) from local directory as a single API endpoint
app.get("/stocks", (req, res) => {
    // Resolve target directory to absolute path
    const targetDir = resolve(process.cwd(), "services/localcache/stocks");

    let files: string[] = [];
    let fileContentsArr: Array<{ data: any }> = [];

    try {
        // Ensure stocks cache directory exists
        mkdirSync(targetDir, { recursive: true });

        // List all cache files in the directory
        files = require("fs").readdirSync(targetDir);

        // Read each stock cache file and parse data into array
        for (const filename of files) {
            const filePath = resolve(targetDir, filename);
            try {
                const fileContents = readFileSync(filePath, "utf8");
                const parsed = JSON.parse(fileContents);
                fileContentsArr.push(parsed);
            } catch (e) {
                // Skip and silently ignore unreadable or invalid files
            }
        }
    } catch (err) {
        // On error, return HTTP 500 with details
        return res.status(500).json({
            error: "Could not read directory.",
            details: err instanceof Error ? err.message : err,
        });
    }

    // Respond with the loaded stocks data
    res.json({
        success: true,
        data: fileContentsArr,
        message: "Stocks data fetched Successfully.",
    });
});

// Serve an SSE (Server Sent Events) stream of the stocks data every 20 seconds to clients
app.get("/stocks/stream", (req, res) => {
    // Set necessary headers for EventStream communication
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Flush headers to start SSE
    res.flushHeaders();

    // Determine the location of the stocks cache directory
    const targetDir = resolve(process.cwd(), "services/localcache/stocks");

    // Helper to write data to the stream
    function sendEvent(data: any) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Helper to load and send all stocks as an SSE event
    function RetrieveAndSendData() {
        let fileContentsArr: Array<{ data: any }> = [];
        try {
            // Ensure the cache directory exists
            mkdirSync(targetDir, { recursive: true });

            // Read filenames in the directory
            const files = require("fs").readdirSync(targetDir);

            // Read and parse each stock file for streaming
            for (const filename of files) {
                const filePath = resolve(targetDir, filename);
                try {
                    const fileContents = readFileSync(filePath, "utf8");
                    const parsed = JSON.parse(fileContents);
                    fileContentsArr.push(parsed);
                } catch (e) {
                    // Log error about this file and skip
                    console.error("Error reading:", filePath, e);
                }
            }

            // Send loaded data to all connected clients
            sendEvent(fileContentsArr);
        } catch (err) {
            // On error, send error payload over the SSE stream
            sendEvent({ error: "Could not read directory." });
        }
    }

    // Immediately send the latest data upon connection
    RetrieveAndSendData();

    // Continue sending new data every 20 seconds
    const interval = setInterval(RetrieveAndSendData, 20000);

    // Cleanup: stop the interval when client disconnects
    req.on("close", () => {
        clearInterval(interval);
        console.log("Client disconnected");
    });
});

// Start the Express server and print server location to console
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
