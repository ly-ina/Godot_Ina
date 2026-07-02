# 安装指南

## 前置条件

- **Node.js** 20+（推荐 22）
- **npm** 或 yarn
- **Godot 4.x**（可选，用于 `run_project` 和 `execute_gdscript` 工具）

## 方法一：从源码安装（推荐）

```bash
# 克隆仓库
git clone https://github.com/ly-ina/Godot_Ina.git
cd Godot_Ina

# 安装依赖
npm install

# 构建
npm run build

# 验证安装
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## 方法二：从 npm 安装（v1.0 发布后）

```bash
npm install -g godot-mcp-server
```

## 配置 Godot 路径

运行 `run_project` 或 `execute_gdscript` 需要 Godot 可执行文件。MCP Server 按以下顺序查找：

1. `GODOT_PATH` 环境变量
2. 常见安装路径（Windows: `%LOCALAPPDATA%/Godot/`, `%PROGRAMFILES%/Godot/`）
3. 系统 PATH

推荐设置环境变量：

```bash
# Windows (CMD)
set GODOT_PATH=C:\Path\to\Godot_v4.7-stable_win64.exe

# Windows (PowerShell)
$env:GODOT_PATH = "C:\Path\to\Godot_v4.7-stable_win64.exe"
```

## 配置 AI 助手

### Claude Desktop

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["C:/path/to/godot-mcp-server/dist/index.js"]
    }
  }
}
```

### WorkBuddy

在 MCP 设置面板中添加服务器路径即可。
