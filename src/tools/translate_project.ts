// MCP Tool: translate_project — convert Godot 3.x project to 4.x format
import * as fs from "fs";
import * as path from "path";
import { parseSceneFile } from "../parsers/versioned-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";
import { detectVersionFromProject } from "../adapters/adapter.js";
import { translateGDScript } from "../adapters/v3/gdscript_translator.js";
import { findTscnFiles } from "./impl/list_scenes.js";

export interface TranslateProjectArgs {
  /** Path to the Godot project to translate */
  project_path: string;
  /** What to translate: "scenes", "scripts", "all" (default: "all") */
  target?: "scenes" | "scripts" | "all";
  /** Create .bak backups before modifying (default: true) */
  create_backup?: boolean;
}

/**
 * Translate a Godot 3.x project to 4.x format.
 * - Scenes: node type mapping (KinematicBody2D → CharacterBody2D, etc.)
 * - Scripts: GDScript 1.0 → 2.0 syntax translation
 * - Config: project.godot config version update
 */
export function translateProject(args: TranslateProjectArgs): string {
  const { project_path, target = "all", create_backup = true } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  // Detect version
  const version = detectVersionFromProject(project_path);
  if (version !== "3.x") {
    return `Project at "${project_path}" is already Godot 4.x format. No translation needed.`;
  }

  const results: string[] = [`Translating Godot 3.x project: ${path.basename(project_path)}`, ""];
  let totalScenes = 0;
  let totalScripts = 0;
  let totalErrors = 0;

  // ── Translate scenes ──
  if (target === "all" || target === "scenes") {
    const scenes = findTscnFiles(project_path);
    results.push(`Scenes found: ${scenes.length}`);

    for (const sceneFile of scenes) {
      try {
        const relPath = path.relative(project_path, sceneFile);
        const parseResult = parseSceneFile(sceneFile, project_path);

        if (parseResult.version === "3.x") {
          // Create backup
          if (create_backup) {
            const bakPath = sceneFile + ".v3bak";
            fs.copyFileSync(sceneFile, bakPath);
          }

          // Write translated scene
          writeSceneToFile(parseResult.scene, sceneFile);

          results.push(`  ✅ ${relPath} — ${parseResult.warnings.length > 0 ? parseResult.warnings[1] : "translated"}`);
          totalScenes++;
        }
      } catch (e) {
        results.push(`  ❌ ${path.relative(project_path, sceneFile)} — ${e instanceof Error ? e.message : "error"}`);
        totalErrors++;
      }
    }
    results.push("");
  }

  // ── Translate GDScript ──
  if (target === "all" || target === "scripts") {
    const gdFiles = collectGdFiles(project_path);
    results.push(`GDScript files found: ${gdFiles.length}`);

    for (const gdFile of gdFiles) {
      try {
        const relPath = path.relative(project_path, gdFile);
        const content = fs.readFileSync(gdFile, "utf-8");
        const translation = translateGDScript(content);

        if (translation.changes.length > 0) {
          // Create backup
          if (create_backup) {
            const bakPath = gdFile + ".v3bak";
            fs.copyFileSync(gdFile, bakPath);
          }

          fs.writeFileSync(gdFile, translation.translated, "utf-8");
          results.push(`  ✅ ${relPath} — ${translation.changes.length} change(s): ${translation.changes.join(", ")}`);
          totalScripts++;
        } else {
          results.push(`  ➖ ${relPath} — no changes needed`);
        }
      } catch (e) {
        results.push(`  ❌ ${path.relative(project_path, gdFile)} — ${e instanceof Error ? e.message : "error"}`);
        totalErrors++;
      }
    }
    results.push("");
  }

  // ── Update project.godot ──
  if (target === "all") {
    const projectFile = path.join(project_path, "project.godot");
    if (fs.existsSync(projectFile)) {
      let projectContent = fs.readFileSync(projectFile, "utf-8");
      const bakPath = projectFile + ".v3bak";
      if (create_backup) fs.copyFileSync(projectFile, bakPath);

      // Update config_version from 4/3 to 5 (Godot 4.x)
      projectContent = projectContent.replace(/config_version=([34])/, "config_version=5");
      fs.writeFileSync(projectFile, projectContent, "utf-8");
      results.push("✅ project.godot — config_version updated to 5");
    }
    results.push("");
  }

  results.push(`Summary: ${totalScenes} scene(s) translated, ${totalScripts} script(s) updated, ${totalErrors} error(s)`);

  if (create_backup) {
    results.push("Backups saved with .v3bak extension — delete them once confirmed.");
  }

  return results.join("\n");
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
