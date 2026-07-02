# Godot MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml/badge.svg)](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml)

让 AI 直接读写 Godot 项目文件。34 个工具，313 个测试。

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

**一键生成的（直接出完整 .tscn + .gd）：**
- 8 种游戏组件（玩家、敌人、收集品、HUD、血量、子弹、生成器、关卡）
- Minecraft 风格无限地形（带洞穴/矿物/液体/植被）
- NPC 行为树 AI（带需求/人格/日程系统）
- 泰拉瑞亚风格装备系统（分层渲染、背包、合成）
- 星露谷物语风格场景切换（区域管理、过渡门、小地图）
- SLG 策略地图（六角格、A* 寻路、战争迷雾、回合制）
- 4 种完整示例项目（平台跳跃、RPG 对话、俯视角射击、FPS）

---

## 34 个工具列表

### 场景编辑
| 工具 | 作用 |
|------|------|
| `create_scene` | 创建场景 |
| `read_scene` | 读场景 |
| `list_scenes` | 列出所有场景 |
| `add_node` | 加节点 |
| `edit_node` | 改节点属性 |
| `delete_node` | 删节点 |
| `rename_node` | 重命名节点，自动更新子节点和连接引用 |
| `validate_scene` | 校验场景完整性 |

### 脚本管理
| 工具 | 作用 |
|------|------|
| `create_script` | 创建脚本，可选绑定到场景节点 |
| `read_script` | 读脚本 |
| `edit_script` | 搜索替换修改，自动备份 |
| `batch_edit_script` | 跨文件批量搜索替换 |
| `execute_gdscript` | 用 Godot CLI 执行 GDScript |

### 项目操作
| 工具 | 作用 |
|------|------|
| `run_project` | 用 Godot CLI 运行项目 |
| `init_project` | 创建标准项目骨架 |
| `read_project_settings` | 读 project.godot |
| `edit_project_settings` | 改 project.godot，自动备份 |
| `import_resource` | 导入外部资源 |
| `delete_resource` | 删资源，删除前检查引用 |
| `delete_file` | 删文件，默认移到回收站 |

### 搜索校验
| 工具 | 作用 |
|------|------|
| `search_nodes` | 按类型/名称/属性搜节点 |
| `find_references` | 查资源/脚本被哪些场景引用 |
| `validate_project` | 校验整个项目 |
| `analyze_project` | 分析项目结构、脚本、资源依赖 |

### 一键生成
| 工具 | 生成什么 |
|------|---------|
| `generate_component` | 8 种游戏组件 |
| `generate_terrain` | 程序化地形（固定地图或无限区块） |
| `generate_behavior_tree` | NPC 行为树 AI |
| `generate_equipment_system` | 装备系统 |
| `generate_scene_transition` | 场景切换系统 |
| `generate_slg_map` | SLG 策略地图 |
| `generate_example_project` | 完整示例项目（4 种） |
| `translate_project` | Godot 3.x 项目转 4.x |

### 通用
| 工具 | 作用 |
|------|------|
| `ping` | 测连通性 |

---

## 项目状态

| 指标 | 数值 |
|------|------|
| 工具数 | 34 |
| 测试数 | 313（27 个文件） |
| 行覆盖率 | 95% |
| CI | GitHub Actions（Node 20/22） |

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
├── tools/           34 个工具
│   ├── dispatch.ts  分发
│   └── *.ts         各工具
├── parsers/         .tscn 解析器
├── writers/         .tscn 生成器
├── godot/           Godot CLI 封装
├── adapters/        版本适配（v3/v4）
└── utils/           工具函数
```

设计上没什么花头：
- 解析器是手写状态机，零依赖
- 适配器是工厂模式，自动检测版本
- 所有修改操作会自动备份

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

**最后更新**：2026-07-02
