// Import path utilities to get current script's file path and directory name
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
// Import the interface for Google Finance results
import type { GoogleFinanceResult } from "../types/google-finance-type";
import { mkdirSync, writeFileSync } from "fs";

// Get the filename and directory name of the current ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type that describes each stock for scraping
interface GoogleScraperProps {
  symbol: string;
  id: string;
}

/**
 * Generates an array of possible HTTP headers, including various "User-Agent"
 * and "Accept-Language" combinations to randomize requests and avoid getting blocked.
 */
function getHeaderCandidates(): Array<Record<string, string>> {
  return [
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    },
    {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
      "Accept-Language": "en-GB,en;q=0.8"
    },
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-IN,en;q=0.7"
    },
    {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  ];
}

/**
 * Generates an array of proxy server addresses. Currently, it returns [undefined],
 * meaning no proxy is used, but you can add proxy URLs to this list as needed.
 */
function getProxyCandidates(): Array<string | undefined> {
  // Add proxy strings here if required.
  return [undefined];
}

/**
 * Fetches a URL with given HTTP headers and (optionally) via a proxy.
 * Throws an error for proxies (as implementation is placeholder).
 * @param url - The URL to fetch.
 * @param headers - Headers to use for the HTTP request.
 * @param proxy - Optional proxy server URL.
 */
async function fetchWithHeadersAndProxy(
  url: string,
  headers: Record<string, string>,
  proxy?: string
): Promise<Response> {
  if (proxy) {
    // Placeholder for proxy-enabled fetch implementation.
    throw new Error("Proxy fetching not implemented; please use a proxy-enabled fetch.");
  }
  // Native fetch with the selected headers; follows redirects.
  return await fetch(url, { headers, redirect: "follow" });
}

/**
 * Repeatedly attempts to fetch a page, cycling through different header/proxy combinations,
 * to maximize chance of bypassing rate-limits and anti-bot protection.
 * @param url - The target URL to fetch HTML from.
 * @returns The HTML content as a string.
 * @throws If all attempts fail, throws the most recent (last) error encountered.
 */
async function robustFetchHtml(url: string): Promise<string> {
  const headersList = getHeaderCandidates();         // Candidate HTTP headers
  const proxies = getProxyCandidates();              // Candidate proxies

  const maxTries = headersList.length * proxies.length * 2; // Number of allowed tries
  let attempt = 0;
  let lastError: Error | undefined = undefined;

  // Precompute all header/proxy combinations for round-robin attempts
  const combos: Array<{ headers: Record<string, string>, proxy?: string }> = [];
  for (const h of headersList)
    for (const p of proxies)
      combos.push({ headers: h, proxy: p });

  // Try each combination (with retries and backoff on error/rate limit)
  while (attempt < maxTries) {
    const combo = combos[attempt % combos.length];
    if (!combo) {
      attempt++;
      continue;
    }
    const { headers, proxy } = combo;
    try {
      const response = await fetchWithHeadersAndProxy(url, headers, proxy);

      // If forbidden/rate limited, raise special error so we can retry
      if (!response.ok) {
        if ([429, 403].includes(response.status)) {
          throw new Error(`Rate limited or forbidden on attempt ${attempt + 1}, status: ${response.status}`);
        } else {
          throw new Error(`Failed fetch on attempt ${attempt + 1}, status: ${response.status}`);
        }
      }
      // Success: return body as string
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;
      // Backoff (wait a short period before next request)
      await new Promise(res => setTimeout(res, 300 + Math.random() * 500));
      continue;
    }
  }
  // If we reach here, all attempts failed
  throw lastError ?? new Error("Failed to fetch and no more tries/remedies available.");
}

/**
 * Extracts financial details (P/E ratio and earnings per share) from provided HTML content.
 * Uses regular expressions to parse the expected information from known DOM structure.
 * @param htmlContent - HTML page as a string
 * @returns An object with `peRatio` and `earningsPerShare` as strings (or null if not found)
 */
function extractFinancials(htmlContent: string) {
  // Regex match for P/E ratio
  const peRatioMatch = htmlContent.match(
    /P\/E\s+ratio[\s\S]*?<div\s+class=["']P6K39c["'][^>]*>([^<]+)<\/div>/
  );
  // Regex match for Earnings per share
  const epsMatch = htmlContent.match(
    /Earnings\s+per\s+share[\s\S]*?<td\s+class=["']QXDnM["'][^>]*>([^<]+)<\/td>/
  );

  // Clean values or set as null if missing
  const peRatio = peRatioMatch?.[1]?.trim() ?? null;
  const earningsPerShare = epsMatch?.[1]?.trim() ?? null;

  return { peRatio, earningsPerShare };
}

/**
 * Main scraping logic for a single stock.
 * Fetches the relevant Google Finance page, parses the HTML, and extracts numbers.
 * Provides error reporting/handling if scraping fails.
 * @param props - Contains stock symbol and ID
 * @returns Parsed GoogleFinanceResult object
 */
async function main(props: GoogleScraperProps) {
  // Default to Google Finance URL using the stock symbol unless overridden by command-line
  const targetUrl = process.argv[2] ?? `https://www.google.com/finance/quote/${props.symbol}`;

  let htmlContent: string;
  try {
    // Robust fetching (rotates header/proxy on error)
    htmlContent = await robustFetchHtml(targetUrl);
  } catch (error) {
    // Log error details for diagnostics
    console.error(`Failed to fetch after rotating all headers and proxies for ${targetUrl}`);
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }

  // Extracted financial values from HTML
  const { peRatio, earningsPerShare } = extractFinancials(htmlContent);

  // Ensure we found both expected financials
  if (!peRatio || !earningsPerShare) {
    console.error("Could not extract required data from HTML:");
    if (!peRatio) console.error("  - P/E ratio not found");
    if (!earningsPerShare) console.error("  - Earnings per share not found");
    console.error(`URL: ${targetUrl}`);
    throw new Error("Required financial data missing in HTML.");
  }

  // Safely parse values to numbers, fallback to null if not numeric
  const peRatioNum = peRatio ? parseFloat(peRatio) : null;
  const epsNum = earningsPerShare ? parseFloat(earningsPerShare) : null;

  // Structuring the final result according to GoogleFinanceResult interface
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

/**
 * Scrapes multiple Google Finance symbols in parallel.
 * Returns only successfully scraped data (rejecting items for which scraping failed).
 * @param google_symbols - Array of { symbol, id } objects
 * @returns Array of successful GoogleFinanceResult objects
 */
export async function ScrapeGoogleFinance(google_symbols: GoogleScraperProps[]) {

  // Define path to store the scraped Google data cache
  const outputPath = resolve(
    process.cwd(),
    "services/localcache/google-peratio-earnings-cache.json"
  );

  // Define path to store the last Yahoo sync time
  const googleLastSyncOutputPath = resolve(
    process.cwd(),
    "services/localcache/googleLastSync.txt"
  );
  // Map over input stocks, running the main scraper for each
  const scrapedData = await Promise.all(
    google_symbols.map(async (s) => {
      try {
        return await main(s);
      } catch (error) {
        // If an error occurs for a particular symbol, return null for that item
        return null;
      }
    })
  );

  // Ensure directory exists for 'googleLastSync.txt'
  mkdirSync(dirname(googleLastSyncOutputPath), { recursive: true });

  // Save the current time as the last Google sync time (IST)
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  writeFileSync(googleLastSyncOutputPath, `Google sync at: ${currentTime}`, "utf8");

  // Ensure directory exists for Yahoo data cache
  mkdirSync(dirname(outputPath), { recursive: true });

  // Save the scraped Yahoo data to local cache as prettified JSON
  const fileContents = `${JSON.stringify(scrapedData, null, 2)}\n`;
  writeFileSync(outputPath, fileContents, "utf8");


  // Filter out any failed (null) results and return only successfully parsed stocks
  return scrapedData.filter(Boolean);
}
