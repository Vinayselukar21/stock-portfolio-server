import type { Request, Response } from "express-serve-static-core";
import { mkdirSync, readFileSync } from "fs";
import { resolve } from "path";

const GetStockStream = (req: Request, res: Response) => {
    // Set necessary headers for EventStream communication
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Flush headers to start SSE
    res.flushHeaders();

    // Determine the location of the stocks cache directory
    const targetDir = resolve(process.cwd(), "services/localcache/stocks");

    // Helper to write data to the stream
    function sendEvent(data: any) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Helper to load and send all stocks as an SSE event
    function RetrieveAndSendData() {
        let fileContentsArr: Array<{ data: any }> = [];
        try {
            // Ensure the cache directory exists
            mkdirSync(targetDir, { recursive: true });

            // Read filenames in the directory
            const files = require("fs").readdirSync(targetDir);

            // Read and parse each stock file for streaming
            for (const filename of files) {
                const filePath = resolve(targetDir, filename);
                try {
                    const fileContents = readFileSync(filePath, "utf8");
                    const parsed = JSON.parse(fileContents);
                    fileContentsArr.push(parsed);
                } catch (e) {
                    // Log error about this file and skip
                    console.error("Error reading:", filePath, e);
                }
            }

            // Send loaded data to all connected clients
            sendEvent(fileContentsArr);
        } catch (err) {
            // On error, send error payload over the SSE stream
            sendEvent({ error: "Could not read directory." });
        }
    }

    // Immediately send the latest data upon connection
    RetrieveAndSendData();

    // Continue sending new data every 20 seconds
    const interval = setInterval(RetrieveAndSendData, 20000);

    // Cleanup: stop the interval when client disconnects
    req.on("close", () => {
        clearInterval(interval);
        console.log("Client disconnected");
    });
}

export default GetStockStream;