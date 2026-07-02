# godot-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/godot-mcp-server.svg)](https://www.npmjs.com/package/godot-mcp-server)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)]()

让 AI 助手直接读写 Godot 项目文件的 MCP Server — Godot 开发的 AI 原生基础设施。

## 📋 目录

- [简介](#简介)
- [能力概览](#能力概览)
- [开发计划](#开发计划)
- [安装](#安装)
- [使用](#使用)
- [开发](#开发)
- [贡献](#贡献)
- [许可](#许可)

---

## 简介

`godot-mcp-server` 是一个基于 Model Context Protocol (MCP) 的服务器，让 AI 助手可以直接读写 Godot 项目文件。它是连接 AI 与 Godot 的桥梁，使 AI 能够：

- 读取和解析 `.tscn` 场景文件
- 创建和修改 Godot 场景
- 管理 GDScript 文件
- 通过 Godot CLI 运行项目

---

## 能力概览

### ✅ 已实现（20 个 MCP Tools）

| Tool | 功能 |
|------|------|
| `ping` | 测试连通性 — 返回 "pong" |
| `list_scenes` | 列出项目所有 `.tscn` 场景文件 |
| `read_scene` | 读取并解析 `.tscn` 场景文件（节点树 + 属性 + 连接） |
| `create_scene` | 创建新场景文件 |
| `read_script` | 读取 `.gd` GDScript 文件 |
| `add_node` | 向场景添加节点（支持初始属性） |
| `edit_node` | 编辑节点属性 |
| `create_script` | 创建 `.gd` 脚本，可选绑定到场景节点 |
| `edit_script` | 修改已有 `.gd` 脚本（搜索替换，自动备份） |
| `delete_node` | 从场景中删除节点（`recursive` 级联删除） |
| `delete_file` | 删除项目文件（默认回收站模式） |
| `validate_scene` | 校验 `.tscn` 场景完整性 |
| `validate_project` | 校验整个 Godot 项目 |
| `execute_gdscript` | 通过 Godot CLI 执行 GDScript 代码 |
| `list_resources` | 列出项目资源文件（按类型筛选） |
| `read_project_settings` | 读取 project.godot 配置 |
| `edit_project_settings` | 修改 project.godot 配置（自动备份） |
| `search_nodes` | 跨场景搜索节点（按类型/名称/属性） |
| `find_references` | 查找资源/脚本的场景引用 |
| `run_project` | 通过 Godot CLI 运行项目 |

### 核心能力

- **场景完整编辑闭环**：创建 → 读取 → 修改 → 写入 → 删除
- **脚本管理**：读取、创建和修改 GDScript 文件，支持绑定到场景节点
- **属性解析**：支持字符串、数字、布尔、Vector2/3/4、Color、数组、字典等类型
- **错误处理**：输入校验、文件存在性检查、场景完整性验证，返回可操作的错误信息
- **Godot CLI 集成**：自动检测 Godot 可执行文件路径，支持 normal/headless/debug 模式
- **严格测试**：218 个测试用例，20 个测试文件，含真实 Godot 集成测试

### ❌ 缺失（不能做的）

| 功能 | 原因 |
|------|------|
| 资源导入/删除操作 | 缺少 `import_resource` / `delete_resource` |
| Godot 3.x 兼容支持 | 缺少版本适配层 |
| CI/CD 搭建 | 缺少 GitHub Actions 配置 |
| npm 发布 | 待 v1.0 里程碑 |

---

## 开发计划

```
Phase 1 🏗️ 基础框架 ──── 20 tools + 适配层, 271 tests  ✅
Phase 2 🔧 实用价值 ──── edit/delete/validate  ✅
Phase 3 🎮 开发体验 ──── 代码执行 + 资源管理  ✅
Phase 4 📦 发布稳定 ──── 版本兼容 + v1.0  ◀️ 当前
```

### Phase 1 & 2 已完成 ✅

- [x] 20 个 MCP Tools + 版本适配层：场景读写、节点编辑、脚本管理、运行项目、删除、校验、搜索、配置
- [x] 259 个测试用例，23 个测试文件，真实 Godot 集成测试
- [x] `.tscn` 解析器 + 生成器 + 完整 round-trip
- [x] Godot CLI 集成 + 自动检测
- [x] 脚本编辑器（搜索替换 + 自动备份）
- [x] 删除操作（回收站模式 + 级联确认）
- [x] 场景/项目校验

### Phase 3: 开发体验增强 ✅

**目标**：让 AI 能执行代码、管理资源、配置项目，接近 Human-in-the-loop 开发体验。

- [x] P3.1 代码执行：`execute_gdscript` — 通过 Godot CLI 执行 GDScript 代码
- [x] P3.2 资源管理：`list_resources` — 列出项目资源（按类型筛选）
- [x] P3.3 项目配置：`read_project_settings` + `edit_project_settings`
- [x] P3.4 搜索导航：`search_nodes` + `find_references`

**Phase 3 里程碑达成**：AI 能独立完成小型游戏原型的搭建和调试 🎉

---

### Phase 4: 版本兼容与发布 ◀️ 当前阶段

**目标**：覆盖多版本 Godot，正式发布到 npm。

- [x] P4.1 Godot 3.x 适配 — 适配层架构、节点类型映射、自动版本检测、GDScript 1.0→2.0 翻译器
- [x] P4.2 CI/CD — GitHub Actions CI + Release workflow
- [x] P4.3 文档 — 安装指南、Tools 参考、CONTRIBUTING.md
- [ ] P4.3 npm 发布 — 最终包名、CHANGELOG、v1.0 release

**Phase 4 里程碑**：📦 v1.0 发布到 npm

---

## 架构

### Project Structure

```
godot-mcp-server/
├── src/
│   ├── index.ts              # MCP Server 入口（StdioServerTransport）
│   ├── tools/                # MCP Tools 实现
│   │   ├── dispatch.ts       # 工具分发层
│   │   ├── list_scenes.ts    # 扫描项目 .tscn 文件
│   │   ├── read_scene.ts     # 读取解析 .tscn 文件
│   │   ├── create_scene.ts   # 创建新场景
│   │   ├── add_node.ts       # 添加节点到场景
│   │   ├── edit_node.ts      # 编辑节点属性
│   │   ├── read_script.ts    # 读取 .gd 脚本
│   │   ├── create_script.ts  # 创建 .gd 脚本
│   │   └── run_project.ts    # 通过 Godot CLI 运行项目
│   ├── parsers/              # `.tscn` 解析器
│   │   ├── tscn-parser.ts   # 状态机逐行解析器
│   │   └── tscn-types.ts    # 类型定义
│   ├── writers/              # `.tscn` 生成器
│   │   └── tscn-writer.ts   # sceneToTscn + writeSceneToFile
│   ├── godot/               # Godot CLI 封装
│   │   └── cli.ts           # 自动检测 + 运行 + 脚本执行
│   ├── utils/               # 工具函数
│   │   └── tree-utils.ts    # findNodeInTree / countNodes / flattenNodes
│   └── adapters/            # 版本适配器（预留）
│       └── v4/              # Godot 4.x 适配（当前默认）
├── __tests__/               # 单元测试 + 集成测试（17 个文件，186 个用例）
├── test-fixtures/           # 测试夹具（示范场景文件）
│   ├── scenes/
│   │   ├── World.tscn       # 示例场景（5 个节点 + 连接）
│   │   └── project.godot    # 测试用项目配置
│   └── scripts/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

### Key Design Decisions

#### 1. `.tscn` Parsing Strategy

**Recommended**: Hand-write parser (full control, no dependencies)

- Parse line by line using state machine
- Recognize `[xxx]` block declarations
- Parse indentation for hierarchy
- Property line format: `property_name = value`

Alternative: Use existing library (e.g., `godot-tscn-parser`) - needs verification for Godot 4 support.

#### 2. Version Adapter Architecture

Use **Adapter Pattern**, each Godot major version corresponds to one adapter module:

```
src/adapters/
├── v4/
│   ├── tscn-parser-v4.ts
│   ├── tscn-writer-v4.ts
│   └── cli-v4.ts
└── v3/
    ├── tscn-parser-v3.ts
    ├── tscn-writer-v3.ts
    └── cli-v3.ts
```

Auto-detect: Read `format=` field from `.tscn` file, automatically select corresponding adapter.

#### 3. Security Design

- Path whitelist: All file operations only allowed within project directory
- Auto-backup: Backup before writing, auto-rollback on error
- Parameter validation: Use Zod to strictly validate all Tool parameters

#### 4. Error Handling Convention

MCP Tool error return format:

```typescript
{
  content: [{
    type: "text",
    text: "Error: Unable to read scene file. File path: xxx. Reason: xxx"
  }],
  isError: true
}
```

---

## 安装

### 从 npm（v1.0 发布后）

```bash
npm install -g godot-mcp-server
```

### 从源码（当前）

```bash
# 克隆仓库
git clone https://github.com/ly-ina/Godot_Ina.git
cd Godot_Ina

# 安装依赖
npm install

# 构建
npm run build

# 开发模式运行（自动重编译）
npm run dev
```

---

## 使用

在 AI 助手（Claude Desktop、WorkBuddy 等）中配置使用此 MCP 服务器。

### Claude Desktop

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/your/path/to/godot-mcp-server/dist/index.js"]
    }
  }
}
```

### WorkBuddy

在 MCP 设置面板中添加服务器路径即可。

### 可用工具

#### `ping`

测试连通性 — 返回 "pong"。

**参数**：无

**示例**：

```json
{
  "tool": "ping",
  "arguments": {}
}
```

#### `list_scenes`

列出 Godot 项目中所有 `.tscn` 场景文件。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 否 | Godot 项目根路径（默认为当前目录） |

**示例**：

```json
{
  "tool": "list_scenes",
  "arguments": {
    "project_path": "C:/MyGame"
  }
}
```

#### `read_scene`

Read a `.tscn` scene file and return its parsed node tree.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `scene_path` | string | Yes | Path to `.tscn` file |

**Example**:

```json
{
  "tool": "read_scene",
  "arguments": {
    "scene_path": "scenes/Main.tscn"
  }
}
```

**Output**: Header info (format, load_steps, uid), node count, root node, and flat node list with type/parent.

---

#### `create_scene`

Create a new `.tscn` scene file with specified root node.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `scene_path` | string | Yes | Path to save the new `.tscn` file |
| `root_node_name` | string | Yes | Name of the root node (e.g., "World") |
| `root_node_type` | string | Yes | Root node type (e.g., "Node2D", "CharacterBody2D") |
| `project_path` | string | No | Godot project root (defaults to current directory) |

**Example**:

```json
{
  "tool": "create_scene",
  "arguments": {
    "scene_path": "scenes/Player.tscn",
    "root_node_name": "Player",
    "root_node_type": "CharacterBody2D"
  }
}
```

---

#### `read_script`

Read a `.gd` GDScript file and return its content with line count.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `script_path` | string | Yes | Path to `.gd` file |

**Example**:

```json
{
  "tool": "read_script",
  "arguments": {
    "script_path": "scripts/player.gd"
  }
}
```

---

#### `add_node`

Add a new node to an existing `.tscn` scene. The parent node is found by name.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `scene_path` | string | Yes | Path to `.tscn` file |
| `parent_node_name` | string | Yes | Parent node name (use `.` for root level) |
| `node_type` | string | Yes | Node type (e.g., "Sprite2D", "Camera2D") |
| `node_name` | string | Yes | Name for the new node (must be unique) |
| `properties` | object | No | Optional initial properties (key-value pairs) |

**Example**:

```json
{
  "tool": "add_node",
  "arguments": {
    "scene_path": "scenes/World.tscn",
    "parent_node_name": ".",
    "node_type": "Camera2D",
    "node_name": "MainCamera",
    "properties": {
      "zoom": "Vector2(2, 2)"
    }
  }
}
```

---

#### `edit_node`

Modify properties of a node in a `.tscn` scene. Supports adding new properties, updating existing ones, and removing (set to `null`).

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `scene_path` | string | Yes | Path to `.tscn` file |
| `node_name` | string | Yes | Name of the node to edit |
| `properties` | object | Yes | Properties to modify (set to `null` to remove) |

**Example**:

```json
{
  "tool": "edit_node",
  "arguments": {
    "scene_path": "scenes/World.tscn",
    "node_name": "Player",
    "properties": {
      "position": "Vector2(100, 200)",
      "speed": 300
    }
  }
}
```

**Output**: Detailed change report (added/updated/removed properties).

---

#### `create_script`

Create a new `.gd` GDScript file. Optionally attach it to a node in a `.tscn` scene (adds `ext_resource` and `script` property on the node).

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `script_path` | string | Yes | Path to save the `.gd` file |
| `content` | string | Yes | GDScript code content |
| `scene_path` | string | No | Path to `.tscn` scene (for script attachment) |
| `node_name` | string | No | Name of the node to attach the script (requires `scene_path`) |

**Example**:

```json
{
  "tool": "create_script",
  "arguments": {
    "script_path": "scripts/player.gd",
    "content": "extends CharacterBody2D\n\nfunc _ready():\n\tpass\n",
    "scene_path": "scenes/Player.tscn",
    "node_name": "Player"
  }
}
```

---

#### `run_project`

Run a Godot project using the CLI. Auto-detects the Godot executable via `GODOT_PATH` env var, common install paths, or system PATH.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `project_path` | string | Yes | Path to Godot project root |
| `mode` | string | No | Run mode: `"normal"`, `"headless"`, `"debug"` (defaults to `"normal"`) |
| `extra_args` | string[] | No | Extra CLI arguments to pass to Godot |
| `timeout` | number | No | Timeout in milliseconds (defaults to 30000) |

**Example**:

```json
{
  "tool": "run_project",
  "arguments": {
    "project_path": "C:/MyGame",
    "mode": "headless"
  }
}
```

**Output**: Project run status, exit code, stdout, stderr.

---

## Development

### 前置条件

- Node.js 18+
- npm 或 yarn
- TypeScript 5.0+
- Godot 4.x（用于集成测试）

### 环境设置

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（自动重编译）
npm run dev

# 运行测试（186 个用例全覆盖）
npm test

# 查看覆盖率报告
npx vitest run --coverage

# 持续运行测试（watch 模式）
npm run test:watch
```

### 测试 MCP 通信

```bash
# 测试 tools/list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# 预期输出（格式化后）：
# {"result":{"tools":[...],"jsonrpc":"2.0","id":1}}
```

### Godot 集成测试

此项目包含使用真实 Godot 可执行文件的集成测试。要运行它们：

```bash
# 设置 GODOT_PATH 环境变量指向 Godot 可执行文件
set GODOT_PATH=E:/Godot/Godot_v4.7-stable_win64.exe

# 运行集成测试
npx vitest run __tests__/godot-integration.test.ts
```

集成测试会自动创建临时测试项目，运行后清理。

---

## 路线图

详细计划见 [开发计划](#开发计划)。

### 已完成（v0.1）

- [x] MCP Server 基础框架
- [x] 9 个 Tools（场景读写、脚本管理、项目运行）
- [x] `.tscn` 解析器 + 生成器 + 完整 round-trip
- [x] Godot CLI 集成（自动检测 + 多模式运行）
- [x] 186 个测试用例，95.32% 行覆盖率
- [x] 真实 Godot 集成测试
- [x] 完整中文文档

### 下一步（v0.2）

- [ ] `edit_script` — 编辑已有 GDScript 文件
- [ ] `delete_node` / `delete_file` — 删除操作
- [ ] `validate_scene` — 场景完整性校验
- [ ] 搜索/导航工具（`search_nodes`、`find_references`）

### 中期（v0.3-v1.0）

- [ ] `execute_gdscript` — 通过 CLI 执行 GDScript 代码
- [ ] 资源管理（`list_resources`、`import_resource`）
- [ ] 项目配置编辑（`edit_project_settings`）
- [ ] Godot 3.x 版本兼容
- [ ] CI/CD 搭建
- [ ] npm 发布 v1.0

### 长期（v1.0+）

- [ ] AI 助手中的可视化场景编辑器
- [ ] 实时场景预览
- [ ] 多项目支持
- [ ] 自定义 Tools 插件系统

---

## 常见问题

### Q: 支持 Godot 3.x 吗？

A: 目前仅支持 Godot 4.x。Godot 3.x 支持计划在 Phase 4（版本兼容与发布）完成。

### Q: 任何 AI 助手都能用吗？

A: 是的，只要 AI 助手支持 MCP 协议（Claude Desktop、WorkBuddy 等）。

### Q: 用在真实项目里安全吗？

A: 服务器有安全检查机制（路径校验、自动备份、参数验证），但建议先在项目副本上测试。

---

## 故障排除

### MCP Server 无法连接

- 检查 Node.js 版本（需要 18+）
- 检查 AI 助手中的服务器路径配置是否正确
- 运行 `npm run build` 确保项目已编译

### `.tscn` 文件解析错误

- 确保文件是 Godot 4.x 格式（format=3）
- 检查 `.tscn` 文件是否有语法错误
- 启用调试日志：`DEBUG=godot-mcp:* npm run dev`

### Godot CLI 未找到

- 确认 Godot 已安装并配置了系统 PATH
- 设置 `GODOT_PATH` 环境变量指向 Godot 可执行文件
- Windows 上检查 `%LOCALAPPDATA%/Godot/` 目录

---

## 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解行为准则和提交 PR 的流程。

贡献方式：

- 报告 bug
- 建议新功能
- 提交 Pull Request
- 改进文档
- 编写测试
- 创建示例项目

---

## 许可

本项目采用 MIT 协议开源 — 详见 [LICENSE](LICENSE) 文件。

---

## 作者

**ly-ina**

- GitHub: [@ly-ina](https://github.com/ly-ina)
- 仓库: [https://github.com/ly-ina/Godot_Ina](https://github.com/ly-ina/Godot_Ina)

---

## 致谢

- [Model Context Protocol](https://modelcontextprotocol.io/) — MCP 协议规范
- [Godot Engine](https://godotengine.org/) — 优秀的开源游戏引擎
- 所有为这个项目做出贡献的开发者

---

## Star History

如果你觉得这个项目有用，欢迎在 GitHub 上点个 Star！

[![Star History Chart](https://api.star-history.com/svg?repos=ly-ina/Godot_Ina&type=Date)](https://star-history.com/#ly-ina/Godot_Ina&Date)

---

**最后更新**：2026-07-02

**版本**：0.1.0（开发中）
