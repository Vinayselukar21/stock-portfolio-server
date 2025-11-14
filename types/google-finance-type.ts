// Interface describing the structure of Google Finance scraped results
export interface GoogleFinanceResult {
    id: string;
    google_url: string;
    google_symbol: string;
    peRatio: {
      raw: string | null;
      numeric: number | null;
    };
    earningsPerShare: {
      raw: string | null;
      numeric: number | null;
    };
  }