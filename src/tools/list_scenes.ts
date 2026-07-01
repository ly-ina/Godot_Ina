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
        if (file === ".git" || file === "node_modules" || file === ".godot") {
          continue;
        }
        findTscnFiles(fullPath, fileList);
      } else if (file.endsWith(".tscn")) {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // If directory can't be read, skip it
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return fileList;
}

export function getFileInfo(filePath: string): SceneInfo {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    size: stat.size,
    modified: stat.mtime.toISOString(),
  };
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
  const scenes = tscnFiles.map(filePath => getFileInfo(filePath));
  
  return scenes;
}
