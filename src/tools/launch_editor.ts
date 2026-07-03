// MCP Tool: launch_editor — hybrid AI+Human editing workflow
// AI handles code/structure, human handles visual editing in Godot editor.
// Provides context-specific tutorials for each editing mode.
import * as fs from "fs";
import * as path from "path";
import { spawn, spawnSync } from "child_process";
import { detectGodotExecutable } from "../godot/cli.js";

export interface LaunchEditorArgs {
  project_path: string;
  /** Scene/resource to open (e.g. scenes/Main.tscn). Optional — opens project root if omitted. */
  scene_path?: string;
  /** What kind of visual editing is needed — determines the tutorial shown */
  mode?: 
    | "ui_layout"      // Drag UI controls, adjust anchors/containers
    | "animation"      // Keyframe curves, transitions, timing
    | "tileset"        // Tile arrangement, collision polygons, terrain sets
    | "material"       // Shader parameters, texture mapping, visual effects
    | "signal"         // Connect signals between nodes in the editor
    | "collision"      // Draw/edit collision polygons and shapes
    | "lighting"       // Light/ shadow / occlusion baking
    | "general"        // General editing (no specific tutorial)
    ;
  /** Additional context — what the AI just generated and why manual edit is needed */
  context?: string;
  /** Max wait time in seconds (default: 600 = 10 minutes, 0 = no wait) */
  timeout?: number;
  /** Don't wait — just open and return immediately */
  detach?: boolean;
}

export function launchEditor(args: LaunchEditorArgs): string {
  const { project_path, timeout = 600, detach, mode = "general", context } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project not found: ${project_path}`);

  // Detect Godot executable
  let godotPath: string;
  try {
    godotPath = detectGodotExecutable();
  } catch {
    // Can't launch Godot — show manual instructions instead
    return buildManualInstructions(args);
  }

  const scenePathAbsolute = args.scene_path
    ? path.resolve(project_path, args.scene_path)
    : "";

  // Check if the scene exists; if not, just open the project
  const hasScene = scenePathAbsolute && fs.existsSync(scenePathAbsolute);

  // Record file mtimes before opening
  const before = snapshotMtime(project_path);

  // Build editor arguments
  const editorArgs = ["--editor", "--path", project_path];
  if (hasScene) editorArgs.push(scenePathAbsolute);

  // Build tutorial text
  const tutorial = buildTutorial(mode, args.scene_path, context);

  if (detach) {
    // Detach mode: open and return immediately with tutorial
    const child = spawn(godotPath, editorArgs, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return tutorial + "\n\n" + (
      `✅ Godot 编辑器已启动（已分离）。\n` +
      `   编辑完成后保存，关闭 Godot，然后告诉我你改了什么。`
    );
  }

  // Blocking mode: use spawnSync to wait for Godot to close
  const timeoutMs = timeout > 0 ? timeout * 1000 : undefined;
  console.error(`Launching Godot editor: ${godotPath} ${editorArgs.join(" ")}`);

  // First print the tutorial to stderr so user sees it in the terminal
  console.error("\n" + "=".repeat(60));
  console.error(tutorial);
  console.error("=".repeat(60) + "\n");

  const result = spawnSync(godotPath, editorArgs, {
    stdio: "inherit",
    timeout: timeoutMs,
  });

  if (result.error) {
    return `⚠️ Godot 编辑器异常退出: ${result.error.message}\n\n` + buildManualInstructions(args);
  }
  if (result.status !== 0 && result.status !== null) {
    return `⚠️ Godot 编辑器退出码: ${result.status}\n\n` + buildManualInstructions(args);
  }

  return formatChanges(before, snapshotMtime(project_path));
}

/**
 * Build context-specific tutorial for each editing mode
 */
function buildTutorial(mode: string, scenePath?: string, context?: string): string {
  const scene = scenePath ? `场景: ${scenePath}` : "";
  const ctx = context ? `\n📋 背景说明: ${context}` : "";

  const tutorials: Record<string, string> = {

    ui_layout: `🎨 UI 布局编辑指南

${scene}${ctx}

📐 常用操作:
  1. 选中 Control 节点 → 在 Viewport 上拖拽调整位置/大小
  2. 属性面板 → Rect → 调整 anchor（锚点）/ margin（边距）
  3. 工具栏 → Layout 菜单 → 选择预设布局（Full Rect / Center / Top等）
  4. 子节点会继承父节点的布局约束

💡 布局容器（Container）使用技巧:
  • HBoxContainer — 水平排列子控件
  • VBoxContainer — 垂直排列子控件
  • CenterContainer — 自动居中
  • GridContainer — 网格排列

✅ 做完后: 保存场景 (Ctrl+S)，关闭 Godot。我会读取你调好的布局。`,

    animation: `🎬 动画曲线编辑指南

${scene}${ctx}

🎞️ 常用操作:
  1. 底部 Animation Panel → 选择动画（idle / walk / run 等）
  2. 时间轴上的 ◇ 菱形 = 关键帧，拖拽调时间点
  3. 点击关键帧间的连线 → Inspector 出现曲线编辑器
  4. 拖曲线手柄 → 调整缓动（Ease In / Ease Out / Elastic 等）

🔄 推荐曲线类型:
  • idle→walk 过渡: Ease Out（平滑开始）
  • 弹跳效果: Elastic / Bounce
  • 物理感: Spring / Back
  • 匀速运动: Linear（默认，看起来生硬）

💡 快捷键:
  • K = 插入关键帧  • Shift+拖拽 = 吸附到帧
  • Ctrl+C/V = 复制粘贴关键帧  • 右键关键帧 = 编辑缓动类型

✅ 做完后: 保存 (Ctrl+S)，关闭 Godot。我会读取你调的曲线。`,

    tileset: `🧱 TileSet 编辑指南

${scene}${ctx}

🖼️ 常用操作:
  1. 选中 TileMap 节点 → 下方 TileSet 面板
  2. 从 FileSystem 把贴图拖进 TileSet 面板
  3. 自动切分 → 设置格子尺寸 → 确认
  4. 选中砖块 → 右侧属性面板:

⚡ 需要物理碰撞:
  • TileSet 面板 → 选中砖块 → Physics Layers → 添加层(0)
  • Collision Polygon 0 → 画碰撞形状（方形/三角形/自定义）

🗺️ 地形集（Terrain Sets）:
  • TileSet 面板 → Terrain Sets → 添加 → 设置地形类型
  • 给砖块分配地形 → 自动拼接规则

💡 提示:
  • 翻页用右上角的 Pages 按钮
  • 多个碰撞多边形可以叠加（设置不同层）
  • 地形自动拼接需要至少 4 方向匹配的砖块

✅ 做完后: 保存 (Ctrl+S)，关闭 Godot。我会读取 TileSet 配置继续生成地图。`,

    material: `✨ 材质/着色器编辑指南

${scene}${ctx}

🎨 常用操作:
  1. 选中 Sprite2D / MeshInstance3D → Inspector → Material 槽
  2. 设 New ShaderMaterial / New StandardMaterial3D
  3. 在 Shader 编辑器中写/改着色器代码

🖌️ 标准材质参数:
  • Albedo = 基础颜色 (贴图)
  • Metallic / Roughness = 金属感 / 粗糙度
  • Emission = 自发光（发光效果）
  • Normal Map = 法线贴图（立体感）

💡 可视化着色器:
  • 右键 ShaderMaterial → Open in Visual Shader Editor
  • 拖拽节点连线即可，不用写代码

✅ 做完后: 保存，关掉 Godot。我会读取材质参数。`,

    signal: `🔗 信号连接指南

${scene}${ctx}

🔌 常用操作:
  1. 选中源节点（发出信号的）→ Node 面板（右上角）→ Signals 标签
  2. 找到你要连接的信号（如 body_entered / pressed / timeout）
  3. 双击信号名 → 弹出连接对话框
  4. 选目标节点 → 确认 → 自动生成连接代码

⚡ 或手动连接（适合 GDScript）:
  • 不需要打开编辑器！用 edit_scene 工具的 add_connection
  • 或者直接在脚本里写: \$Button.pressed.connect(_on_button_pressed)

📋 常用信号:
  • Area2D: body_entered / body_exited（碰撞检测）
  • Button: pressed / toggled（按钮点击）
  • Timer: timeout（定时器）
  • AnimationPlayer: animation_finished

✅ 做完后: 保存，关闭 Godot。我会用 edit_scene 继续完善其他连接。`,

    collision: `⬡ 碰撞形状编辑指南

${scene}${ctx}

✏️ 常用操作:
  1. 选中节点 → Inspector → 找 CollisionShape2D / CollisionPolygon2D
  2. 点击 Shape → 选类型（Rectangle / Circle / Capsule / New Polygon）
  3. 如果选 Polygon → 在 2D 视口点击拖拽顶点
  4. 右键顶点 → 删除 / 添加新顶点

⚡ 碰撞多边形精度:
  • 地形碰撞: 用几个大矩形框住即可（不要逐像素画）
  • 角色碰撞: Capsule（胶囊体）最自然
  • 投射物: Circle / Rectangle 就够了
  • 复杂地形: CollisionPolygon2D + 手动画轮廓

💡 碰撞层（Collision Layers）:
  • 不同物理层可以互相设置是否碰撞
  • Layer = 自己属于哪一层  Mask = 跟哪些层碰撞
  • 默认 Layer 1 / Mask 1 = 所有物理体互相碰撞

✅ 做完后: 保存，关闭 Godot。我会读取碰撞形状尺寸。`,

    lighting: `💡 光照编辑指南

${scene}${ctx}

🕯️ 常用操作:
  1. 添加 PointLight2D / DirectionalLight2D（右键 → 光照）
  2. 拖拽光照位置 → 属性面板调参数:
     • Energy = 亮度  • Color = 颜色
     • Shadow = 阴影（启用后调 Shadow Color）
     • Range = 照射范围  • Angle = 角度

🔦 3D 光照:
  • DirectionalLight3D = 太阳光（平行光）
  • OmniLight3D = 点光源  • SpotLight3D = 聚光灯
  • 配合 WorldEnvironment + 环境贴图

⚡ 性能提示:
  • 阴影很耗性能，2D 尽量少用
  • 3D 用 LightmapGI 烘焙静态光照效果好又省性能

✅ 做完后: 保存，关掉 Godot。`,

    general: `✏️ Godot 编辑器 — 手动编辑

${scene}${ctx}

📋 你可以做这些:
  • 拖拽场景中的节点 → 调位置/旋转/缩放
  • Inspector 面板 → 改任意属性
  • 添加新节点（右键场景树 → Add Child Node）
  • 编辑脚本（选中节点 → 右侧 Script 面板）
  • 连接信号（Node 面板 → Signals 标签）

💡 快捷键:
  • W = 移动  • E = 旋转  • R = 缩放
  • F = 聚焦选中  • Ctrl+S = 保存
  • Ctrl+Z = 撤销  • Space = 临时切换拖拽模式

✅ 做完后: 保存，关闭 Godot。我会读取你做的所有改动。`,
  };

  return (tutorials[mode] || tutorials.general) + "\n\n⏱️ 等待模式: 我等你关闭 Godot，然后自动读取改动。想立即返回用 detach=true。";
}

/**
 * Build manual instructions when Godot is not available
 */
function buildManualInstructions(args: LaunchEditorArgs): string {
  const { mode = "general", scene_path, context, project_path } = args;
  const tutorial = buildTutorial(mode, scene_path, context);

  return (
    `⚠️ 找不到 Godot 可执行文件。\n` +
    `请设置 GODOT_PATH 环境变量指向 Godot 4.x 的 exe 路径。\n\n` +
    `手动操作步骤:\n` +
    `  1. 打开 Godot → Import → 选择项目: ${project_path}\n` +
    `  ${scene_path ? `2. 在编辑器中打开场景: ${scene_path}` : ""}\n` +
    `  3. 编辑完成后保存 (Ctrl+S)\n` +
    `  4. 关掉 Godot 后告诉我你做了哪些修改\n\n` +
    tutorial.replace(/✅ 做完后.*/g, "").trim()
  );
}

// ── Snapshot / change detection ──

function snapshotMtime(projectPath: string): Map<string, number> {
  const map = new Map<string, number>();
  try {
    const entries = fs.readdirSync(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(projectPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, map, projectPath, 0);
      } else if (entry.name.endsWith(".tscn") || entry.name.endsWith(".gd") || entry.name.endsWith(".tres") || entry.name.endsWith(".godot")) {
        try { const stat = fs.statSync(fullPath); map.set(path.relative(projectPath, fullPath).replace(/\\/g, "/"), stat.mtimeMs); } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return map;
}

function walkDir(dir: string, map: Map<string, number>, base: string, depth: number) {
  if (depth > 4) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { walkDir(fullPath, map, base, depth + 1); }
      else if (entry.name.endsWith(".tscn") || entry.name.endsWith(".gd") || entry.name.endsWith(".tres") || entry.name.endsWith(".godot")) {
        try { const stat = fs.statSync(fullPath); map.set(path.relative(base, fullPath).replace(/\\/g, "/"), stat.mtimeMs); } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
}

function formatChanges(before: Map<string, number>, after: Map<string, number>): string {
  const changed: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  for (const [file, mtimeAfter] of after) {
    const mtimeBefore = before.get(file);
    if (mtimeBefore === undefined) added.push(file);
    else if (mtimeAfter !== mtimeBefore) changed.push(file);
  }
  for (const file of before.keys()) { if (!after.has(file)) deleted.push(file); }

  const lines: string[] = ["✅ Godot 编辑器已关闭。修改摘要："];
  if (changed.length > 0) lines.push("", "修改的文件："); for (const f of changed) lines.push(`  • ${f}`);
  if (added.length > 0) lines.push("", "新增的文件："); for (const f of added) lines.push(`  • ${f}`);
  if (deleted.length > 0) lines.push("", "删除的文件："); for (const f of deleted) lines.push(`  • ${f}`);
  if (changed.length === 0 && added.length === 0 && deleted.length === 0) lines.push("  （未检测到任何改动）");
  lines.push("", "需要我读取这些文件看具体改了些什么吗？");
  return lines.join("\n");
}
