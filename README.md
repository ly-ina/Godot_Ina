# godot-mcp-server

MCP Server for Godot project files - AI-native infrastructure for Godot development.

## Description

让 AI 助手直接读写 Godot 项目文件的 MCP Server，成为 Godot 开发的 AI 原生基础设施。

## Features

- Read and parse `.tscn` scene files
- Create and modify Godot scenes
- Manage GDScript files
- Integrate with Godot CLI
- Support for Godot 4.x (with planned 3.x support)

## Installation

```bash
npm install -g godot-mcp-server
```

## Usage

Configure your AI assistant (Claude Desktop, WorkBuddy, etc.) to use this MCP server.

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "godot": {
      "command": "godot-mcp-server"
    }
  }
}
```

### With WorkBuddy

Configure in the MCP settings panel.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run dev mode
npm run dev
```

## Tools

- `ping` - Test connectivity
- `list_scenes` - List all .tscn files in a project
- `read_scene` - Read a scene file (coming soon)
- `create_scene` - Create a new scene (coming soon)
- `add_node` - Add a node to a scene (coming soon)
- `edit_node` - Edit node properties (coming soon)
- `run_project` - Run Godot project (coming soon)

## License

MIT

## Author

ly-ina

## Repository

https://github.com/ly-ina/Godot_Ina
