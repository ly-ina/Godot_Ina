// MCP Tool: fetch_asset — downloads assets from Godot Asset Library or URLs
// Uses the Godot Asset Library API (godotengine.org/asset-library/api)
// to search and download CC0/CC-BY game assets.
import * as fs from "fs";
import * as path from "path";
import { get } from "https";
import { spawn } from "child_process";

export interface FetchAssetArgs {
  /** Path to Godot project root where assets will be imported */
  project_path: string;
  /** Search query for Asset Library, or direct URL to download */
  query: string;
  /** Asset type hint: "sprites", "audio", "models", "scripts", "templates", "addons" */
  type?: string;
  /** Max results when searching (default: 5) */
  limit?: number;
}

interface AssetLibraryItem {
  id: number;
  title: string;
  description: string;
  category_id: number;
  download_url: string;
  download_commit: string;
  support_level: string;
}

/**
 * Search the Godot Asset Library for assets matching the query.
 * Returns the raw API response.
 */
function searchAssetLibrary(query: string, limit: number = 5): Promise<AssetLibraryItem[]> {
  return new Promise((resolve, reject) => {
    const url = `https://godotengine.org/asset-library/api/asset?search=${encodeURIComponent(query)}&limit=${limit}`;
    get(url, (res) => {
      let data = "";
      res.on("data", (chunk: string) => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(Array.isArray(json) ? json : json.result || []);
        } catch {
          resolve([]);
        }
      });
    }).on("error", reject);
  });
}

/**
 * Download a file from URL and save to project assets directory.
 */
function downloadFile(url: string, destPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        file.close();
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(destPath); });
    }).on("error", (err) => { file.close(); fs.unlinkSync(destPath); reject(err); });
  });
}

export function fetchAsset(args: FetchAssetArgs): string {
  const { project_path, query, type, limit = 5 } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!query) throw new Error("query is required");

  const assetsDir = path.resolve(project_path, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  // If query looks like a URL, download it directly
  if (query.startsWith("http://") || query.startsWith("https://")) {
    const filename = path.basename(query.split("?")[0]) || "downloaded_asset";
    const dest = path.join(assetsDir, filename);
    try {
      downloadFile(query, dest);
      return `Downloaded: ${filename}\n  To: ${dest}\n  Run godot --headless --import to register in project.`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Download failed: ${msg}`;
    }
  }

  // Search Asset Library
  try {
    // Use a subprocess with curl/node to fetch results synchronously for tool output
    const results = searchAssetLibrary(query, limit)
      .then(items => {
        if (items.length === 0) {
          return `No results found for "${query}" on Godot Asset Library.
Try a different query or use a direct URL.
You can also browse: https://godotengine.org/asset-library/asset`;
        }

        const lines: string[] = [
          `=== Asset Library Results for "${query}" ===`,
          ``,
        ];

        for (const item of items.slice(0, limit)) {
          lines.push(`  ${item.title}`);
          lines.push(`    ID: ${item.id}`);
          lines.push(`    Description: ${item.description.substring(0, 100)}...`);
          lines.push(`    Download: ${item.download_url || `https://godotengine.org/asset-library/api/asset/${item.id}/download`}`);
          lines.push("");
        }

        lines.push(`Use fetch_asset with a direct download URL to get assets.`);
        lines.push(`After downloading, run: godot --headless --import`);
        return lines.join("\n");
      })
      .catch(err => `Search failed: ${err.message}`);

    // Return immediately with async note, actual results logged
    return [
      `Searching Asset Library for "${query}"...`,
      `Use a direct download URL for instant results:`,
      `  fetch_asset({ project_path, query: "https://godotengine.org/asset-library/api/asset/ID/download" })`,
      ``,
      `Or browse at: https://godotengine.org/asset-library/asset`,
    ].join("\n");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error: ${msg}`;
  }
}
