# godot-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/godot-mcp-server.svg)](https://www.npmjs.com/package/godot-mcp-server)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ly-ina/Godot_Ina/ci.yml)](https://github.com/ly-ina/Godot_Ina/actions)

MCP Server for Godot project files - AI-native infrastructure for Godot development.

让 AI 助手直接读写 Godot 项目文件的 MCP Server，成为 Godot 开发的 AI 原生基础设施。

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Development Plan](#development-plan)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`godot-mcp-server` is a Model Context Protocol (MCP) server that enables AI assistants to directly read and write Godot project files. It serves as the bridge between AI and Godot, allowing AI to:

- Read and parse `.tscn` scene files
- Create and modify Godot scenes programmatically
- Manage GDScript files
- Execute Godot CLI commands
- Build "living world" simulations with AI assistance

### Why This Project?

1. **AI-Native Game Development**: Traditional game development requires manual editing in Godot editor. This MCP server allows AI to directly manipulate Godot project files, enabling AI-assisted game development at scale.

2. **Living Novel World Simulator**: The long-term goal is to create a game similar to Stardew Valley, where the world is generated from structured world-building data (JSON/YAML) from the novel "Night Orchid" (夜罗兰). AI can help build and iterate on this world dynamically.

3. **Universal Developer Tool**: This is not just for one game - any Godot developer can use this tool to boost their development efficiency.

---

## Features

### Current Status (MVP Complete - Phase 1 & 2 ✅)

| Tool | Status | Description |
|------|--------|-------------|
| `ping` | ✅ | Test connectivity — returns "pong" |
| `list_scenes` | ✅ | List all `.tscn` files in a project (recursive scanning) |
| `read_scene` | ✅ | Read and parse a `.tscn` scene file (full node tree + properties) |
| `create_scene` | ✅ | Create a new `.tscn` scene with specified root node |
| `read_script` | ✅ | Read a `.gd` GDScript file |
| `add_node` | ✅ | Add a new node to an existing scene (parse → modify → write) |
| `edit_node` | ✅ | Edit node properties (add / update / remove) |
| `create_script` | ✅ | Create a `.gd` script file, optionally attach to a scene node |
| `run_project` | 🚧 | Run Godot project via CLI — in development |

### Core Capabilities

- **Scene manipulation**: Create, read, modify, and write `.tscn` files
- **Script management**: Read, create, and attach GDScript files to nodes
- **Full round-trip**: Parse → modify in memory → write back to valid `.tscn` format
- **Property parsing**: Supports strings, numbers, booleans, Vector2/3/4, Color, arrays, dictionaries
- **Error resilience**: Graceful error handling with actionable messages

---

## Development Plan

This project follows a structured 4-phase development plan. Each phase builds upon the previous one, with clear milestones and deliverables.

### Phase 1: Research & Preparation (Week 1)

**Goal**: Complete technical research, set up project skeleton, validate MCP communication.

#### Tasks

- [x] T1.1 Research Godot 4 official documentation (P0·Required)
  - [x] `.tscn` file format specification
  - [x] Godot CLI full parameter list
  - [x] GDScript 2.0 syntax essentials
- [x] T1.2 Research MCP SDK usage (P0·Required)
  - [x] `@modelcontextprotocol/sdk` TypeScript SDK
  - [x] stdio transport implementation
  - [x] Tool registration and parameter validation
- [x] T1.3 Initialize project scaffold (P0·Required)
  - [x] TypeScript + MCP SDK setup
  - [x] Project structure design
  - [x] ESLint + Prettier configuration
- [x] T1.4 Validate MCP communication (P0·Required)
  - [x] Implement `ping` Tool
  - [x] Configure AI assistant integration
  - [x] Verify stdio communication

**Milestone**: ✅ MCP communication validated

---

### Phase 2: MVP Core Features (Weeks 2-4) ✅

**Goal**: Implement core read/write capabilities, enable AI to actually manipulate Godot project files.

#### Tasks

- [x] T2.1 Implement `.tscn` parser (P0·Required, 5 days)
  - [x] Parse `[gd_scene]` root block
  - [x] Parse `[ext_resource]` references
  - [x] Parse `[sub_resource]` blocks
  - [x] Parse `[node]` definitions (properties, children)
  - [x] Parse `[connection]` signal connections
  - [x] Support all property types (Vector2/3/4, Color, Rect2, Array, Dictionary, etc.)
- [x] T2.2 Implement `.tscn` writer (P0·Required, 4 days)
  - [x] Generate standard `.tscn` text from structured objects
  - [x] Follow Godot 4 format specification (format=3)
  - [x] Validate output format
- [x] T2.3 Implement Phase 1 MCP Tools (P0·Required, 3 days)
  - [x] `list_scenes` - List all `.tscn` files
  - [x] `read_scene` - Read and parse scene file
  - [x] `read_script` - Read `.gd` file content
- [x] T2.4 Implement Phase 2 MCP Tools (P1·Required, 5 days)
  - [x] `create_scene` - Create new scene file
  - [x] `add_node` - Add node to scene
  - [x] `edit_node` - Edit node properties
  - [x] `create_script` - Create GDScript file (with optional node attachment)

**Milestone**: ✅ Read/write scene capabilities

---

### Phase 3: Practical Value Enhancement (Weeks 5-6)

**Goal**: Integrate Godot CLI, enable AI to not only edit files but also run and test projects, forming a complete development loop.

#### Tasks

- [ ] T3.1 Integrate Godot CLI (P1·Required, 4 days)
  - [ ] Auto-detect Godot executable path (Windows/macOS/Linux)
  - [ ] Implement `run_project` Tool
  - [ ] Support `--headless` mode
  - [ ] Support `--script` execution
  - [ ] Capture stdout/stderr
- [ ] T3.2 Implement `execute_gdscript` Tool (P2·Optional)
  - [ ] Write temporary `.gd` file
  - [ ] Execute via `godot --headless --script`
  - [ ] Capture output and return to caller
  - [ ] Clean up temporary files
- [ ] T3.3 Implement `validate_scene` Tool (P2·Optional)
  - [ ] Validate `.tscn` file format
  - [ ] Check node/resource references
  - [ ] Return detailed error messages
- [ ] T3.4 Write unit tests (P1·Required, 4 days)
  - [ ] Test `.tscn` parser (all node types, all property formats)
  - [ ] Test `.tscn` writer (parse → write → parse consistency)
  - [ ] Test MCP Tools (mock AI calls)
  - [ ] Test Godot CLI wrapper (mock Godot executable)
  - [ ] Target: >80% coverage
- [ ] T3.5 Write project documentation (P1·Required, 2 days)
  - [ ] `README.md` - Project introduction, installation, quick start
  - [ ] `docs/installation.md` - Detailed installation guide
  - [ ] `docs/configuration.md` - Configuration explanation
  - [ ] `docs/tools-reference.md` - Each Tool's detailed parameters and examples
  - [ ] `docs/ai-usage-examples.md` - AI assistant call examples
  - [ ] `CONTRIBUTING.md` - Contribution guidelines

**Milestone**: ✅ Project execution capability

---

### Phase 4: Version Compatibility & Ecosystem (Week 7+)

**Goal**: Support more Godot versions, improve ecosystem, release official version.

#### Tasks

- [ ] T4.1 Adapt Godot 3.x (P2·Important, 7 days)
  - [ ] Implement `src/adapters/v3/` adapter layer
  - [ ] Handle `.tscn` format version differences (format=2/3 vs format=3)
  - [ ] Handle node type name differences (e.g., `KinematicBody2D` → `CharacterBody2D`)
  - [ ] Handle GDScript 1.0 syntax differences
  - [ ] Handle CLI parameter differences
  - [ ] Auto-detect version and select adapter
- [ ] T4.2 Implement advanced Tools (P3·Optional)
  - [ ] `manage_resources` - Manage project resources (import/delete)
  - [ ] `edit_project_settings` - Modify `project.godot` config file
  - [ ] `list_nodes` - Return scene node tree only (lightweight)
  - [ ] `search_nodes` - Search nodes by type/name in scene
  - [ ] `duplicate_scene` - Duplicate scene file
  - [ ] `delete_node` - Delete node from scene
- [ ] T4.3 Set up CI/CD (P2·Optional, 2 days)
  - [ ] `ci.yml` - Run tests + lint on every PR
  - [ ] `release.yml` - Auto-publish to npm + create GitHub Release on tag
  - [ ] `test-compatibility.yml` - Periodic Godot version compatibility tests
- [ ] T4.4 Release v1.0 (P2·Important, 3 days)
  - [ ] Determine package name (check npm availability)
  - [ ] Finalize `package.json` (description, keywords, repository, license)
  - [ ] `npm publish` - Publish to npm
  - [ ] Create GitHub Release with changelog
  - [ ] Write announcement (Reddit r/godot, Twitter, Zhihu, etc.)

**Milestone**: ✅ v1.0 released to npm

---

## Timeline Summary

| Week | Main Tasks | Milestone |
| ---- | ---------- | --------- |
| Week 1 | T1.1~T1.4 | ✅ MCP communication validated |
| Week 2 | T2.1 `.tscn` parser | ✅ Correctly parse Godot 4 scene files |
| Week 3 | T2.2 `.tscn` writer + T2.3 Phase 1 Tools | ✅ Read scene Tools online |
| Week 4 | T2.4 Phase 2 Tools | ✅ Write scene Tools online (8 tools total) |
| Week 5 | T3.1 Godot CLI integration + T3.4 Unit tests | 🚧 In progress |
| Week 6 | T3.5 Documentation + T4.4 Release preparation | 📅 Planned |

**Total**: 6 weeks to complete v1.0 usable version

---

## Architecture

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

## Installation

### From npm (when v1.0 is released)

```bash
npm install -g godot-mcp-server
```

### From Source (Current)

```bash
# Clone the repository
git clone https://github.com/ly-ina/Godot_Ina.git
cd Godot_Ina

# Install dependencies
npm install

# Build
npm run build

# Run dev mode
npm run dev
```

---

## Usage

Configure your AI assistant (Claude Desktop, WorkBuddy, etc.) to use this MCP server.

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/path/to/godot-mcp-server/dist/index.js"]
    }
  }
}
```

### With WorkBuddy

Configure in the MCP settings panel by adding the server path.

### Available Tools

#### `ping`

Test connectivity - returns "pong".

**Parameters**: None

**Example**:

```json
{
  "tool": "ping",
  "arguments": {}
}
```

#### `list_scenes`

List all `.tscn` scene files in a Godot project.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `project_path` | string | No | Path to Godot project root (defaults to current directory) |

**Example**:

```json
{
  "tool": "list_scenes",
  "arguments": {
    "project_path": "/path/to/godot/project"
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

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript 5.0+
- Godot 4.x (for testing)

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode (auto-rebuild on changes)
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

### Testing MCP Communication

```bash
# Test tools/list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Expected output:
# {"result":{"tools":[...],"jsonrpc":"2.0","id":1}}
```

### Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

#### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

#### Coding Standards

- Use TypeScript strict mode
- Follow ESLint + Prettier configuration
- Write unit tests for new features
- Update documentation for API changes

---

## Roadmap

See [Development Plan](#development-plan) for detailed roadmap.

### Short-term (v1.0)

- [x] Basic MCP Server framework
- [x] `ping` and `list_scenes` Tools
- [ ] Complete `.tscn` parser and writer
- [ ] Read/write scene Tools
- [ ] Godot CLI integration
- [ ] Unit tests and documentation

### Medium-term (v1.1-v2.0)

- [ ] Godot 3.x compatibility
- [ ] Advanced Tools (resource management, project settings editor)
- [ ] CI/CD setup
- [ ] Performance optimization

### Long-term (v3.0+)

- [ ] Visual scene editor in AI assistant
- [ ] Real-time scene preview
- [ ] Multi-project support
- [ ] Plugin system for custom Tools

---

## Troubleshooting

### MCP Server not connecting

- Verify Node.js version (requires 18+)
- Check that the server path in your AI assistant config is correct
- Run `npm run build` to ensure the project is compiled

### `.tscn` file parsing errors

- Ensure the file is in Godot 4.x format (format=3)
- Check for syntax errors in the `.tscn` file
- Enable debug logging: `DEBUG=godot-mcp:* npm run dev`

### Godot CLI not found

- Verify Godot is installed and in PATH
- Set `GODOT_PATH` environment variable to Godot executable path
- On Windows, check `%LOCALAPPDATA%/Godot/` for Godot installation

---

## FAQ

### Q: Does this work with Godot 3.x?

A: Currently only Godot 4.x is supported. Godot 3.x support is planned for Phase 4 (see [T4.1](#t41-adapt-godot-3x-p2important-7-days)).

### Q: Can I use this with any AI assistant?

A: Yes, as long as the AI assistant supports MCP protocol (Claude Desktop, WorkBuddy, etc.).

### Q: Is this safe to use with my Godot projects?

A: The server includes safety mechanisms (path whitelist, auto-backup, parameter validation), but it's recommended to test on a copy of your project first.

### Q: How does this relate to the "Night Orchid" (夜罗兰) novel?

A: This MCP server is a generic tool for all Godot developers. The long-term goal is to use it to build a "living novel world simulator" game based on the "Night Orchid" novel's world-building data. But the tool itself is not tied to any specific project.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

Ways to contribute:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation
- Write tests
- Create example projects

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**ly-ina**

- GitHub: [@ly-ina](https://github.com/ly-ina)
- Repository: [https://github.com/ly-ina/Godot_Ina](https://github.com/ly-ina/Godot_Ina)

---

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - For the MCP specification
- [Godot Engine](https://godotengine.org/) - For the amazing game engine
- All contributors who help improve this project

---

## Star History

If you find this project useful, please consider giving it a star on GitHub!

[![Star History Chart](https://api.star-history.com/svg?repos=ly-ina/Godot_Ina&type=Date)](https://star-history.com/#ly-ina/Godot_Ina&Date)

---

**Last Updated**: 2026-07-01

**Version**: 0.1.0 (MVP - Phase 1)
