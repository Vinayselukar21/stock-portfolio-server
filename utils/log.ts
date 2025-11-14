import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

// Define paths for keeping logs and last sync timestamps, relative to project root
const lastSyncOutputPath = resolve(process.cwd(), `services/localcache/lastSync.txt`);
const outputPath = resolve(process.cwd(), `services/localcache/logs.txt`);

// Log function to save last sync time and data fetch summary to disk
export function Log(length?: number) {
    // Get current time in IST
    const currentTime = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });

    // Write last synchronization time to lastSync.txt
    mkdirSync(dirname(lastSyncOutputPath), { recursive: true });
    writeFileSync(lastSyncOutputPath, `Last sync at: ${currentTime}`, "utf-8");

    // Append logs about how many stocks were fetched to logs.txt
    mkdirSync(dirname(outputPath), { recursive: true });
    const fileContents = `Yahoo: Prices fetched for ${length} stocks ${currentTime}\n`;
    writeFileSync(outputPath, fileContents, { encoding: "utf8", flag: "a" });
}
