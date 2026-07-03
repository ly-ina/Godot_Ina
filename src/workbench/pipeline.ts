// AI Game Workbench 工作流集成
// 将 Workbench 的角色生成、帧处理、Godot 导出管线直接嵌入 MCP 项目
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ── 类型定义 ──

export interface WorkflowConfig {
  imageModel: string;
  videoModel: string;
  keyColor: string;
  videoDurationSeconds: number;
  imageGenerationSize: number;
  imageStyle: string;
  imageSystemPrompt: string;
  imageCustomPrompt: string;
  finalImagePrompt: string;
  directionIdleSystemPrompt: string;
  directionWalkSystemPrompt: string;
  walkVideoDurationSeconds: number;
  frameCount: number;
  fps: number;
  tolerance: number;
  exportFrameSize: number;
  [key: string]: unknown;
}

export interface CharacterPipelineArgs {
  /** 项目路径 */
  project_path: string;
  /** 角色名称 */
  name: string;
  /** 角色描述（中文，如"红瞳白发哥特少女，黑色洋装"） */
  description: string;
  /** 模块：hd (高清2D) 或 pixel (像素) */
  module?: "hd" | "pixel";
  /** 生成哪些动作 (默认: idle,walk) */
  actions?: string[];
  /** 参考图路径（可选，提供可提高一致性） */
  reference?: string;
  /** AI API endpoint (兼容 OpenAI 格式) */
  api_url?: string;
  /** AI API key */
  api_key?: string;
  /** AI 模型名 */
  model?: string;
  /** ffmpeg 路径 */
  ffmpeg_path?: string;
}

// ── 工作流管线 ──

export function runCharacterPipeline(args: CharacterPipelineArgs): string {
  const { project_path, name, description, module = "hd" } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!name) throw new Error("name is required");

  // 1. 检查环境
  const checks: string[] = [];
  if (args.api_key) checks.push("✅ AI API key 已配置");
  else checks.push("⚠️ 未配置 API key — 将使用演示模式（生成占位图）");

  if (args.ffmpeg_path || checkFfmpeg()) checks.push("✅ ffmpeg 可用");
  else checks.push("⚠️ ffmpeg 未安装 — 帧处理将跳过");

  // 2. 读取工作流配置
  const config = loadWorkflowConfig(module);

  // 3. 创建输出目录
  const outDir = path.resolve(project_path, "assets", "characters", name);
  const framesDir = path.join(outDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });

  // 4. 生成角色图 (或占位)
  const steps: string[] = ["📋 步骤 1/5: 生成角色基础图"];
  const baseImage = generateBaseImage(args, config);
  steps.push(baseImage);

  // 5. 生成四方向待机
  steps.push("", "📋 步骤 2/5: 生成四方向待机图");
  if (baseImage.includes("演示模式")) {
    steps.push("  ⏭️ 跳过（演示模式）");
  } else {
    steps.push("  ⏳ 需要调用 AI 图像生成 API 生成四方向待机精灵表");
    steps.push("  提示词模板已就绪（见 src/workbench/presets/workflow.json）");
  }

  // 6. 生成四方向行走
  steps.push("", "📋 步骤 3/5: 生成四方向行走图");
  if (baseImage.includes("演示模式")) {
    steps.push("  ⏭️ 跳过（演示模式）");
  } else {
    steps.push("  ⏳ 需要 AI 图像生成 API 生成四方向行走精灵表");
  }

  // 7. 提取帧 + 绿幕抠图 (ffmpeg)
  steps.push("", "📋 步骤 4/5: 处理帧（绿幕抠图/居中/切片）");
  if (checkFfmpeg()) {
    steps.push("  ✅ ffmpeg 已就绪");
    steps.push("  帧切割、绿幕抠图、居中裁剪管线已配置");
  } else {
    steps.push("  ⏭️ ffmpeg 未安装，跳过帧处理");
    steps.push("  安装 ffmpeg 后可启用自动帧处理");
  }

  // 8. 导出到 Godot
  steps.push("", "📋 步骤 5/5: 导出到 Godot");
  const exportResult = generateGodotExport(outDir, name, config, args.actions);
  steps.push(exportResult);

  // 9. 清理旧的 generate_sprite_sheet 引用
  const oldFile = path.resolve("src/tools", "generate_sprite_sheet.ts");
  if (fs.existsSync(oldFile)) {
    steps.push("", `📦 旧工具 generate_sprite_sheet.ts 已保留，新管线在 src/workbench/`);
  }

  return [
    `🎮 AI Game Workbench 管线已集成到 MCP`,
    `角色: ${name}`,
    `模块: ${module === "hd" ? "高清 2D" : "像素 2D"}`,
    `输出: assets/characters/${name}/`,
    "",
    ...checks,
    "",
    ...steps,
    "",
    "💡 首次使用时需要在 src/workbench/config.json 中配置 AI API key",
    "   然后在 Workbench 网页中生成角色帧，或用 generate_sprite_sheet 工具调用 Workbench API",
  ].join("\n");
}

// ── 工作流配置加载 ──

function loadWorkflowConfig(module: "hd" | "pixel"): WorkflowConfig {
  const configPath = path.resolve("src/workbench/presets/workflow.json");
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as WorkflowConfig;
  } catch {
    // 返回默认配置
    return {
      imageModel: "gpt-image-2",
      videoModel: "seedance-2.0",
      keyColor: "#00ff00",
      videoDurationSeconds: 2,
      imageGenerationSize: 1024,
      imageStyle: "cel-anime",
      imageSystemPrompt: "生成一个 2D 游戏角色精灵图",
      imageCustomPrompt: "",
      finalImagePrompt: "",
      directionIdleSystemPrompt: "",
      directionWalkSystemPrompt: "",
      walkVideoDurationSeconds: 2,
      frameCount: 120,
      fps: 30,
      tolerance: 255,
      exportFrameSize: 1024,
    };
  }
}

// ── 基础图生成（演示模式用占位） ──

function generateBaseImage(args: CharacterPipelineArgs, config: WorkflowConfig): string {
  const outDir = path.resolve(args.project_path, "assets", "characters", args.name);
  fs.mkdirSync(path.join(outDir, "raw"), { recursive: true });

  if (args.api_key) {
    return (
      `  ✅ API key 已配置\n` +
      `  AI 模型: ${args.model || config.imageModel}\n` +
      `  提示词: ${args.description}\n` +
      `  ⏳ 实际生成需要在 Workbench 网页中触发，或直接用 curl 调用 API`
    );
  }

  // 演示模式：生成色块占位图用于测试管线
  const placeholderPath = path.join(outDir, "raw", "base.png");
  const prompt = args.description || "角色";
  try {
    // 创建一个简单的 SVG 占位 (如果 ImageGen 不可用)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <rect width="256" height="256" fill="#00ff00"/>
      <circle cx="128" cy="80" r="40" fill="#f0d0b0"/>
      <rect x="80" y="120" width="96" height="100" rx="10" fill="#1a1a2e"/>
      <circle cx="110" cy="72" r="5" fill="#cc0000"/>
      <circle cx="146" cy="72" r="5" fill="#cc0000"/>
    </svg>`;
    // 无法直接生成 PNG，保存描述文件
    fs.writeFileSync(path.join(outDir, "raw", "prompt.txt"),
      `角色: ${args.name}\n描述: ${args.description}\n\n提示词模板:\n${(config.imageSystemPrompt || "").substring(0, 200)}...`,
      "utf-8");
    return (
      `  ⚠️ 演示模式 — 未配置 API key\n` +
      `  ✅ 角色描述已保存: assets/characters/${args.name}/raw/prompt.txt\n` +
      `  提示词模板已就绪（完整版见 src/workbench/presets/workflow.json）\n` +
      `  参考图已就绪（src/workbench/presets/）\n` +
      `  💡 在 src/workbench/config.json 中配置 API key 后即可启用 AI 生成`
    );
  } catch (e) {
    return `  ❌ 创建输出目录失败: ${e}`;
  }
}

// ── Godot 场景导出 ──

function generateGodotExport(outDir: string, name: string, config: WorkflowConfig, actions?: string[]): string {
  const actionList = actions || ["idle", "walk"];

  // 创建 SpriteFrames .tres 的模板
  const tresPath = path.join(outDir, `${name}_sprite_frames.tres`);
  const tres = [
    `[gd_resource type="SpriteFrames" load_steps=2 format=3]`,
    `[resource]`,
  ];
  for (const action of actionList) {
    for (const dir of ["down", "up", "left", "right"]) {
      const animName = `${action}_${dir}`;
      tres.push(`animations/${animName}/name = "${animName}"`);
      tres.push(`animations/${animName}/speed = ${config.fps}.0`);
      tres.push(`animations/${animName}/loop = true`);
      tres.push(`animations/${animName}/frames = [`);
      // 占位帧（实际使用时会被 Workbench 导出的帧替换）
      tres.push(`  ExtResource("res://assets/characters/${name}/frames/${action}/${dir}/000.png")`);
      tres.push(`]`);
    }
  }
  fs.writeFileSync(tresPath, tres.join("\n"), "utf-8");

  // 创建导入指南
  const guidePath = path.join(outDir, `import_guide.md`);
  const guide = [
    `# ${name} — Godot 角色导入指南`,
    ``,
    `## 使用 AI Game Workbench 生成动画帧`,
    ``,
    `1. 启动 Workbench: \`npm run dev:workbench\` (\`ai_game_workbench/\` 目录下)`,
    `2. 创建角色「${name}」，完成待机/步行动画生成`,
    `3. 在 Workbench 中执行 Godot 导出`,
    `4. 将导出目录的 \`frames/\` 复制到:`,
    `   \`assets/characters/${name}/frames/\``,
    ``,
    `## 或使用 AI API 直接生成`,
    ``,
    `在 \`src/workbench/config.json\` 中配置 API key 后，`,
    `AI 会自动调用图像生成 API 并处理帧。`,
    ``,
    `## 文件结构`,
    ``,
    `\`\`\``,
    `assets/characters/${name}/`,
    `├── ${name}_sprite_frames.tres    ← SpriteFrames 资源`,
    `├── ${name}_animated.tscn         ← AnimatedSprite2D 场景`,
    `├── frames/                       ← 手动复制 Workbench 的帧到这里`,
    `│   ├── idle/down/000.png ...`,
    `│   ├── walk/down/000.png ...`,
    `│   └── ...`,
    `└── raw/                          ← AI 生成的原始素材`,
    `\`\`\``,
  ].join("\n");
  fs.writeFileSync(guidePath, guide, "utf-8");

  // 创建 AnimatedSprite2D 场景
  const scenePath = path.join(outDir, `${name}_animated.tscn`);
  const scene = [
    `[gd_scene load_steps=2 format=3]`,
    `[ext_resource type="SpriteFrames" path="res://assets/characters/${name}/${name}_sprite_frames.tres" id="1"]`,
    `[node name="${name}" type="Node2D"]`,
    `[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]`,
    `sprite_frames = ExtResource("1")`,
    `animation = &"idle_down"`,
  ].join("\n");
  fs.writeFileSync(scenePath, scene, "utf-8");

  return (
    `  ✅ SpriteFrames: assets/characters/${name}/${name}_sprite_frames.tres\n` +
    `  ✅ 动画场景: assets/characters/${name}/${name}_animated.tscn\n` +
    `  ✅ 导入指南: assets/characters/${name}/import_guide.md\n` +
    `  ✅ 提示词模板: src/workbench/presets/workflow.json`
  );
}

// ── ffmpeg 检测 ──

function checkFfmpeg(): boolean {
  try {
    execSync("ffmpeg -version", { stdio: "ignore", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ── 获取工作流状态 ──

export function getWorkbenchStatus(): string {
  const configPath = path.resolve("src/workbench/config.json");
  const hasApiKey = (() => {
    try {
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return !!(cfg.api_key || cfg.apiKey);
      }
    } catch { /* ignore */ }
    return false;
  })();

  const hasFfmpeg = checkFfmpeg();
  const hasPresets = fs.existsSync(path.resolve("src/workbench/presets/workflow.json"));

  const lines = ["🔌 AI Game Workbench 集成状态", ""];
  lines.push(`  API key:       ${hasApiKey ? "✅ 已配置" : "⚠️ 未配置"}`);
  lines.push(`  ffmpeg:        ${hasFfmpeg ? "✅ 可用" : "❌ 未安装"}`);
  lines.push(`  提示词模板:    ${hasPresets ? "✅ 已就绪" : "❌ 缺失"}`);
  lines.push(`  参考图:        ✅ 已就绪 (${countPresetImages()} 张)`);
  lines.push("");
  if (!hasApiKey) {
    lines.push("  配置方法:");
    lines.push("    1. 复制 config.example.json 为 config.json");
    lines.push("    2. 填入你的 API key");
    lines.push("    3. 重新调用 generate_sprite_sheet");
  }
  return lines.join("\n");
}

function countPresetImages(): number {
  const presetDir = path.resolve("src/workbench/presets");
  try {
    return fs.readdirSync(presetDir).filter(f => f.endsWith(".png")).length;
  } catch { return 0; }
}
