import type { Request, Response } from "express-serve-static-core";
import { mkdirSync, readFileSync } from "fs";
import { resolve } from "path";

const GetStockPrice = (req: Request, res: Response) => {
    // Resolve target directory to absolute path
    const targetDir = resolve(process.cwd(), "services/localcache/stocks");

    let files: string[] = [];
    let fileContentsArr: Array<{ data: any }> = [];

    try {
        // Ensure stocks cache directory exists
        mkdirSync(targetDir, { recursive: true });

        // List all cache files in the directory
        files = require("fs").readdirSync(targetDir);

        // Read each stock cache file and parse data into array
        for (const filename of files) {
            const filePath = resolve(targetDir, filename);
            try {
                const fileContents = readFileSync(filePath, "utf8");
                const parsed = JSON.parse(fileContents);
                fileContentsArr.push(parsed);
            } catch (e) {
                // Skip and silently ignore unreadable or invalid files
            }
        }
    } catch (err) {
        // On error, return HTTP 500 with details
        return res.status(500).json({
            error: "Could not read directory.",
            details: err instanceof Error ? err.message : err,
        });
    }

    // Respond with the loaded stocks data
    res.json({
        success: true,
        data: fileContentsArr,
        message: "Stocks data fetched Successfully.",
    });
}

export default GetStockPrice;