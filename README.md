# Godot MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml/badge.svg)](https://github.com/ly-ina/Godot_Ina/actions/workflows/ci.yml)

让 AI 直接读写 Godot 项目文件。37 个工具，316 个测试。

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

## 37 个工具列表

### 场景编辑
| 工具 | 作用 |
|------|------|
| `create_scene` | 创建场景 |
| `read_scene` | 读场景（支持版本自动检测） |
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

### 图形与动画
| 工具 | 作用 |
|------|------|
| `generate_sprite` | AI 生成角色立绘（对话展示用途） |
| `generate_animation` | 生成角色场景骨架（CharacterBody2D + 碰撞体 + 摄像机） |
| `demo_character` | **一键演示**：创建带 AI 行为 + 程序化动画的完整可运行场景 |

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
| 工具数 | 37 |
| 测试数 | 316（27 个文件） |
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

### 阶段性计划

#### 阶段 A — 稳定（已完成）
- [x] 37 个 MCP 工具，316 个测试
- [x] `.tscn` 格式规范（无注释/空行，直接写完整文件）
- [x] GDScript 严格模式兼容（显式类型、`absf()`、`!= null`）
- [x] TileMap 物理碰撞、InputMap 独立（raw keycode）
- [x] 端到端 demo 生成（`generate_minecraft_demo`）

#### 阶段 B — 组合（当前）
- [ ] 工具场景无缝拼接（Main.tscn 自动合并多个系统）
- [ ] 主题/配色统一系统（所有工具从同一配置读取颜色）
- [ ] `generate_minecraft_demo` 增加可选模块（NPC、装备、场景切换）
- [ ] `compose_scene` 工具：将多个独立场景合并成一个主场景

#### 阶段 C — 制作
- [ ] 精灵表生成方案（Aseprite 集成 / AI 逐帧 + 拼合工具）
- [ ] 2D 游戏模板库（RPG、平台跳跃、俯视角射击、策略）
- [ ] 3D 场景基础支持（地形、碰撞、摄像机控制）
- [ ] Godot Asset Library 集成（一键下载 CC0 资源）

#### 阶段 D — 生态
- [ ] npm 发布（`npx godot-mcp-server` 直接使用）
- [ ] Godot 编辑器插件模式（非 CLI，在编辑器内运行）
- [ ] 第三方工具扩展机制（开发者可写自己的生成器）
- [ ] 可视化场景预览（Web UI）

---

### 热门游戏系统集成目标

#### RPG / 开放世界
| 系统 | 灵感来源 | 说明 |
|------|---------|------|
| 对话树 + 分支叙事 | 巫师 3 / 极乐迪斯科 | 带条件判断的多分支对话系统，支持选项、检定、后果 |
| 任务/成就系统 | 上古卷轴 / 原神 | 追踪式任务链，子目标进度，完成奖励 |
| 昼夜循环 + 天气 | 星露谷物语 / 塞尔达 | 光照变化，天气粒子（雨/雪/风），影响游戏玩法 |
| 声望/好感度 | 辐射 / 女神异闻录 | NPC 态度、派系关系、对话选项解锁 |

#### 生存 / 沙盒
| 系统 | 灵感来源 | 说明 |
|------|---------|------|
| 合成 + 建造 | 我的世界 / 泰拉瑞亚 | 配方系统，网格摆放，工作台升级 |
| 饥饿/口渴/体温 | 森林 / 饥荒 | 角色生存数值，状态效果，资源消耗 |
| 领地/基地建设 | 瓦尔海姆 / 方舟 | 地块所有权，结构完整性，NPC 住民 |
| 载具/骑乘 | 塞尔达 / 幻兽帕鲁 | 马/车/飞行器驾驶，物理模拟 |

#### 策略 / 模拟经营
| 系统 | 灵感来源 | 说明 |
|------|---------|------|
| 经济/商店系统 | 星露谷 / 符文工房 | 商品买卖，价格浮动，店铺升级 |
| 种植/养殖 | 星露谷物语 / 牧场物语 | 作物生长周期，动物培育，季节影响 |
| 卡牌/骰子系统 | 杀戮尖塔 / 极乐迪斯科 | 手牌管理，骰子判定，卡牌效果 |
| 小地图/世界地图 | 塞尔达 / 艾尔登法环 | 迷雾探索，标记系统，区域命名 |

#### 战斗 / 动作
| 系统 | 灵感来源 | 说明 |
|------|---------|------|
| 技能树/天赋 | 暗黑破坏神 / 流放之路 | 可升级技能树，被动/主动技能，洗点 |
| 武器/装备系统 | 泰拉瑞亚 / 黑魂 | 武器类型（近战/远程/法术），品质等级，附魔 |
| 护甲/减伤 | 黑魂 / 老头环 | 部位护甲，重量/机动性，抗性 |
| 弹幕/射击 | 以撒 / 挺进地牢 | 子弹模式，武器切换，翻滚闪避 |

#### 联机 / 社交
| 系统 | 灵感来源 | 说明 |
|------|---------|------|
| 本地多人/分屏 | 茶杯头 / 双人成行 | 多角色输入，分屏摄像机 |
| 联机同步 | 泰拉瑞亚 / 星露谷联机 | Godot 多人同步，状态复制，延迟补偿 |
| 排行榜/成就 | 各种游戏 | 数据持久化，Steam/平台集成 |

#### 辅助系统
| 系统 | 说明 |
|------|------|
| 存档/读档 | JSON/二进制序列化，自动备份 |
| 设置菜单 | 音量/画面/键位自定义 |
| 音效/音乐管理 | 背景音乐切换，音效池，3D 音效 |
| 过场/演出 | 镜头动画，对话框，黑屏过渡 |

---

## 当前目标

| 优先级 | 任务 | 状态 |
|--------|------|------|
| 🔴 P0 | 修复所有 .tscn 生成器的空行/注释问题 | 已完成 |
| 🔴 P0 | 保证生成的 GDScript 在严格模式下通过 | 已完成 |
| 🟠 P1 | 工具生成的场景可互相拼接 | 进行中 |
| 🟠 P1 | 统一配色/尺寸系统 | 待开始 |
| 🟡 P2 | `generate_minecraft_demo` 模块化（NPC/装备/切换） | 待开始 |
| 🟡 P2 | NPM 发布 | 待开始 |
| 🔵 P3 | 3D 支持 | 远期 |
| 🔵 P3 | 精灵表生成 | 远期 |

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
