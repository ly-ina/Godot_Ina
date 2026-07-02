# Godot MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml/badge.svg)](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/tests-311%20passed-brightgreen)]()
[![Node](https://img.shields.io/badge/node-20%2B-blue)]()

让 AI 助手直接读写 Godot 项目文件的 MCP Server。**32 个工具，311 个测试。**

---

## 目录

- [简介](#简介)
- [项目状态](#项目状态)
- [工具详解](#工具详解)
- [开发工作流](#开发工作流)
- [限制说明](#限制说明)
- [安装](#安装)
- [使用](#使用)
- [架构](#架构)
- [开发](#开发)
- [未来规划](#未来规划)
- [常见问题](#常见问题)
- [许可](#许可)

---

## 简介

`godot-mcp-server` 基于 [Model Context Protocol](https://modelcontextprotocol.io/) 标准，让 AI 助手能够直接读写 Godot 项目文件。它本质上是一个翻译层——把 AI 的开发指令翻译成 Godot 能理解的文件操作，再把执行结果翻译回人类能读懂的反馈。

### 能做什么

- 创建、读取、编辑、删除 `.tscn` 场景文件和节点
- 创建、读取、编辑、执行 GDScript 代码
- 读取和修改 `project.godot` 配置
- 通过 Godot CLI 运行项目，查看输出
- 跨场景搜索节点和资源引用
- 校验场景和项目完整性
- 自动适配 Godot 3.x / 4.x 版本差异

---

## 项目状态

| 指标 | 数值 |
|------|------|
| MCP Tools | **34** 个 |
| 测试用例 | **313** 个（27 个测试文件） |
| 行覆盖率 | **95%** |
| CI | GitHub Actions (Node 20 / 22) |
| 版本 | **v0.2.0** |

### 开发阶段进度

```
Phase 1  基础框架     ✅  20 tools · 解析器 · 生成器 · 测试体系
Phase 2  实用价值     ✅  脚本编辑 · 删除操作 · 场景校验
Phase 3  开发体验     ✅  代码执行 · 资源列表 · 配置编辑 · 搜索导航
Phase 4  发布稳定     ✅  适配层 · CI/CD · 文档（npm 发布待完成）
```

---

## 工具详解

### 场景操作

| 工具 | 功能 | 关键参数 |
|------|------|---------|
| `create_scene` | 创建 .tscn 场景文件 | `scene_path`, `root_node_name`, `root_node_type` |
| `read_scene` | 读取并解析场景（节点树 + 属性 + 连接） | `scene_path` |
| `list_scenes` | 列出项目所有场景文件 | `project_path`（可选） |
| `add_node` | 向场景添加节点 | `scene_path`, `parent_node_name`, `node_type`, `node_name` |
| `edit_node` | 修改节点属性（新增/更新/删除） | `scene_path`, `node_name`, `properties` |
| `delete_node` | 从场景删除节点 | `scene_path`, `node_name`, `recursive`（可选） |

### 脚本操作

| 工具 | 功能 | 关键参数 |
|------|------|---------|
| `create_script` | 创建 .gd 文件，可选绑定到场景节点 | `script_path`, `content`, `scene_path`（可选） |
| `read_script` | 读取 .gd 文件内容 | `script_path` |
| `edit_script` | 搜索替换修改脚本内容（自动备份） | `script_path`, `replacements[]` |
| `execute_gdscript` | 通过 Godot CLI 执行 GDScript 代码 | `code`, `project_path` |

### 项目操作

| 工具 | 功能 | 关键参数 |
|------|------|---------|
| `run_project` | 通过 Godot CLI 运行项目 | `project_path`, `mode`, `extra_args` |
| `delete_file` | 删除项目文件（默认回收站模式） | `file_path`, `use_trash`（可选） |
| `read_project_settings` | 读取 project.godot 配置 | `project_path` |
| `edit_project_settings` | 修改 project.godot 配置（自动备份） | `project_path`, `section`, `key`, `value` |

### 校验与搜索

| 工具 | 功能 | 关键参数 |
|------|------|---------|
| `validate_scene` | 校验场景完整性（重复名称、引用检查） | `scene_path` |
| `validate_project` | 校验整个项目结构 | `project_path` |
| `search_nodes` | 按类型/名称/属性跨场景搜索节点 | `project_path`, `node_type`, `name_contains`, `has_property` |
| `find_references` | 查找资源/脚本在哪些场景中被引用 | `project_path`, `resource_path` |

### 资源与通用

| 工具 | 功能 | 关键参数 |
|------|------|---------|
| `list_resources` | 按类型列出项目资源文件 | `project_path`, `type`（可选） |
| `ping` | 测试连通性 | 无参数 |

---

## 开发工作流

```
构思 → create_scene         创建场景骨架
     → add_node + edit_node 搭建节点树，设置属性
     → create_script        编写 GDScript，绑定到节点
     → edit_script          迭代修改代码逻辑
     → run_project          运行验证效果
     → delete_node/delete   清理不需要的节点
     → validate_scene/      校验完整性
     → search_nodes         查找需要修改的位置
```

---

## 限制说明

| 不能做的事 | 原因 |
|-----------|------|
| 导入图片/音效等资源 | 缺少资源导入管线 |
| 可视化场景编辑 | MCP 协议的工具调用本质是文本指令，不是 GUI |
| 大型项目批量重构 | 缺少全局重命名/批量替换工具 |
| 实时场景预览 | 需要 Godot 编辑器集成 |

---

## 安装

### 前置条件

- Node.js 20+
- npm
- Godot 4.x（可选，用于 `run_project` / `execute_gdscript`）

### 从源码安装

```bash
git clone https://github.com/ly-ina/Godot_Ina.git
cd Godot_Ina
npm install
npm run build
```

### 配置 Godot 路径

设置环境变量 `GODOT_PATH` 指向 Godot 可执行文件：

```bash
# Windows
set GODOT_PATH=C:\path\to\Godot_v4.7-stable_win64.exe

# macOS / Linux
export GODOT_PATH=/usr/local/bin/godot
```

---

## 使用

### Claude Desktop

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

### WorkBuddy

在 MCP 设置面板中添加服务器路径。

### 验证安装

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

---

## 架构

```
src/
├── index.ts          入口（StdioServerTransport）
├── tools/            20 个 MCP 工具实现
│   ├── dispatch.ts   工具分发层
│   └── *.ts          各工具（场景/脚本/项目/搜索/校验）
├── parsers/          .tscn 状态机解析器
├── writers/          .tscn 生成器（sceneToTscn）
├── godot/            Godot CLI 封装
├── adapters/         版本适配层
│   ├── v3/           Godot 3.x 适配器 + 节点映射 + GDScript 翻译
│   └── v4/           Godot 4.x 适配器
└── utils/            节点树工具函数
```

### 设计决策

- **解析器**：手写状态机，零依赖。逐行解析 `[block]` 声明和 `key = value` 属性
- **适配器**：工厂模式，自动检测 `.tscn` 的 `format=` 字段选择对应版本适配器
- **错误处理**：输入校验 + 文件存在性检查，错误信息包含可操作的解决方案
- **安全**：所有文件操作有路径校验，编辑操作自动 `.bak` 备份

---

## 开发

```bash
npm run dev         # 开发模式（自动重编译）
npm test            # 运行 271 个测试
npm run test:watch  # watch 模式
npx vitest run --coverage  # 覆盖率报告

# Godot 集成测试（需要设置 GODOT_PATH）
npx vitest run __tests__/godot-integration.test.ts
```

---

## 未来规划

### Phase A: 工具补全 ✅

**目标**：覆盖"能做但不能做全"的缺口，让工具链更完整。

| 任务 | 说明 | 优先级 |
|------|------|--------|
| `import_resource` | 导入图片/音效/字体资源文件 | P1 ✅ |
| `delete_resource` | 删除资源文件（含引用安全检查） | P1 ✅ |
| `rename_node` | 节点重命名（级联更新引用） | P2 ✅ |
| `batch_edit_script` | 全局搜索替换（跨文件批量修改） | P2 ✅ |
| `init_project` | 创建标准 Godot 项目骨架 | P2 ✅ |

### Phase B: 体验优化 ✅

**目标**：让开发过程更流畅，减少手动操作。

| 功能 | 状态 |
|------|------|
| `analyze_project` — 项目全量分析（场景结构、脚本概览、资源依赖、架构洞察） | ✅ |
| `generate_component` — 8 种即用型游戏组件自动生成（player/enemy/collectible/hud/health/projectile/spawner/level） | ✅ |
| `generate_terrain` — 程序化地形（固定地图 + 无限区块 + 洞穴/矿物/液体/植被） | ✅ |
| `generate_behavior_tree` — 行为树 NPC AI（需求系统 + 人格特质 + 日程系统） | ✅ |
| 场景可视化 | ✅ 通过 Visualizer 渲染场景树 |
| `edit_script` 行号模式 | ✅ 行号编辑 |
| 错误建议 | ✅ 结构化返回可操作信息 |

### Phase C: 生态建设 ◀️ 当前阶段

**目标**：让项目可以被发现、被使用、被贡献。

| 任务 | 说明 |
|------|------|
| Godot 3.x 深度适配 | 完整覆盖 GDScript 1.0 → 2.0 自动翻译 | ✅ |
| CI 兼容性矩阵 | Godot 多版本自动集成测试 + ubuntu-24.04 | ✅ |
| `generate_example_project` | 一键生成完整游戏项目（4 种模板） | ✅ |
| 社区文档 | 安装指南、Tools 参考、CONTRIBUTING.md | ✅ |

### Hot Games Feature Wishlist

**未来计划实现的热门游戏功能（Phase C 完成后）：**

| 游戏 | 功能 | 技术要点 |
|------|------|---------|
| 《空洞骑士》 | 类银河城地图关卡系统 | 区域互锁、单向门、解锁能力解锁区域、传送点网络 |
| 《黑帝斯》 | 肉鸽房间生成 + 武器Build系统 | 房间模板池、随机房间连接、武器技能组合、祝福/神恩系统 |
| 《星露谷物语》 | 种田经营系统（已完成场景切换） | 四季作物生长、NPC好感度、节日系统、工具升级、钓鱼小游戏 |
| 《极乐迪斯科》 | 对话树 + 技能判定系统 | 分支对话图编辑器、白黑技能骰子、思想柜、检定系统 |
| 《杀戮尖塔》 | 牌组构建 + 战斗系统 | 卡牌定义、出牌逻辑、效果链、怪物意图系统、遗物系统 |
| 《以撒的结合》 | 随机道具池 + 房间联动 | 道具池权重、被动/主动道具、房间清怪解锁、Boss房/宝物房联动 |
| 《星际战甲》 | Warframe 模块化装备 | 模块插槽、MOD自由组合、数值动态计算、外观幻化系统 |
| 《博德之门3》 | 掷骰叙事 + 环境交互 | D20规则、环境互动脚本、多分支叙事状态机、队友对话系统 |
| 《动物森友会》 | 岛屿改造 + 家具摆放 | 地形编辑、网格吸附摆放、房间装修、DIY合成、化石鉴定 |
| 《传送门》 | 传送枪 + 物理谜题 | 双端口传送、物体质量/动量、激光/光束、凝胶/弹跳表面 |

### Final: 发布

**终版目标**：稳定后发布到 npm，让任何人都能一键安装使用。

| 任务 | 说明 |
|------|------|
| 最终确定包名 | 检查 npm 可用性 |
| CHANGELOG | 完整的版本历史和迁移指南 |
| `npm publish` | 发布到 npm 公共注册表 |
| GitHub Release | 标签触发自动发布 |

> npm 发布将作为最终里程碑——在工具功能、体验、生态都成熟后再进行，而不是半成品就去占坑。

---

## 常见问题

### 支持 Godot 3.x 吗？

支持。适配层可以自动检测版本并映射节点类型（如 `KinematicBody2D` → `CharacterBody2D`），GDScript 翻译器可以将 1.0 语法转为 2.0。

### 需要 Godot 安装才能用吗？

大部分工具不需要。只有 `run_project` 和 `execute_gdscript` 需要真实的 Godot 可执行文件。场景编辑、脚本管理、搜索校验等工具完全独立运行。

### 安全吗？

所有文件操作限制在项目目录范围内，编辑前自动备份（`.bak`），删除默认使用回收站模式。

---

## 许可

MIT License — 详见 [LICENSE](LICENSE)。

**ly-ina** · [GitHub](https://github.com/ly-ina) · [Godot_Ina](https://github.com/ly-ina/Godot_Ina)

---

**最后更新**：2026-07-02 · **版本**：v0.2.0
