// Interface describing the result structure for each scraped stock
export interface YahooScrapeResponse {
    id: string;
    exchange: string;
    yahoo_symbol: string;
    name: string;
    shortName: string;
    price: number;
    currency: string;
  }