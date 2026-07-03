import * as fs from "fs";
import * as path from "path";

export interface SceneInfo {
  path: string;
  size: number;
  modified: string;
}

export function findTscnFiles(dirPath: string, fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip common directories that don't contain Godot scenes
        if (file === ".git" || file === "node_modules" || file === ".godot" ||
            file === "integration" || file === "__pycache__") {
          continue;
        }
        findTscnFiles(fullPath, fileList);
      } else if (file.endsWith(".tscn")) {
        // Skip test fixture files
        if (file.startsWith("__") || file.startsWith("TestScene")) {
          continue;
        }
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // If directory can't be read, skip it
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return fileList;
}

export function getFileInfo(filePath: string): SceneInfo | null {
  try {
    const stat = fs.statSync(filePath);
    return {
      path: filePath,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  } catch {
    // File might have been deleted between readdirSync and statSync
    return null;
  }
}

export function listScenes(projectPath: string): SceneInfo[] {
  // Validate path exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }
  
  if (!fs.statSync(projectPath).isDirectory()) {
    throw new Error(`Project path is not a directory: ${projectPath}`);
  }
  
  // Find all .tscn files
  const tscnFiles = findTscnFiles(projectPath);
  
  // Get file info for each scene
  const scenes = tscnFiles
    .map(filePath => getFileInfo(filePath))
    .filter((info): info is SceneInfo => info !== null);
  
  return scenes;
}
