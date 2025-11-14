import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { portfolioStocks } from "../portfolio/stocks";
import { ScrapeYahooFinance } from "../scrapers/yahoo-finance";
import type { GoogleFinanceResult } from "../types/google-finance-type";
import type { YahooScrapeResponse } from "../types/yahoo-finance-type";
import { yahoo_symbols } from "../utils/portfolio-symbol-list";


export async function MergeScrapedData() {

    // 1. Scrape latest data from Yahoo Finance for each symbol.
    let yahoo_results: YahooScrapeResponse[] = [];
    try {
        yahoo_results = await ScrapeYahooFinance(yahoo_symbols);
    } catch (error) {
        console.error(`[MergeScrapedData] Yahoo scraping failed:`, error instanceof Error ? error.message : error);
        // Continue with empty array - Google data will still be merged
    }

    // 2. Read the latest Google Finance scraped results from local cache. (P/E Ratio and Latest earnings)
    let google_results: GoogleFinanceResult[] = [];
    try {
        const filePath = resolve(process.cwd(), "services/localcache/google-peratio-earnings-cache.json");
        const fileContents = readFileSync(filePath, "utf8");
        google_results = JSON.parse(fileContents);
    } catch (error) {
        console.error(`[MergeScrapedData] Failed to read Google cache:`, error instanceof Error ? error.message : error);
        // Continue with empty array - will still create stock entries with portfolio data
    }

    // 3. Determine which stocks to process: use Yahoo results if available, otherwise fall back to portfolio stocks
    const stocksToProcess = yahoo_results.length > 0 
        ? yahoo_results.map(stock => ({ yahooData: stock, id: stock.id }))
        : portfolioStocks.map(stock => ({ yahooData: null, id: stock.id }));

    // 4. For each stock, enrich with Google data and portfolio info, and save to per-stock cache.
    const finalResult = stocksToProcess.map(({ yahooData, id }) => {
        // Calculate expiry time 20 seconds from now in IST (expTime) for this cache entry.
        const after20Sec = new Date(new Date().getTime() + 20 * 1000);
        const expTime = after20Sec.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
        });

        // Find corresponding result in Google scrape cache.
        const googleDataForStock = google_results?.find((s: GoogleFinanceResult) => s?.id === id);

        // Find additional investment information for this stock.
        const investmentInfo = portfolioStocks?.find((s) => s?.id === id);

        // Path to individual stock cache file.
        const outputPath = resolve(__dirname, "localcache", "stocks", `${id}.json`);

        // Combine all relevant data into a single stock data object.
        // If Yahoo data is unavailable, use defaults and portfolio info
        const stockData = {
            id: yahooData?.id ?? id,
            exchange: yahooData?.exchange ?? "",
            yahoo_symbol: yahooData?.yahoo_symbol ?? investmentInfo?.symbol.yahoo ?? "",
            name: yahooData?.name ?? investmentInfo?.name ?? "",
            shortName: yahooData?.shortName ?? investmentInfo?.name ?? "",
            price: yahooData?.price ?? 0,
            currency: yahooData?.currency ?? "",
            google_symbol: googleDataForStock?.google_symbol ?? investmentInfo?.symbol.google ?? "",
            peRatio: googleDataForStock?.peRatio ?? null,
            earningsPerShare: googleDataForStock?.earningsPerShare ?? null,
            expTime,
            purchasePrice: investmentInfo?.purchasePrice ?? 0,
            quantity: investmentInfo?.quantity ?? 0,
            investment: investmentInfo?.investment ?? 0,
            portfolioPercentage: investmentInfo?.portfolioPercentage ?? "",
            sector: investmentInfo?.sector ?? ""
        };

        // Ensure local cache directory exists.
        mkdirSync(dirname(outputPath), { recursive: true });

        // Store the enriched stock data as pretty-printed JSON in its own file.
        const fileContents = `${JSON.stringify(stockData, null, 2)}\n`;
        writeFileSync(outputPath, fileContents, "utf8");

        return stockData;
    });

    // 5. Return the number of stocks processed (length of result array).
    return finalResult?.length ?? 0;
}
