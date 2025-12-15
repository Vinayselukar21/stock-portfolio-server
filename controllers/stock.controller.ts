import type { Request, Response } from "express-serve-static-core";
import { mkdirSync, readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

// Helper that runs the cache-fill logic (from index.ts:122-134)
import { ScrapeGoogleFinance } from "../scrapers/google-finance";
import { MergeScrapedData } from "../services/scraper-service";
import { Log } from "../utils/log";
import { google_symbols } from "../utils/portfolio-symbol-list";

async function fillLocalCacheIfMissing(targetDir: string) {
    // If directory does not exist or is empty
    let shouldFillCache = false;

    if (!existsSync(targetDir)) {
        shouldFillCache = true;
    } else {
        // Directory exists but may be empty
        try {
            const files = readdirSync(targetDir);
            if (!files.length) shouldFillCache = true;
        } catch {
            shouldFillCache = true;
        }
    }

    if (shouldFillCache) {
        try {
            await ScrapeGoogleFinance(google_symbols);
        } catch (e) {
            // Optionally log, but continue anyway
            console.error("[AutoFill] Google Finance scrape failed:", e);
        }

        try {
            const length = await MergeScrapedData();
            Log(length);
        } catch (e) {
            console.error("[AutoFill] MergeScrapedData failed:", e);
            Log(0);
        }
    }
}

const GetStockPrice = async (req: Request, res: Response) => {
    // Resolve target directory to absolute path
    const targetDir = resolve(process.cwd(), "services/localcache/stocks");

    try {
        await fillLocalCacheIfMissing(targetDir);

        // Ensure stocks cache directory exists (mkdirSync is idempotent)
        mkdirSync(targetDir, { recursive: true });

        // List all cache files in the directory
        const files = readdirSync(targetDir);

        // Read each stock cache file and parse data into array
        const fileContentsArr: Array<{ data: any }> = [];
        for (const filename of files) {
            const filePath = resolve(targetDir, filename);
            try {
                const fileContents = readFileSync(filePath, "utf8");
                const parsed = JSON.parse(fileContents);
                fileContentsArr.push(parsed);
            } catch {
                // Skip and silently ignore unreadable or invalid files
            }
        }

        // Respond with the loaded stocks data
        return res.json({
            success: true,
            data: fileContentsArr,
            message: "Stocks data fetched Successfully.",
        });
    } catch (err) {
        // On error, return HTTP 500 with details
        return res.status(500).json({
            error: "Could not read directory.",
            details: err instanceof Error ? err.message : err,
        });
    }
};

export default GetStockPrice;