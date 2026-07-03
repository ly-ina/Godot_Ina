# Godot MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml/badge.svg)](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml)

让 AI 直接读写 Godot 项目文件。16 个核心工具，286 个测试。

---

## 这玩意能干啥

一个 MCP 服务器，装到 Claude Desktop 或 WorkBuddy 里之后，AI 就能直接操作你的 Godot 项目。

**能做的事情：**
- 读/写/改/删 `.tscn` 场景文件和节点
- 读/写/改/批量改 `.gd` 脚本
- 创建/删除资源文件
- 读/写 `project.godot` 配置
- 跨场景搜索节点、查找引用
- 校验场景和项目完整性
- 用 Godot CLI 运行项目、执行代码片段
- Godot 3.x 项目一键转 4.x

**一键生成游戏系统（直接出完整 .tscn + .gd）：**
- 8 种游戏组件（玩家、敌人、收集品、HUD、血量、子弹、生成器、关卡）
- Minecraft 风格无限地形（带洞穴/矿物/液体/植被）
- NPC 行为树 AI（带需求/人格/日程系统）
- 泰拉瑞亚风格装备系统（分层渲染、背包、合成）
- 星露谷物语风格场景切换（区域管理、过渡门、小地图）
- SLG 策略地图（六角格、A* 寻路、战争迷雾、回合制）
- 4 种完整示例项目（平台跳跃、RPG 对话、俯视角射击、FPS）
- 完整角色动画 demo（CharacterBody2D + AI 行为 + 程序化动画）
- 3D 场景基础（FPS/TPS 控制器）
- 2D 游戏模板（平台/RPG/射击/策略）

---

## 13 个工具

### 场景脚本管理

| 工具 | 作用 |
|------|------|
| `init_project` | 创建标准 Godot 4 项目骨架 |
| `edit_scene` | 场景/节点的 CRUD 操作 + 校验 |
| `edit_script` | 脚本 CRUD + 批量替换 |
| `edit_settings` | 读写 project.godot 配置 |
| `run_project` | 运行项目 + 执行 GDScript 片段 |
| `analyze_project` | 跨场景搜索节点、查找引用、校验完整性 |
| `manage_assets` | 资源导入/删除/列出 |
| `search_code` | **跨文件搜索 GDScript 文本**（支持正则） |
| `analyze_deps` | **分析资源依赖关系**（谁引用了谁） |
| `batch_edit` | **批量改多个文件**（替换文本/节点类型/属性） |

### 游戏系统生成

| 工具 | 作用 |
|------|------|
| `generate_game` | 根据 type 参数生成 10+ 种游戏系统 |
| `generate_template` | 2D 游戏模板（平台跳跃/RPG/射击/策略） |
| `generate_scene_3d` | 3D 场景基础（含 FPS/TPS 控制器） |
| `fetch_asset` | Godot Asset Library 搜索 + 直接下载 |

### 工具 & 兼容

| 工具 | 作用 |
|------|------|
| `translate_project` | Godot 3.x 项目一键转 4.x |
| `ping` | 连通性检查 |

---

## 相关仓库

| 项目 | 地址 | 说明 |
|------|------|------|
| 核心 | `ly-ina/Godot_Ina` | **本仓库**：MCP 服务器 |
| 编辑器插件 | [`ly-ina/godot-mcp-plugin`](https://github.com/ly-ina/godot-mcp-plugin) | Godot 编辑器内启停 MCP 服务器 |
| 场景预览 | [`ly-ina/godot-mcp-preview`](https://github.com/ly-ina/godot-mcp-preview) | 浏览器查看 .tscn 场景树 |

---

## 安装

需要 Node.js 20+。Godot 是可选的——只有 `run_project` 和 `execute_gdscript` 需要。

```bash
git clone https://github.com/ly-ina/Godot_Ina.git
cd Godot_Ina
npm install
npm run build
```

如果用 Godot 的 CLI 功能，设置环境变量：
```bash
set GODOT_PATH=C:\path\to\Godot_v4.7-stable_win64.exe
```

### 配置 AI 助手

**Claude Desktop：**
```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/path/to/Godot_Ina/dist/index.js"]
    }
  }
}
```

**WorkBuddy：** MCP 设置面板里加路径就行。

验证安装：
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

---

## 项目状态

| 指标 | 数值 |
|------|------|
| 核心工具 | 16（合并自 37 个旧工具 + 3 个新增） |
| 测试数 | 286（27 个文件） |
| 行覆盖率 | 95% |
| CI | Ubuntu / Windows / macOS（macOS 仅 Node 22） |
| 项目大小 | ~1.8MB（不含 node_modules） |

---

## 架构

```
src/
├── index.ts              入口
├── tools/                18 个文件
│   ├── dispatch.ts       分发层
│   ├── edit_scene.ts 等  13 个暴露工具
│   ├── error-messages.ts 中文错误信息
│   ├── validate_scene.ts 场景校验
│   ├── plugin-registry.ts 插件注册系统
│   ├── plugin_loader.ts   自动加载插件
│   └── impl/             32 个内部实现（不直接调用）
├── parsers/              手写 .tscn 解析器（零依赖）
├── writers/              .tscn 生成器
├── godot/                Godot CLI 封装
├── adapters/             版本适配（v3/v4 工厂模式）
├── config/               共享主题/配色配置
└── utils/                工具函数
```

设计特点：
- 解析器是手写状态机，零外部依赖
- 适配器自动检测 Godot 版本，按版本分发
- 所有修改操作自动 `.bak` 备份
- **直接写完整 `.tscn`**——不依赖 addNode 片段组装，避免空节点问题
- 32 个内部实现在 `impl/` 下，顶层只保留暴露接口

---

## 已知限制

### AI 生成精灵图
`generate_sprite` 使用 ImageGen 生成角色立绘/对话肖像。
AI 生成的是**插画级单帧静图**，不是多帧精灵表，不适合做行走/奔跑动画。

如果你需要动画精灵表：
1. 从 itch.io / OpenGameArt / Kenney 下载现成精灵表
2. 用 Aseprite 手工绘制
3. 然后用 `manage_assets` 导入到项目使用

### GDScript 严格模式
生成的所有 `.gd` 脚本遵循 Godot 4 严格模式规范：
- 所有局部变量显式声明类型（`var x: float = absf(y)`）
- 使用 `absf()` 而非 `abs()` 避免类型推断错误
- 使用 `if x == null:` 替代 `if not x:` 的隐式布尔转换

---

## 调试说明

遇到白屏/角色不可见问题时，用 Godot 的 `--script` 模式代替 `--scene` 模式：
```bash
godot --headless --script "res://scripts/test_debug.gd"
```
`--script` 模式会暴露 GDScript 解析错误和场景树结构问题，比 `--scene` 模式的错误信息更完整。

---

## 未来展望

### 已完成

- **阶段 A — 稳定** ✅ 工具整合 37→13，.tscn 规范，GDScript 严格模式
- **阶段 B — 系统化** ✅ 共享主题配置、插件注册系统
- **阶段 C — 制作** ✅ 2D 模板、3D 场景、Asset Library 集成
- **阶段 D — 生态** ✅ 编辑器插件、场景预览、插件开发文档
- **瘦身** ✅ 删除垃圾文件，32 个内部工具移入 `impl/`，分离编辑器插件和 Web 预览到独立仓库

### 待办

| 优先级 | 任务 | 状态 |
|--------|------|------|
| 🔴 P0 | npm 发布（`npx godot-mcp-server`） | ⏳ |
| 🟠 P1 | 生成器拆包（`godot-mcp-generators`） | 📋 待规划 |
| 🟡 P2 | 对话树/合成/昼夜等热门游戏系统 | 📋 待规划 |

### 平台化

- `npx godot-mcp-server` 零配置使用
- 生成器市场——社区贡献的生成器在线安装
- VSCode 扩展——编辑器内直接调用 MCP 工具

---

**ly-ina** · [GitHub](https://github.com/ly-ina)

**最后更新**：2026-07-03
