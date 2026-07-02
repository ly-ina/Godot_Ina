// MCP Tool: analyze_project — comprehensive project analysis for AI-driven development
import * as fs from "fs";
import * as path from "path";
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { findTscnFiles } from "./list_scenes.js";
import type { SceneNode, ExtResource, Connection } from "../parsers/tscn-types.js";

export interface AnalyzeProjectArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Include scene contents (default: true). Set false for quick overview. */
  include_scene_content?: boolean;
  /** Include script content summaries (default: true) */
  include_script_summaries?: boolean;
}

/**
 * Analyze a Godot project and return a structured summary suitable
 * for AI to understand the project's architecture and make decisions.
 */
export function analyzeProject(args: AnalyzeProjectArgs): string {
  const { project_path, include_scene_content = true, include_script_summaries = true } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const result: string[] = [
    `Project Analysis: ${path.basename(project_path)}`,
    `Path: ${project_path}`,
    `Analyzed at: ${new Date().toISOString()}`,
    "",
  ];

  // 1. Project configuration
  const projectFile = path.join(project_path, "project.godot");
  if (fs.existsSync(projectFile)) {
    const content = fs.readFileSync(projectFile, "utf-8");
    const nameMatch = content.match(/config\/name="([^"]+)"/);
    const mainSceneMatch = content.match(/run\/main_scene="([^"]+)"/);
    const widthMatch = content.match(/viewport_width=(\d+)/);
    const heightMatch = content.match(/viewport_height=(\d+)/);
    result.push(`Project: ${nameMatch?.[1] || path.basename(project_path)}`);
    result.push(`Main Scene: ${mainSceneMatch?.[1] || "(not set)"}`);
    if (widthMatch || heightMatch) {
      result.push(`Resolution: ${widthMatch?.[1] || "?"}x${heightMatch?.[1] || "?"}`);
    }
    result.push("");
  }

  // 2. Scene inventory
  const scenes = findTscnFiles(project_path);
  result.push(`Scenes: ${scenes.length}`);
  if (scenes.length > 0) {
    for (const sceneFile of scenes) {
      const relPath = path.relative(project_path, sceneFile);
      try {
        const scene = parseTscnFile(sceneFile);
        const nodeCount = countNodes(scene.rootNode);
        const scriptRefs = scene.extResources.filter(r => r.type === "Script").length;
        const icon = scene.extResources.length > 0 ? "🔗" : "  ";
        result.push(`  ${icon} ${relPath} — ${nodeCount} node(s), ${scriptRefs} script(s)`);

        if (include_scene_content && scene.rootNode) {
          result.push(serializeNodeTree(scene.rootNode, "      "));
          // Show connections
          if (scene.connections.length > 0) {
            result.push(`      Connections: ${scene.connections.length}`);
            for (const conn of scene.connections.slice(0, 5)) {
              result.push(`        ${conn.from}.${conn.signal} → ${conn.to}.${conn.method}()`);
            }
            if (scene.connections.length > 5) {
              result.push(`        ... and ${scene.connections.length - 5} more`);
            }
          }
        }
      } catch {
        result.push(`  ❌ ${relPath} — (parse error)`);
      }
    }
  }
  result.push("");

  // 3. Resource inventory by type
  const allResources = new Map<string, ExtResource[]>();
  for (const sceneFile of scenes) {
    try {
      const scene = parseTscnFile(sceneFile);
      for (const res of scene.extResources) {
        const list = allResources.get(res.type) || [];
        list.push(res);
        allResources.set(res.type, list);
      }
    } catch { /* skip */ }
  }

  if (allResources.size > 0) {
    result.push("Resource References:");
    for (const [type, refs] of allResources) {
      result.push(`  ${type}: ${refs.length} — e.g. ${refs.slice(0, 3).map(r => r.path).join(", ")}`);
    }
    result.push("");
  }

  // 4. Script files
  const gdFiles = collectGdFiles(project_path);
  result.push(`GDScript Files: ${gdFiles.length}`);
  if (gdFiles.length > 0 && include_script_summaries) {
    for (const gdFile of gdFiles.slice(0, 20)) {
      const relPath = path.relative(project_path, gdFile);
      try {
        const content = fs.readFileSync(gdFile, "utf-8");
        const lines = content.split("\n");
        const extendsMatch = content.match(/extends\s+(\w+)/);
        const funcs = [...content.matchAll(/func\s+(\w+)/g)].map(m => m[1]);
        const signals = [...content.matchAll(/signal\s+(\w+)/g)].map(m => m[1]);

        result.push(`  ${relPath} (${lines.length} lines)`);
        if (extendsMatch) result.push(`    extends: ${extendsMatch[1]}`);
        if (funcs.length > 0) result.push(`    functions: ${funcs.join(", ")}`);
        if (signals.length > 0) result.push(`    signals: ${signals.join(", ")}`);
      } catch {
        result.push(`  ❌ ${relPath} — (read error)`);
      }
    }
    if (gdFiles.length > 20) {
      result.push(`  ... and ${gdFiles.length - 20} more`);
    }
  }
  result.push("");

  // 5. Structural insight
  const hasMainScene = scenes.some(s => s.includes("Main") || s.includes("main"));
  const hasPlayer = scenes.some(s => {
    try {
      const scene = parseTscnFile(s);
      return countNodes(scene.rootNode, "CharacterBody2D", "CharacterBody3D") > 0;
    } catch { return false; }
  });
  const hasUI = scenes.some(s => {
    try {
      const scene = parseTscnFile(s);
      return countNodes(scene.rootNode, "Control") > 0;
    } catch { return false; }
  });

  result.push("Structural Insights:");
  result.push(`  Main scene: ${hasMainScene ? "✅ detected" : "⚠️ not detected"}`);
  result.push(`  Player character: ${hasPlayer ? "✅ detected" : "⚠️ not detected"}`);
  result.push(`  UI elements: ${hasUI ? "✅ detected" : "⚠️ not detected"}`);
  result.push(`  Scenes with scripts: ${countScenesWithScripts(scenes)}/${scenes.length}`);

  return result.join("\n");
}

function countNodes(node: SceneNode | null, ...typeFilter: string[]): number {
  if (!node) return 0;
  let count = 1;
  if (typeFilter.length > 0 && !typeFilter.includes(node.type)) count = 0;
  for (const child of node.children) {
    count += countNodes(child, ...typeFilter);
  }
  return count;
}

function serializeNodeTree(node: SceneNode, indent: string): string {
  const scriptInfo = node.properties?.script ? " 📄" : "";
  const parentInfo = node.parent ? ` parent="${node.parent}"` : "";
  const lines: string[] = [`${indent}${node.name}: ${node.type}${scriptInfo}${parentInfo}`];
  for (const child of node.children) {
    lines.push(serializeNodeTree(child, indent + "  "));
  }
  return lines.join("\n");
}

function collectGdFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          results.push(...collectGdFiles(full));
        }
      } else if (entry.name.endsWith(".gd")) {
        results.push(full);
      }
    }
  } catch { /* skip */ }
  return results;
}

function countScenesWithScripts(scenes: string[]): number {
  let count = 0;
  for (const s of scenes) {
    try {
      const scene = parseTscnFile(s);
      if (scene.extResources.some(r => r.type === "Script")) count++;
    } catch { /* skip */ }
  }
  return count;
}
