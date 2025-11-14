import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import YahooFinance from "yahoo-finance2";
import type { YahooScrapeResponse } from "../types/yahoo-finance-type";

// Interface for passing symbol and id to the scraper
interface YahooScraperProps {
  symbol: string;
  id: string;
}

/**
 * Main function to scrape stock info from Yahoo Finance for a list of symbols.
 * If fetching from Yahoo Finance fails, returns data from the local cache if available,
 * otherwise returns an empty array.
 */
export async function ScrapeYahooFinance(yahoo_symbols: YahooScraperProps[]) {
  // Define cache file paths
  const outputPath = resolve(
    process.cwd(),
    "services/localcache/yahoo-stock-price-cache.json"
  );
  const yahooLastSyncOutputPath = resolve(
    process.cwd(),
    "services/localcache/yahooLastSync.txt"
  );

  // Initialize YahooFinance instance (suppress 'yahooSurvey' notices)
  const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
  });

  // Ensure directory exists for 'yahooLastSync.txt'
  mkdirSync(dirname(yahooLastSyncOutputPath), { recursive: true });

  // Save the current time as the last Yahoo sync time (IST)
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  // Try to fetch fresh data from Yahoo Finance
  let response: any[] | undefined;
  try {
    response = await Promise.all(
      yahoo_symbols.map((s) => yahooFinance.quote(s.symbol))
    );
    writeFileSync(yahooLastSyncOutputPath, `Yahoo sync at: ${currentTime}`, "utf8");
  } catch (error) {
    // Fetching from Yahoo failed -- try to return cached results
    console.error(`[Yahoo Finance Error] Failed to fetch data:`, error instanceof Error ? error.message : error);
    writeFileSync(
      yahooLastSyncOutputPath,
      `Yahoo sync failed at: ${currentTime} - ${error instanceof Error ? error.message : "Unknown error"}`,
      "utf8"
    );
    try {
      const cachedData = readFileSync(outputPath, "utf8");
      const parsed: YahooScrapeResponse[] = JSON.parse(cachedData);
      console.log(`[Yahoo Finance] Using cached data from previous run (${parsed.length} stocks)`);
      return parsed;
    } catch (cacheError) {
      console.warn(`[Yahoo Finance] No cached data available. Returning empty results.`);
      return [];
    }
  }

  // If we reach here, we got fresh data. Normalize and structure it.
  const results: YahooScrapeResponse[] =
    response?.map((stock) => {
      const id = yahoo_symbols?.find(
        (symbol) => symbol.symbol === stock?.symbol
      )?.id;
      return {
        id: id ?? "",
        exchange: stock?.fullExchangeName ?? "",
        yahoo_symbol: stock?.symbol ?? "",
        name: stock?.longName ?? "",
        shortName: stock?.shortName ?? "",
        price:
          typeof stock?.regularMarketPrice === "number"
            ? stock.regularMarketPrice
            : 0,
        currency: stock?.currency ?? ""
      };
    }) ?? [];

  // Ensure Yahoo cache directory exists and save fresh results to cache
  mkdirSync(dirname(outputPath), { recursive: true });
  const fileContents = `${JSON.stringify(results, null, 2)}\n`;
  writeFileSync(outputPath, fileContents, "utf8");

  // Return the fresh results
  return results;
}