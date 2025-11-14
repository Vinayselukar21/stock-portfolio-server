import axios, { type AxiosRequestConfig } from "axios";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import YahooFinance from "yahoo-finance2";
import type { YahooScrapeResponse } from "../types/yahoo-finance-type";

// Interface for passing symbol and id to the scraper
interface YahooScraperProps {
  symbol: string;
  id: string;
}

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type HeaderBag =
  | Headers
  | Record<string, string | number | boolean>
  | Array<[string, string]>;

/**
 * Convert supported header bag shapes into a Record<string, string>.
 */
function normalizeHeaders(headers?: HeaderBag): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Array.from(headers.entries()).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {}
    );
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return Object.entries(headers).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    },
    {}
  );
}

type ProxyConfig = {
  raw: string;
  protocol: string;
  host: string;
  port: number;
  auth?: {
    username: string;
    password?: string;
  };
};

function parseProxyList(raw?: string | null): ProxyConfig[] {
  if (!raw) return [];
  const candidates = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const configs: ProxyConfig[] = [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      configs.push({
        raw: candidate,
        protocol: url.protocol.replace(":", "") || "http",
        host: url.hostname,
        port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
        auth: url.username
          ? {
              username: decodeURIComponent(url.username),
              password: url.password
                ? decodeURIComponent(url.password)
                : undefined
            }
          : undefined
      });
    } catch {
      // Ignore invalid proxy entries so that a single bad proxy does not stop the scraper
      continue;
    }
  }
  return configs;
}

function parseHeaderVariants(raw?: string | null): Record<string, string>[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (entry) =>
            entry && typeof entry === "object" && !Array.isArray(entry)
        )
        .map((entry) => {
          const normalized: Record<string, string> = {};
          Object.entries(entry as Record<string, string | number>).forEach(
            ([key, value]) => {
              if (value !== undefined && value !== null) {
                normalized[key] = String(value);
              }
            }
          );
          return normalized;
        });
    }
  } catch {
    // fall back to defaults
  }
  return [];
}

const DEFAULT_HEADER_ROTATION: Record<string, string>[] = [
  {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Connection: "keep-alive"
  },
  {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.8",
    Connection: "keep-alive"
  },
  {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.7",
    Connection: "keep-alive"
  }
];

const RATE_LIMIT_STATUS = new Set([429, 503]);
const parsedHeaderVariants = parseHeaderVariants(process.env.YAHOO_HEADER_VARIANTS);
const HEADER_ROTATION = parsedHeaderVariants.length
  ? parsedHeaderVariants
  : DEFAULT_HEADER_ROTATION;
const PROXY_ROTATION = parseProxyList(process.env.YAHOO_PROXY_LIST);

async function axiosFetchWithProxy(
  input: FetchInput,
  init: NonNullable<FetchInit>,
  proxy?: ProxyConfig,
  headerOverride?: Record<string, string>
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const headers = {
    ...normalizeHeaders(init.headers as HeaderBag | undefined),
    ...(headerOverride ?? {})
  };

  const axiosConfig: AxiosRequestConfig = {
    url,
    method: (init.method ?? "GET") as AxiosRequestConfig["method"],
    headers,
    data: init.body as AxiosRequestConfig["data"],
    responseType: "arraybuffer",
    maxRedirects: 5,
    decompress: true,
    signal: init.signal as AbortSignal | undefined,
    validateStatus: () => true
  };

  if (proxy) {
    axiosConfig.proxy = {
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      auth: proxy.auth?.username
        ? {
            username: proxy.auth.username,
            password: proxy.auth.password ?? ""
          }
        : undefined
    };
  } else {
    axiosConfig.proxy = false;
  }

  const response = await axios.request<ArrayBuffer>(axiosConfig);
  const responseHeaders = new Headers();
  Object.entries(response.headers ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => responseHeaders.append(key, entry));
    } else if (value !== undefined) {
      responseHeaders.set(key, String(value));
    }
  });

  return new Response(response.data ?? new ArrayBuffer(0), {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

function createRotatingFetch(): typeof fetch {
  const headersList = HEADER_ROTATION.length ? HEADER_ROTATION : [{}];
  const proxies = PROXY_ROTATION;
  const repetitionFactor = Math.max(headersList.length, 1) * Math.max(proxies.length || 1, 1);
  const maxAttempts = Math.max(repetitionFactor, 3);

  const rotatingFetch = (async function (
    input: FetchInput,
    init: FetchInit = {}
  ): Promise<Response> {
    const errors: unknown[] = [];
    const requestInit = (init ?? {}) as NonNullable<FetchInit>;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const proxy = proxies.length ? proxies[attempt % proxies.length] : undefined;
      const headerOverride = headersList[attempt % headersList.length];

      try {
        const response = await axiosFetchWithProxy(
          input,
          requestInit,
          proxy,
          headerOverride
        );
        if (RATE_LIMIT_STATUS.has(response.status)) {
          errors.push(
            new Error(
              `Yahoo Finance rate limited request (status ${response.status}) using proxy ${proxy?.raw ?? "none"}`
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        return response;
      } catch (error) {
        errors.push(error);
      }
    }
    throw new AggregateError(errors, "All proxy/header attempts failed for Yahoo Finance request");
  }) as typeof fetch;

  if (typeof fetch.preconnect === "function") {
    rotatingFetch.preconnect = (...args: Parameters<typeof fetch.preconnect>) =>
      fetch.preconnect(...args);
  }

  return rotatingFetch;
}

// Main function to scrape stock info from Yahoo Finance for a list of symbols
export async function ScrapeYahooFinance(yahoo_symbols: YahooScraperProps[]) {
  // Define path to store the scraped Yahoo data cache
  const outputPath = resolve(
    process.cwd(),
    "services/localcache/yahoo-stock-price-cache.json"
  );
  // Define path to store the last Yahoo sync time
  const yahooLastSyncOutputPath = resolve(
    process.cwd(),
    "services/localcache/yahooLastSync.txt"
  );

  // Initialize YahooFinance instance (suppress 'yahooSurvey' notices)
  const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
    fetch: createRotatingFetch()
  });

  // Ensure directory exists for 'yahooLastSync.txt'
  mkdirSync(dirname(yahooLastSyncOutputPath), { recursive: true });

  // Save the current time as the last Yahoo sync time (IST)
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata"
  });
  writeFileSync(yahooLastSyncOutputPath, `Yahoo sync at: ${currentTime}`, "utf8");

  // Fetch quotes for all provided Yahoo symbols in parallel
  const response = await Promise.all(
    yahoo_symbols.map((s) => yahooFinance.quote(s.symbol))
  );

  // Structure and normalize the response data
  const results: YahooScrapeResponse[] =
    response?.map((stock) => {
      // Find the corresponding id in yahoo_symbols
      const id = yahoo_symbols?.find(
        (symbol) => symbol.symbol === stock?.symbol
      )?.id;
      return {
        id: id ?? "", // Ensure id is always present as a string
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

  // Ensure directory exists for Yahoo data cache
  mkdirSync(dirname(outputPath), { recursive: true });

  // Save the scraped Yahoo data to local cache as prettified JSON
  const fileContents = `${JSON.stringify(results, null, 2)}\n`;
  writeFileSync(outputPath, fileContents, "utf8");

  // Return the final results
  return results;
}
