# Godot MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml/badge.svg)](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml)

让 AI 直接读写 Godot 项目文件。10 个工具，285 个测试。

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
- **完整角色动画 demo**（CharacterBody2D + AI 行为 + 程序化动画）

---

## 10 个工具列表

| 工具 | 作用 | 合并了哪些旧工具 |
|------|------|-----------------|
| `init_project` | 创建标准项目骨架 | |
| `edit_scene` | 场景/节点的 CRUD 操作 | 8 个旧工具：create/read/list_scenes, add/edit/delete/rename/validate |
| `edit_script` | 脚本的增删改查 + 批量替换 | 4 个旧工具：create/read/edit/batch_edit |
| `edit_settings` | 读写 project.godot 配置 | 2 个旧工具：read/write settings |
| `generate_game` | **生成各种游戏系统** | 10 个旧工具：component/terrain/behavior_tree/equipment/scene_transition/slg_map/example/sprite/animation/demo |
| `run_project` | 运行项目或执行 GDScript | 2 个旧工具：run_project + execute_gdscript |
| `analyze_project` | 搜索/引用/校验/分析 | 4 个旧工具：search/find_refs/validate/analyze |
| `manage_assets` | 资源导入/删除/列出 | 3 个旧工具：import/delete/list resources |
| `translate_project` | Godot 3.x 转 4.x | |
| `generate_template` | **2D 游戏模板**（平台/RPG/射击/策略） | 新增 阶段C |
| `generate_scene_3d` | **3D 场景基础**（FPS/TPS 控制器） | 新增 阶段C |
| `fetch_asset` | **Asset Library 集成**（搜索/下载资源） | 新增 阶段C |
| `ping` | 连通性检查 | |

---

## 项目状态

| 指标 | 数值 |
|------|------|
| 工具数 | 13（合并自 37 个旧工具 + 插件系统） |
| 测试数 | 285（27 个文件） |
| 行覆盖率 | 95% |
| CI | GitHub Actions（Node 20/22，Ubuntu 24.04） |

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

## 架构大概

```
src/
├── index.ts         入口
├── tools/           37 个工具
│   ├── dispatch.ts  分发
│   └── *.ts         各工具
├── parsers/         .tscn 解析器（格式 3）
├── writers/         .tscn 生成器
├── godot/           Godot CLI 封装
├── adapters/        版本适配（v3/v4）
└── utils/           工具函数
```

设计特点：
- 解析器是手写状态机，零依赖
- 适配器是工厂模式，自动检测版本
- 所有修改操作会自动备份
- **场景文件直接写完整 `.tscn`**（不依赖 addNode 片段工具组装，避免空节点问题）

---

## 未来展望

### 已完成阶段

- **阶段 A — 稳定** ✅ 工具整合 37→13，285 测试，.tscn 规范，GDScript 严格模式
- **阶段 B — 系统化** ✅ 共享主题配置、插件注册系统、模板生成器
- **阶段 C — 制作** ✅ 2D 模板库 `generate_template`、3D 场景 `generate_scene_3d`、资产库 `fetch_asset`
- **阶段 D — 生态** ✅ Godot 编辑器插件、外部生成器扩展、Web 场景预览

### 下一阶段 — 质量（当前）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| 🔴 P0 | npm 发布 | 发布到 npm，`npx godot-mcp-server` 直接使用 |
| 🔴 P0 | 错误信息优化 | 所有工具的异常信息改为中文可读、带解决方案建议 |
| 🟠 P1 | 场景校验强化 | `edit_scene validate` 检测节点引用断裂、资源依赖缺失 |
| 🟠 P1 | 生成器输出验证 | 每次 `generate_game` 自动校验输出的 .tscn 格式合法性 |
| 🟡 P2 | CI 多平台测试 | 在 GitHub Actions 中增加 Windows + macOS 运行矩阵 |
| 🟡 P2 | 贡献者指南 | 完善 CONTRIBUTING.md，补充插件开发文档 |
| 🔵 P3 | 性能基准 | 对大型项目（50+ 场景）做生成/解析性能测试 |

### 远期目标

#### 热门游戏系统逐个实现
来自 `generate_game` 的 `type` 列表，每个系统都是一个可独立运行的 .tscn：

| 系统 | 优先级 | 说明 |
|------|--------|------|
| 对话树 + 分支叙事 | 🟠 P1 | 带条件判断的多分支对话，支持选项检定 |
| 合成 + 建造系统 | 🟠 P1 | 配方、网格摆放、工作台升级 |
| 昼夜循环 + 天气 | 🟡 P2 | 光照变化、雨雪粒子、季节影响 |
| 任务/成就系统 | 🟡 P2 | 追踪式任务链、子目标进度、完成奖励 |
| 经济/商店系统 | 🟡 P2 | 商品买卖、价格浮动、店铺升级 |
| 技能树/天赋 | 🔵 P3 | 可升级技能树、被动/主动技能设计 |
| 存档/读档 | 🔵 P3 | JSON/二进制序列化、自动备份 |
| 联机同步 | 🔵 P3 | Godot 多人同步、延迟补偿 |

#### 平台化

- **npm 发布** — `npx godot-mcp-server` 零配置使用
- **VSCode 扩展** — 编辑器内直接调用 MCP 工具
- **Godot 4.x 全版本兼容** — 适配 4.0 ~ 4.7 的 API 变化
- **插件市场** — 社区贡献的生成器可在线安装

---

## 已知限制

### AI 生成精灵图
`generate_sprite` 使用 ImageGen AI 生成角色立绘/对话肖像。
AI 生成的图片是**插画级单帧静图**，不是多帧精灵表，不适合用作游戏角色行走/奔跑动画。

如果你需要动画精灵表：
1. 从 itch.io / OpenGameArt / Kenney 下载现成精灵表
2. 用 Aseprite 等工具手工绘制
3. 然后用 `import_resource` 导入到项目中使用

另外，AI 生成的 PNG 边缘可能有半透明白色残留，需在 Godot 中执行 `--headless --import` 预处理。

### Godot 4 严格模式
本项目的 `demo_character` 生成的 GDScript 遵循 Godot 4 严格模式规范：
- 所有局部变量显式声明类型（`var x: float = absf(y)`）
- 使用 `absf()` 而非 `abs()` 避免类型推断错误
- 使用 `if x == null:` 替代 `if not x:` 的隐式布尔转换

---

## 调试说明

遇到白屏/角色不可见问题时，用 Godot 的 `--script` 模式代替 `--scene` 模式测试：
```bash
godot --headless --script "res://scripts/test_debug.gd"
```
`--script` 模式会暴露 GDScript 解析错误和场景树结构问题，比 `--scene` 模式的错误信息更完整。

---

## 常见问题

**需要装 Godot 吗？**
大部分功能不需要。只有运行项目和执行脚本需要。

**支持 Godot 3.x 吗？**
支持。`translate_project` 可以一键把整个 3.x 项目转成 4.x。

**安全吗？**
文件操作限制在项目目录内，编辑前自动 .bak 备份，删除默认用回收站。

**能做什么样的游戏？**
2D 平台跳跃、RPG、俯视角射击、策略游戏都能做。3D 需要自己搭场景，工具只管生成脚本和结构。

---

**ly-ina** · [GitHub](https://github.com/ly-ina)

**最后更新**：2026-07-03
