import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { portfolioStocks } from "../portfolio/stocks";
import { ScrapeYahooFinance } from "../scrapers/yahoo-finance";
import type { GoogleFinanceResult } from "../types/google-finance-type";
import type { YahooScrapeResponse } from "../types/yahoo-finance-type";


export async function MergeScrapedData() {
    // 1. Prepare Yahoo symbols structure for scrapers
    const yahoo_symbols = portfolioStocks?.flatMap((stock) => ({
        symbol: stock.symbol.yahoo,
        id: stock.id,
    }));

    // 2. Scrape latest data from Yahoo Finance for each symbol.
    const yahoo_results = await ScrapeYahooFinance(yahoo_symbols);

    // 3. Read the latest Google Finance scraped results from local cache. (P/E Ratio and Latest earnings)
    const filePath = resolve(process.cwd(), "services/localcache/google-peratio-earnings-cache.json");
    const fileContents = readFileSync(filePath, "utf8");
    const google_results = JSON.parse(fileContents);

    // 4. For each Yahoo result, enrich it with Google data and portfolio info, and save to per-stock cache.
    const finalResult = yahoo_results?.map((stock: YahooScrapeResponse) => {
        // Calculate expiry time 20 seconds from now in IST (expTime) for this cache entry.
        const after20Sec = new Date(new Date().getTime() + 20 * 1000);
        const expTime = after20Sec.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
        });

        // Find corresponding result in Google scrape cache.
        const googleDataForStock = google_results?.find((s: GoogleFinanceResult) => s?.id === stock.id);

        // Find additional investment information for this stock.
        const investmentInfo = portfolioStocks?.find((s) => s?.id === stock.id);

        // Path to individual stock cache file.
        const outputPath = resolve(__dirname, "localcache", "stocks", `${stock.id}.json`);

        // Combine all relevant data into a single stock data object.
        const stockData = {
            ...stock,
            google_symbol: googleDataForStock?.google_symbol,
            peRatio: googleDataForStock?.peRatio,
            earningsPerShare: googleDataForStock?.earningsPerShare,
            expTime,
            purchasePrice: investmentInfo?.purchasePrice,
            quantity: investmentInfo?.quantity,
            investment: investmentInfo?.investment,
            portfolioPercentage: investmentInfo?.portfolioPercentage,
            sector: investmentInfo?.sector
        };

        // Ensure local cache directory exists.
        mkdirSync(dirname(outputPath), { recursive: true });

        // Store the enriched stock data as pretty-printed JSON in its own file.
        const fileContents = `${JSON.stringify(stockData, null, 2)}\n`;
        writeFileSync(outputPath, fileContents, "utf8");

        return stockData;
    });

    // 5. Return the number of stocks processed (length of result array).
    return finalResult?.length;
}
