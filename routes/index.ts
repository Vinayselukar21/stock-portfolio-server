
import { Router } from "express";
import GetStockPrice from "../controllers/stock.controller";
import GetStockStream from "../controllers/stock.stream.controller";

export const router = Router()
// Health check route to verify server is running
router.get("/health", (req, res) => {
    console.log("is alive.")
    res.send("Express server is running!");
});

// Serve all stocks (combined and cached) from local directory as a single API endpoint
router.get("/stocks", GetStockPrice);

// Serve an SSE (Server Sent Events) stream of the stocks data every 20 seconds to clients
router.get("/stocks/stream", GetStockStream);