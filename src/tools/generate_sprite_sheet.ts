// MCP Tool: generate_sprite_sheet — AI Game Workbench integration
// Generates multi-frame character sprite sheets for Godot AnimatedSprite2D.
// Requires AI Game Workbench (github.com/kazusa000/ai_game_workbench) running locally.
import * as fs from "fs";
import * as path from "path";

const WORKBENCH_DEFAULT_URL = "http://127.0.0.1:8787";

export interface GenerateSpriteSheetArgs {
  project_path: string;
  /** Character name (creates a new one in Workbench if doesn't exist) */
  name: string;
  /** Workbench base URL (default: http://127.0.0.1:8787) */
  workbench_url?: string;
  /** Optional: existing character ID in Workbench to reuse */
  character_id?: string;
  /** Export frame size (256/384/512/1024, default: 512) */
  export_size?: number;
}

export function generateSpriteSheet(args: GenerateSpriteSheetArgs): string {
  const { project_path, name, workbench_url = WORKBENCH_DEFAULT_URL, export_size = 512 } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!name) throw new Error("name is required");

  // ── Check Workbench is running ──
  let workbenchOk = false;
  try {
    const resp = fetchSync(`${workbench_url}/api/characters`, "GET");
    workbenchOk = resp.startsWith("[") || resp.includes("characters");
  } catch {
    // Workbench not running, return instructions
  }

  if (!workbenchOk) {
    return (
      `⚠️ AI Game Workbench 未运行。\n\n` +
      `${name} 的精灵表需要先启动 AI Game Workbench：\n\n` +
      `  1. 打开 https://github.com/kazusa000/ai_game_workbench\n` +
      `  2. 下载便携包或 git clone\n` +
      `  3. 运行启动脚本 (Start AI Game Workbench.bat 或 npm run dev:workbench)\n` +
      `  4. 在网页中创建角色「${name}」并生成动画帧\n` +
      `  5. 回到这里重新调用此工具，传入 character_id="${name}"\n\n` +
      `或者如果角色已生成，使用 search_code 分析现有资源后手动设置 SpriteFrames。`
    );
  }

  // ── List characters ──
  let characterId = args.character_id || name;
  const charsResp = fetchSync(`${workbench_url}/api/characters`, "GET");
  let chars: string[] = [];
  try {
    const parsed = JSON.parse(charsResp);
    chars = parsed.characters || [];
  } catch { /* ignore */ }

  if (chars.length === 0) {
    return (
      `⚠️ AI Game Workbench 中没有角色。\n\n` +
      `请打开 Workbench 网页（${workbench_url}），先创建一个「${name}」角色，` +
      `完成待机/步行动画生成后，再次调用此工具。`
    );
  }

  const matchedCharacter = chars.find((c: string) =>
    c.toLowerCase() === characterId.toLowerCase() ||
    c.toLowerCase().includes(name.toLowerCase())
  );

  if (!matchedCharacter) {
    return (
      `⚠️ 未找到角色「${name}」。Workbench 中的角色：\n` +
      chars.map((c: string) => `  - ${c}`).join("\n") + "\n\n" +
      `请先在 Workbench 网页中创建角色并生成动画。`
    );
  }

  characterId = matchedCharacter;

  // ── Trigger Godot export ──
  const exportResp = fetchSync(`${workbench_url}/api/export/godot`, "POST", {
    characterId,
    exportSize: export_size as 256 | 384 | 512 | 1024,
  });

  let exportData: Record<string, unknown>;
  try {
    exportData = JSON.parse(exportResp);
  } catch {
    return `❌ Workbench Godot 导出失败：${exportResp.substring(0, 200)}`;
  }

  if (!exportData.manifestUrl) {
    // Might still have animation data even without manifestUrl
    if (exportData.exportedActions) {
      // Use export data directly
    } else {
      return `❌ Godot 导出不完整：${JSON.stringify(exportData)}`;
    }
  }

  // ── Parse manifest (or use exportData directly) ──
  const manifest: Record<string, unknown> = {};
  if (exportData.manifestUrl) {
    const manifestUrl = `${workbench_url}${exportData.manifestUrl}`;
    try {
      const manifestResp = fetchSync(manifestUrl, "GET");
      Object.assign(manifest, JSON.parse(manifestResp));
    } catch {
      return `❌ 无法从 Workbench 获取 animations manifest。请检查 Workbench 是否正常运行。`;
    }
  }

  // ── Get animation data from manifest ──
  const exportedActions = (exportData.exportedActions as string[]) || [];
  const animations = (manifest.animations || exportedActions.map((a: string) => ({
    name: a, action: a, direction: "down",
    fps: a === "idle" ? 12 : 30, loop: true, frames: []
  })) || []) as Array<{
    name: string; action: string; direction: string;
    fps: number; loop: boolean; frames: string[];
  }>;

  const downloadedActions = new Set<string>();
  for (const anim of animations) downloadedActions.add(anim.action);

  // ── Generate output ──
  // Instead of downloading individual frame files (complex binary handling),
  // we generate the SpriteFrames .tres and scene, and tell the user where
  // the Workbench export files are located.
  const assetsDir = path.resolve(project_path, "assets", "characters", name);
  fs.mkdirSync(assetsDir, { recursive: true });

  // ── Create SpriteFrames .tres ──
  const tresPath = path.join(assetsDir, `${name}_sprite_frames.tres`);
  const frameDir = `res://assets/characters/${name}/frames`;
  const tresContent = buildSpriteFramesTres(animations, frameDir);
  fs.writeFileSync(tresPath, tresContent, "utf-8");

  // ── Create import guide script ──
  const importScriptPath = path.join(assetsDir, `${name}_import_guide.txt`);
  const exportBaseDir = exportData.exportRootPath as string || "(请查看 Workbench 导出目录)";
  fs.writeFileSync(importScriptPath,
    `AI Game Workbench — ${name} 精灵表导入指南\n` +
    `========================================\n\n` +
    `1. 在 Workbench 中已完成 Godot 导出\n` +
    `  导出目录: ${exportBaseDir}\n\n` +
    `2. 将导出的 frames/ 目录复制到项目:\n` +
    `  cp -r "${exportBaseDir}/frames" "${assetsDir}/"\n\n` +
    `3. 这样就完成了！AnimatedSprite2D 引用:\n` +
    `  ${tresPath}\n\n` +
    `或者直接在场景中实例化自动生成的场景。`,
    "utf-8"
  );

  // ── Create AnimatedSprite2D scene ──
  const scenePath = path.join(assetsDir, `${name}_animated.tscn`);
  const sceneContent = buildAnimatedScene(name);
  fs.writeFileSync(scenePath, sceneContent, "utf-8");

  const actionList = Array.from(downloadedActions).join(", ");

  return (
    `✅ 精灵表生成完成！\n\n` +
    `角色: ${name}\n` +
    `动作: ${actionList}\n` +
    `帧大小: ${export_size}x${export_size}\n\n` +
    `生成的文件：\n` +
    `  SpriteFrames:  assets/characters/${name}/${name}_sprite_frames.tres\n` +
    `  动画场景:      assets/characters/${name}/${name}_animated.tscn\n` +
    `  导入指南:      assets/characters/${name}/${name}_import_guide.txt\n\n` +
    `📋 下一步：\n` +
    `  将 Workbench 导出目录中的 frames/ 复制到 assets/characters/${name}/ 即可。\n` +
    `  Workbench 导出位置: ${exportBaseDir}\n\n` +
    `💡 也可以直接用 demo_character 指定 sprite_path 来创建完整角色`
  );
}

/**
 * Build SpriteFrames .tres resource file — Godot 4 text format
 */
function buildSpriteFramesTres(
  animations: Array<{ name: string; action: string; direction: string; fps: number; loop: boolean; frames: string[] }>,
  frameDir: string
): string {
  const lines: string[] = [
    `[gd_resource type="SpriteFrames" load_steps=2 format=3]`,
    ``,
    `[resource]`,
  ];

  for (const anim of animations) {
    // Map Workbench's name format to Godot's animation names
    const animName = `${anim.action}_${anim.direction}`;
    const speed = anim.fps;
    const loop = anim.loop ? "true" : "false";

    lines.push(`animations/${animName}/name = "${animName}"`);
    lines.push(`animations/${animName}/speed = ${speed}.0`);
    lines.push(`animations/${animName}/loop = ${loop}`);
    lines.push(`animations/${animName}/frames = [`);

    // Generate frame paths
    // Workbench frames are at: frames/<action>/<direction>/000.png, 001.png, etc.
    for (let fi = 0; fi < anim.frames.length; fi++) {
      const framePath = `${frameDir}/${anim.action}/${anim.direction}/${String(fi).padStart(3, "0")}.png`;
      lines.push(`  ExtResource("${framePath}")`);
    }
    lines.push(`]`);
  }

  return lines.join("\n");
}

/**
 * Create a scene with AnimatedSprite2D ready to use
 */
function buildAnimatedScene(name: string): string {
  const tresRel = `res://assets/characters/${name}/${name}_sprite_frames.tres`;
  return [
    `[gd_scene load_steps=3 format=3 uid="uid://${name}_animated"]`,
    `[ext_resource type="SpriteFrames" path="${tresRel}" id="1"]`,
    `[sub_resource type="RectangleShape2D" id="2"]`,
    `size = Vector2(64, 64)`,
    `[node name="${name}" type="CharacterBody2D"]`,
    `[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]`,
    `sprite_frames = ExtResource("1")`,
    `animation = &"idle_down"`,
    `[node name="CollisionShape2D" type="CollisionShape2D" parent="."]`,
    `shape = SubResource("2")`,
    `[node name="Camera2D" type="Camera2D" parent="."]`,
    `position_smoothing_enabled = true`,
    `position_smoothing_speed = 5.0`,
  ].join("\n");
}

// ── Synchronous HTTP fetch using child_process ──
function fetchSync(url: string, method: string, body?: unknown): string {
  const { execSync } = require("child_process");
  const escapedUrl = url.replace(/"/g, '\\"');
  let cmd: string;

  if (process.platform === "win32") {
    // PowerShell Invoke-RestMethod
    const bodyArg = body ? ` -Body '${JSON.stringify(body).replace(/'/g, "''")}' -ContentType 'application/json'` : "";
    const methodArg = ` -Method ${method}`;
    cmd = `powershell -Command "try { Invoke-RestMethod -Uri '${escapedUrl}'${methodArg}${bodyArg} -TimeoutSec 15 | ConvertTo-Json -Compress } catch { Write-Error $_.Exception.Message }"`;
  } else {
    // curl
    const bodyArg = body ? ` -d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : "";
    const methodArg = method === "POST" ? ` -X POST${body ? ' -H "Content-Type: application/json"' : ""}` : "";
    cmd = `curl -s${methodArg}${bodyArg} '${escapedUrl}'`;
  }

  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 20000 }).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    throw new Error(err.stderr?.toString() || err.message || "HTTP request failed");
  }
}
