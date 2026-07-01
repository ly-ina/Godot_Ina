# godot-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/godot-mcp-server.svg)](https://www.npmjs.com/package/godot-mcp-server)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ly-ina/Godot_Ina/ci.yml)](https://github.com/ly-ina/Godot_Ina/actions)

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

### 当前状态（MVP 完成 ✅）

| Tool | 状态 | 功能 |
|------|------|------|
| `ping` | ✅ | 测试连通性 — 返回 "pong" |
| `list_scenes` | ✅ | 列出项目所有 `.tscn` 场景文件（递归扫描） |
| `read_scene` | ✅ | 读取并解析 `.tscn` 场景文件（完整节点树 + 属性） |
| `create_scene` | ✅ | 创建新场景文件，指定根节点类型 |
| `read_script` | ✅ | 读取 `.gd` GDScript 文件 |
| `add_node` | ✅ | 向已有场景添加节点（读取→修改→写入） |
| `edit_node` | ✅ | 编辑节点属性（新增/更新/删除） |
| `create_script` | ✅ | 创建 `.gd` 脚本文件，可选绑定到场景节点 |
| `run_project` | ✅ | 通过 Godot CLI 运行项目（检测 Godot 可执行文件路径） |

### 核心能力

- **场景编辑**：创建、读取、修改、写入 `.tscn` 文件，完整读写闭环
- **脚本管理**：读取和创建 GDScript 文件，支持绑定到场景节点
- **完整 Round-trip**：解析 → 内存修改 → 写回有效 `.tscn` 格式
- **属性解析**：支持字符串、数字、布尔、Vector2/3/4、Color、数组、字典等类型
- **错误处理**：优雅的错误返回，带可操作性的错误信息
- **Godot CLI 集成**：自动检测 Godot 可执行文件，支持 normal/headless/debug 模式

---

## Development Plan

This project follows a structured 4-phase development plan. Each phase builds upon the previous one, with clear milestones and deliverables.

### Phase 3: 实用价值提升 🚧

**目标**：集成 Godot CLI，让 AI 不仅能编辑文件，还能运行和测试项目，形成完整开发闭环。

#### 已完成
- [x] T3.1 Godot CLI 集成
  - [x] 自动检测 Godot 可执行文件路径（Windows/macOS/Linux）
  - [x] 实现 `run_project` Tool（normal/headless/debug 模式）
  - [x] 支持 `--script` 执行脚本
  - [x] 捕获 stdout/stderr 输出
- [x] T3.4 单元测试（31 个测试）
  - [x] 解析器测试（17 个）：header、节点树、ext_resource、值类型解析
  - [x] 生成器测试（5 个）：格式校验、round-trip 一致性
  - [x] 树工具测试（9 个）：findNodeInTree、countNodes、flattenNodes
- [x] T3.5 README 文档（完整中文版）

#### 待完成
- [ ] T3.2 `execute_gdscript` — 通过 CLI 执行 GDScript 代码片段并返回结果
- [ ] T3.3 `validate_scene` — 校验 `.tscn` 格式 + 节点/资源引用完整性
- [ ] T3.4 CLI 封装 mock 测试 — 用 mock Godot 可执行文件测试 CLI 封装层
- [ ] 测试覆盖率目标 >85%
- [ ] `docs/` 子目录：安装指南、配置说明、Tools 参考、AI 调用示例

**里程碑**：✅ 项目运行能力

---

### Phase 4: 版本兼容与生态（第7周+） 📅

**目标**：支持更多 Godot 版本，完善生态，发布正式版本。

#### 任务

- [ ] T4.1 适配 Godot 3.x（P2·重要，7 天）
  - [ ] 实现 `src/adapters/v3/` 适配层
  - [ ] 处理 `.tscn` 格式版本差异（format=2/3 vs format=3）
  - [ ] 处理节点类型名称差异（如 `KinematicBody2D` → `CharacterBody2D`）
  - [ ] 处理 GDScript 1.0 语法差异
  - [ ] 处理 CLI 参数差异
  - [ ] 自动检测版本并选择对应适配器
- [ ] T4.2 实现高阶 Tools（P3·可选）
  - [ ] `manage_resources` - 管理项目资源文件（导入/删除）
  - [ ] `edit_project_settings` - 修改 `project.godot` 配置
  - [ ] `list_nodes` - 仅返回场景节点树（轻量版）
  - [ ] `search_nodes` - 按类型/名称搜索节点
  - [ ] `duplicate_scene` - 复制场景文件
  - [ ] `delete_node` - 从场景中删除节点
- [ ] T4.3 搭建 CI/CD（P2·可选，2 天）
  - [ ] `ci.yml` - PR 时自动运行测试 + lint
  - [ ] `release.yml` - 打标签时自动发布到 npm + 创建 GitHub Release
  - [ ] `test-compatibility.yml` - 定期 Godot 版本兼容性测试
- [ ] T4.4 发布 v1.0（P2·重要，3 天）
  - [ ] 确定包名（检查 npm 可用性）
  - [ ] 最终确定 `package.json`
  - [ ] `npm publish` - 发布到 npm
  - [ ] 创建 GitHub Release（含 changelog）
  - [ ] 发布通告（Reddit r/godot、Twitter、知乎等）

**里程碑**：✅ v1.0 发布到 npm

---

## 架构

### Project Structure

```
godot-mcp-server/
├── src/
│   ├── index.ts              # MCP Server entry point
│   ├── tools/                # MCP Tools implementation
│   │   ├── ping.ts
│   │   ├── list_scenes.ts
│   │   ├── read_scene.ts    # (planned)
│   │   ├── create_scene.ts  # (planned)
│   │   ├── add_node.ts      # (planned)
│   │   ├── edit_node.ts     # (planned)
│   │   └── run_project.ts   # (planned)
│   ├── parsers/             # `.tscn` parser
│   │   └── tscn-parser.ts  # (planned)
│   ├── writers/              # `.tscn` writer
│   │   └── tscn-writer.ts  # (planned)
│   ├── godot/               # Godot CLI wrapper
│   │   └── cli.ts           # (planned)
│   ├── adapters/            # Version adapters (for Godot 3.x support)
│   │   ├── v4/              # Godot 4.x adapter
│   │   └── v3/              # Godot 3.x adapter (planned)
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   └── utils/               # Utility functions
│       └── file.ts
├── __tests__/               # Unit tests
├── docs/                    # Documentation
│   ├── installation.md
│   ├── configuration.md
│   ├── tools-reference.md
│   └── ai-usage-examples.md
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
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

#### `run_project` (Planned)

Run Godot project using Godot CLI.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `project_path` | string | Yes | Path to Godot project root |
| `mode` | string | No | Run mode: "normal", "headless", "debug" (defaults to "normal") |

---

## Development

### 前置条件

- Node.js 18+
- npm 或 yarn
- TypeScript 5.0+
- Godot 4.x（用于测试）

### 环境设置

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（自动重编译）
npm run dev

# 运行测试
npm test

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

---

## 路线图

详细计划见 [开发计划](#开发计划)。

### 短期（v1.0 ✅）

- [x] MCP Server 基础框架
- [x] 9 个 Tools（场景读写、脚本管理、项目运行）
- [x] `.tscn` 解析器 + 生成器 + 属性解析
- [x] Godot CLI 集成
- [x] 31 个单元测试
- [x] 完整中文文档
- [ ] 发布 v1.0 到 npm

### 中期（v1.1-v2.0）

- [ ] Godot 3.x 兼容
- [ ] 高阶 Tools（资源管理、项目配置编辑器）
- [ ] CI/CD 搭建
- [ ] 性能优化

### 长期（v3.0+）

- [ ] AI 助手中的可视化场景编辑器
- [ ] 实时场景预览
- [ ] 多项目支持
- [ ] 自定义 Tools 插件系统

---

## 常见问题

### Q: 支持 Godot 3.x 吗？

A: 目前仅支持 Godot 4.x。Godot 3.x 支持计划在阶段四完成（参见 [T4.1](#t41-适配-godot-3xp2重要7-天)）。

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

**版本**：0.1.0
