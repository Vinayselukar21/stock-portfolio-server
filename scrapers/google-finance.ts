import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import type { GoogleFinanceResult } from "../types/google-finance-type";

interface GoogleScraperProps {
  symbol: string;
  id: string;
}

function extractFinancials(htmlContent: string) {
  // Extract P/E ratio using a regex that matches its location on the page
  const peRatioMatch = htmlContent.match(
    /P\/E\s+ratio[\s\S]*?<div\s+class=["']P6K39c["'][^>]*>([^<]+)<\/div>/
  );
  // Extract earnings per share using a regex that matches its location on the page
  const epsMatch = htmlContent.match(
    /Earnings\s+per\s+share[\s\S]*?<td\s+class=["']QXDnM["'][^>]*>([^<]+)<\/td>/
  );

  // Assign trimmed values or null if not found
  const peRatio = peRatioMatch?.[1]?.trim() ?? null;
  const earningsPerShare = epsMatch?.[1]?.trim() ?? null;

  return { peRatio, earningsPerShare };
}

async function main(props: GoogleScraperProps) {
  // Form URL to fetch, override via command-line argument if present
  const targetUrl = process.argv[2] ?? `https://www.google.com/finance/quote/${props.symbol}`;

  let htmlContent: string;
  try {
    // Fetch the web page without custom headers or proxies
    const response = await fetch(targetUrl);

    // Throw error if status code is not OK (2xx)
    if (!response.ok) {
      throw new Error(`Failed fetch, status: ${response.status}`);
    }

    // Get the HTML as text
    htmlContent = await response.text();
  } catch (error) {
    // Output error details to stderr
    console.error(`Failed to fetch for ${targetUrl}`);
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }

  // Extract the raw financial fields from HTML
  const { peRatio, earningsPerShare } = extractFinancials(htmlContent);

  // Ensure that both pieces of required financial information were successfully extracted
  if (!peRatio || !earningsPerShare) {
    console.error("Could not extract required data from HTML:");
    if (!peRatio) console.error("  - P/E ratio not found");
    if (!earningsPerShare) console.error("  - Earnings per share not found");
    console.error(`URL: ${targetUrl}`);
    throw new Error("Required financial data missing in HTML.");
  }

  // Try to parse numerical values, fallback to null if parsing fails
  const peRatioNum = peRatio ? parseFloat(peRatio) : null;
  const epsNum = earningsPerShare ? parseFloat(earningsPerShare) : null;

  // Build the result object as specified by the type interface
  const result: GoogleFinanceResult = {
    id: props.id,
    google_url: targetUrl,
    google_symbol: props.symbol,
    peRatio: {
      raw: peRatio,
      numeric: peRatioNum
    },
    earningsPerShare: {
      raw: earningsPerShare,
      numeric: epsNum
    }
  };

  return result;
}

export async function ScrapeGoogleFinance(google_symbols: GoogleScraperProps[]) {

  // Resolve path where scraped Google Finance data will be cached to disk (JSON file)
  const outputPath = resolve(
    process.cwd(),
    "services/localcache/google-peratio-earnings-cache.json"
  );

  // Resolve path where the last Google Finance sync time will be saved
  const googleLastSyncOutputPath = resolve(
    process.cwd(),
    "services/localcache/googleLastSync.txt"
  );

  // For every symbol, invoke 'main' to fetch and parse the data in parallel;
  // if scraping fails for a symbol, store null
  const scrapedData = await Promise.all(
    google_symbols.map(async (s) => {
      try {
        return await main(s);
      } catch (error) {
        // On failure, return null for this item
        return null;
      }
    })
  );

  // Make sure the sync file's directory exists; create if not
  mkdirSync(dirname(googleLastSyncOutputPath), { recursive: true });

  // Record the current time (IST zone) as the last successful Google sync timestamp
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata"
  });
  writeFileSync(googleLastSyncOutputPath, `Google sync at: ${currentTime}`, "utf8");

  // Ensure the cache directory for scraped results also exists
  mkdirSync(dirname(outputPath), { recursive: true });

  // Save the fetched and parsed Google Finance results as pretty-printed JSON to a cache file
  const fileContents = `${JSON.stringify(scrapedData, null, 2)}\n`;
  writeFileSync(outputPath, fileContents, "utf8");

  // Return only the successfully scraped (non-null) results
  return scrapedData.filter(Boolean);
}
