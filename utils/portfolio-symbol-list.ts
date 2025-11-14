import { portfolioStocks } from "../portfolio/stocks";

// Prepare Yahoo symbols in the required [{ symbol, id }, ...] structure for scrapers
export const google_symbols = portfolioStocks?.flatMap(stock => {
    return { symbol: stock.symbol.google, id: stock.id };
});

export const yahoo_symbols = portfolioStocks?.flatMap((stock) => ({
    symbol: stock.symbol.yahoo,
    id: stock.id,
}));