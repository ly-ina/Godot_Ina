# Godot MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml/badge.svg)](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/tests-313%20passed-brightgreen)]()
[![Node](https://img.shields.io/badge/node-20%2B-blue)]()

**跟 AI 说句话，它就能帮你做游戏。**

> 这是一个 [MCP](https://modelcontextprotocol.io/) 服务器，让 AI 助手可以直接读写你的 Godot 项目。  
> 不是"只能帮你写代码"——从场景搭建到脚本编写，从资源管理到全项目生成，34 个工具覆盖开发全流程。  
> 313 个测试确保每个工具稳定可靠，95% 行覆盖率。

---

## 这是真的吗？

是的。看看 AI 用这个工具能做什么：

```
你跟 AI 说：
  "帮我做一个 2D 平台跳跃游戏，有玩家、敌人、金币"

AI 实际做的事：
  1. init_project()        → 创建项目骨架
  2. generate_component()  → 生成玩家控制器（移动/跳跃/受伤）
  3. generate_component()  → 生成敌人巡逻AI
  4. generate_component()  → 生成金币收集脚本
  5. add_node()            → 搭建场景节点树
  6. edit_project_settings → 配置主场景

结果：一个可以直接在 Godot 里运行的完整项目。
```

**_现在还支持一键生成完整的示例项目：`generate_example_project`_**

---

## 34 个工具，按能力分组

### 📦 场景编辑 — 创建 / 读取 / 修改 / 删除

| 工具 | 一句话用途 | 典型参数 |
|------|-----------|---------|
| `create_scene` | 创建 .tscn 场景 | 指定根节点名称和类型 |
| `read_scene` | 解析场景为结构化数据 | 只给路径即可 |
| `list_scenes` | 扫描所有场景文件 | 自动过滤 `__` 临时文件 |
| `add_node` | 向场景加节点 | 指定父节点、类型、名称 |
| `edit_node` | 改节点属性 | 支持新增/更新/删除属性 |
| `delete_node` | 删节点 | 默认拒绝删除有子节点的节点 |
| `rename_node` | 重命名节点 | 自动更新子节点和连接的引用 |
| `validate_scene` | 校验场景完整性 | 重复名称/引用/格式检查 |

### 📝 脚本管理 — 创建 / 读取 / 编辑 / 执行

| 工具 | 一句话用途 | 亮点 |
|------|-----------|------|
| `create_script` | 创建 .gd 文件 | 可选自动绑定到场景节点 |
| `read_script` | 读取脚本内容 | 返回行数 + 完整文本 |
| `edit_script` | 搜索替换修改脚本 | **自动 .bak 备份** |
| `batch_edit_script` | 跨文件搜索替换 | 支持筛选 .gd / .tscn / 全部 |
| `execute_gdscript` | 通过 Godot CLI 执行代码 | 返回 stdout/stderr |

### ⚙️ 项目运维 — 运行 / 配置 / 管理

| 工具 | 一句话用途 | 亮点 |
|------|-----------|------|
| `run_project` | 用 Godot CLI 运行项目 | 支持 normal/headless/debug |
| `delete_file` | 删除项目文件 | **默认入回收站，可恢复** |
| `read_project_settings` | 读取 project.godot | 按 section 分组展示 |
| `edit_project_settings` | 修改配置 | **自动 .bak 备份** |
| `init_project` | 一键创建项目骨架 | 目录结构 + 配置文件 + 主场景 |
| `import_resource` | 导入外部资源 | 自动建目录 |
| `delete_resource` | 删除资源 | **引用安全检查：有引用时报错** |

### 🔍 搜索与校验 — 找到问题，找到引用

| 工具 | 一句话用途 |
|------|-----------|
| `search_nodes` | 按类型/名称/属性跨场景搜节点 |
| `find_references` | 搜资源/脚本被哪些场景引用 |
| `validate_project` | 校验整个项目 |
| `analyze_project` | **全量分析**：场景、脚本、资源、架构洞察 |

### 🤖 自动生成 — 说句话就给你造出来

| 工具 | 生成内容 | 开箱即用 |
|------|---------|---------|
| `generate_component` | 8 种游戏组件（player/enemy/hud/health/projectile/spawner/level...） | ✅ 含脚本+场景 |
| `generate_terrain` | **Minecraft 风无限地形**（固定地图/无限区块/洞穴/矿物/液体/植被） | ✅ 完整系统 |
| `generate_behavior_tree` | **Sims 风行为树 AI**（需求系统/人格特质/日程/行为选择） | ✅ 完整系统 |
| `generate_equipment_system` | **泰拉瑞亚风装备系统**（分层渲染/背包/合成） | ✅ 完整系统 |
| `generate_scene_transition` | **星露谷物语场景切换**（区域/过渡门/持久状态/小地图） | ✅ 完整系统 |
| `generate_slg_map` | **策略游戏地图**（六角格/A*寻路/战争迷雾/回合系统） | ✅ 完整系统 |
| `generate_example_project` | **完整游戏项目**（4 种模板） | ✅ 打开就能玩 |
| `translate_project` | **Godot 3.x → 4.x 一键转换** | ✅ 自动备份 |

---

## 开发工作流对比

### 传统方式

```
手动打开 Godot → 新建场景 → 拖节点 → 设置属性 → 写脚本 → 调试 → 迭代
```

### 用这个工具

```
跟 AI 说："创建一个 2D RPG 项目，主角能移动对话，有商店NPC"
↓
AI 自动执行 10+ 个工具调用
↓
打开 Godot 时，项目已经准备好了
```

---

## 项目状态

| 指标 | 数值 |
|------|------|
| MCP Tools | **34** 个 |
| 测试用例 | **313** 个（27 个测试文件） |
| 行覆盖率 | **95%** |
| CI | GitHub Actions (Node 20 / 22 / ubuntu-24.04) |

---

## 安装

**前置条件**：Node.js 20+，Godot 4.x（可选）

```bash
git clone https://github.com/ly-ina/Godot_Ina.git
cd Godot_Ina
npm install
npm run build
```

**配置 Godot 路径**（可选，仅 `run_project` / `execute_gdscript` 需要）：

```bash
set GODOT_PATH=C:\path\to\Godot_v4.7-stable_win64.exe
```

### 在 AI 助手中使用

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

**WorkBuddy：** 在 MCP 设置面板中添加服务器路径。

---

## 架构

```
src/
├── index.ts          MCP Server 入口
├── tools/            34 个工具实现
│   ├── dispatch.ts   分发层
│   ├── scene/*       场景编辑
│   ├── script/*      脚本管理
│   ├── project/*     项目运维
│   ├── search/*      搜索校验
│   └── generate/*    自动生成（9 个生成器）
├── parsers/          .tscn 状态机解析器
├── writers/          .tscn 生成器
├── godot/            Godot CLI 封装
├── adapters/         Godot 3.x / 4.x 版本适配
└── utils/            节点树工具
```

---

## 常见问题

### 需要 Godot 安装才能用吗？
大部分工具**不需要**。只有 `run_project` 和 `execute_gdscript` 需要真实 Godot。场景编辑、脚本管理、搜索校验等工具完全独立运行。

### 支持 Godot 3.x 吗？
**支持。** `translate_project` 工具可以一键将整个 Godot 3.x 项目转换为 4.x 格式——节点类型映射 + GDScript 语法转换 + 配置更新。

### 安全吗？
- 所有文件操作限制在项目目录范围内
- 编辑前自动 `.bak` 备份
- 删除默认回收站模式
- `delete_resource` 有引用安全检查

---

**ly-ina** · [GitHub](https://github.com/ly-ina) · [Godot_Ina](https://github.com/ly-ina/Godot_Ina)

**最后更新**：2026-07-02 · **版本**：v0.2.0
