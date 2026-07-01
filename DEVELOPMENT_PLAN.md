# godot-mcp-server 开发计划

> 让 AI 助手直接读写 Godot 项目文件的 MCP Server
> 定位：通用开发者工具 · MIT 开源协议 · TypeScript + Node.js

---

## 目录

1. [任务总览与优先级](#任务总览与优先级)
2. [阶段一：调研与准备](#阶段一调研与准备)
3. [阶段二：MVP 核心功能](#阶段二mvp-核心功能)
4. [阶段三：实用价值提升](#阶段三实用价值提升)
5. [阶段四：版本兼容与生态](#阶段四版本兼容与生态)
6. [依赖关系图](#依赖关系图)
7. [各任务详细说明](#各任务详细说明)

---

## 任务总览与优先级

| 优先级 | 任务 | 阶段 | 预计周期 | 必要性 |
| ------ | ---- | ---- | -------- | ------ |
| P0 | 调研 Godot 4 官方文档 | 一 | 3 天 | 必须 |
| P0 | 初始化项目脚手架 | 一 | 2 天 | 必须 |
| P0 | 实现 .tscn 解析器 | 二 | 5 天 | 必须 |
| P0 | 实现 .tscn 生成器 | 二 | 4 天 | 必须 |
| P0 | 实现阶段1 MCP Tools | 二 | 3 天 | 必须 |
| P1 | 实现阶段2 MCP Tools | 二 | 5 天 | 必须 |
| P1 | 集成 Godot CLI | 三 | 4 天 | 必须 |
| P1 | 编写单元测试 | 三 | 4 天 | 必须 |
| P2 | 编写项目文档 | 三 | 2 天 | 必须 |
| P2 | 适配 Godot 3.x | 四 | 7 天 | 重要 |
| P2 | 发布 v1.0 | 四 | 3 天 | 重要 |
| P3 | 高阶 Tools 扩展 | 四 | 长期 | 可选 |
| P3 | CI/CD 搭建 | 四 | 2 天 | 可选 |

---

## 阶段一：调研与准备

### 目标
完成技术调研，搭建可运行的项目骨架，验证 MCP 通信可行性。

### 任务清单

#### T1.1 调研 Godot 4 官方文档（P0·必须）
**输出**：`docs/godot-research.md`

调研要点：
- `.tscn` 文件格式完整规范
  - `[gd_scene]` 根块格式
  - `[node]` 节点块格式（name、type、parent、属性）
  - `[sub_resource]` 子资源块格式
  - `[resource]` 外部资源块格式
  - 属性值的序列化格式（字符串、数组、Vector2、Color 等）
- Godot CLI 全量参数
  - `--headless` 无头模式
  - `--script <file>` 执行脚本
  - `--path <dir>` 指定项目路径
  - `--export-release` 命令行导出
  - 错误码与输出格式
- GDScript 2.0 语法要点（用于脚本生成）

信息来源：
- https://docs.godotengine.org/en/stable/contributing/development/file_formats/tscn.html
- https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html
- https://docs.godotengine.org/en/stable/scripting/gdscript/gdscript_basics.html

#### T1.2 调研 MCP SDK 用法（P0·必须）
**输出**：`docs/mcp-research.md`

调研要点：
- `@modelcontextprotocol/sdk` TypeScript SDK 最新用法
- stdio 传输方式实现细节
- Tool 注册与参数校验规范
- 错误返回规范
- 与 AI 助手（Claude Desktop / WorkBuddy）的集成方式

信息来源：
- https://modelcontextprotocol.io/docs/concepts/architecture
- https://github.com/modelcontextprotocol/typescript-sdk

#### T1.3 初始化项目脚手架（P0·必须）
**输出**：可运行的 `src/index.ts` 入口

步骤：
1. `npm init -y` 初始化项目
2. 安装依赖：`@modelcontextprotocol/sdk`、`zod`（参数校验）、`typescript`、`tsx`
3. 配置 `tsconfig.json`（target ES2022、module Node16）
4. 创建 `src/` 目录结构：
   ```
   src/
   ├── index.ts          # MCP Server 入口
   ├── tools/            # MCP Tools 实现
   │   ├── list_scenes.ts
   │   ├── read_scene.ts
   │   └── ...
   ├── parsers/         # .tscn 解析器
   │   └── tscn-parser.ts
   ├── writers/          # .tscn 生成器
   │   └── tscn-writer.ts
   ├── godot/           # Godot CLI 封装
   │   └── cli.ts
   ├── types/           # TypeScript 类型定义
   │   └── index.ts
   └── utils/           # 工具函数
       └── file.ts
   ```
5. 配置 `package.json` 的 `bin` 字段，支持全局安装直接运行
6. 配置 ESLint + Prettier

#### T1.4 验证 MCP 通信（P0·必须）
**输出**：第一个可运行的 MCP Server，能被 AI 助手识别

步骤：
1. 实现一个最简单的 Tool（`ping`，返回 `pong`）
2. 配置 Claude Desktop / WorkBuddy 的 MCP 配置文件指向本地构建产物
3. 验证 AI 助手可以成功调用 `ping` Tool
4. 确认 stdio 通信正常

---

## 阶段二：MVP 核心功能

### 目标
实现核心的读写能力，让 AI 可以真正操作 Godot 项目文件。

### 任务清单

#### T2.1 实现 .tscn 解析器（P0·必须）
**输出**：`src/parsers/tscn-parser.ts` + 单元测试

支持解析：
- `[gd_scene load_steps=... format=...]` 根声明
- `[ext_resource]` 外部资源引用
- `[sub_resource type="..." id="..."]` 内嵌子资源
- `[node name="..." type="..." parent="..."]` 节点定义
- 节点属性（字符串、整数、浮点数、布尔值、Vector2/3/4、Color、Rect2、Array、Dictionary 等）
- `[connection]` 信号连接

输出结构化类型：
```typescript
interface ParsedScene {
  version: { format: number; loadSteps: number };
  extResources: ExtResource[];
  subResources: SubResource[];
  rootNode: SceneNode;
  connections: Connection[];
}

interface SceneNode {
  name: string;
  type: string;
  parent: string | null;
  properties: Record<string, unknown>;
  children: SceneNode[];
}
```

#### T2.2 实现 .tscn 生成器（P0·必须）
**输出**：`src/writers/tscn-writer.ts` + 单元测试

功能：
- 将 `ParsedScene` 结构化对象写回标准 `.tscn` 文本
- 严格按照 Godot 格式规范生成（缩进、引号、数组格式）
- 支持 `format=4`（Godot 4.x 格式）

验证方式：
- 解析一个已知 `.tscn` 文件 → 写回磁盘 → 用 Godot 编辑器打开验证无误
- 循环测试：parse → modify → write → parse 验证一致性

#### T2.3 实现阶段1 MCP Tools（P0·必须）
**输出**：3 个可使用的 MCP Tools

| Tool | 参数 | 功能 |
| ---- | ----- | ---- |
| `list_scenes` | `project_path?: string` | 递归扫描项目目录，返回所有 `.tscn` 文件列表 |
| `read_scene` | `scene_path: string` | 读取指定场景文件，返回解析后的结构化节点树 |
| `read_script` | `script_path: string` | 读取 `.gd` 文件内容并返回 |

#### T2.4 实现阶段2 MCP Tools（P1·必须）
**输出**：4 个可使用的 MCP Tools

| Tool | 参数 | 功能 |
| ---- | ----- | ---- |
| `create_scene` | `scene_path: string, root_node_type: string, root_node_name?: string` | 新建场景文件，指定根节点类型 |
| `add_node` | `scene_path: string, parent_node_path: string, node_type: string, node_name: string, properties?: object` | 向场景添加节点 |
| `edit_node` | `scene_path: string, node_path: string, properties: object` | 修改节点属性 |
| `create_script` | `script_path: string, content: string, attach_to_scene?: string, attach_to_node?: string` | 新建 GDScript 文件，可选绑定到场景节点 |

安全机制：
- 写入前自动备份原文件（`.bak` 后缀）
- 写入后校验格式，出错自动回滚
- 路径校验，防止目录遍历攻击

---

## 阶段三：实用价值提升

### 目标
集成 Godot CLI，让 AI 不仅能编辑文件，还能运行和测试项目，形成完整开发闭环。

### 任务清单

#### T3.1 集成 Godot CLI（P1·必须）
**输出**：`src/godot/cli.ts`

功能：
- 自动检测系统 Godot 可执行文件路径
  - Windows：`%LOCALAPPDATA%/Godot/` 或环境变量 `GODOT_PATH`
  - macOS：`/Applications/Godot.app/Contents/MacOS/Godot` 或 PATH
  - Linux：`/usr/bin/godot` 或 PATH
- 封装 `run_project(projectPath, options)` 方法
  - 支持 `--headless` 模式
  - 支持 `--script` 执行单段脚本
  - 支持捕获 stdout/stderr
- 实现 `run_project` MCP Tool

#### T3.2 实现 `execute_gdscript` Tool（P2·可选）
**输出**：可直接执行 GDScript 代码片段的能力

功能：
- 将代码片段写入临时 `.gd` 文件
- 调用 `godot --headless --script <file>` 执行
- 捕获输出并返回给调用方
- 执行完毕后清理临时文件

#### T3.3 实现 `validate_scene` Tool（P2·可选）
**输出**：场景文件格式校验能力

功能：
- 检查 `.tscn` 文件格式是否合法
- 检查节点引用、资源引用是否完整
- 返回详细错误信息，方便 AI 修正

#### T3.4 编写单元测试（P1·必须）
**输出**：`__tests__/` 目录，覆盖率目标 >80%

测试范围：
- `.tscn` 解析器：覆盖所有节点类型、所有属性格式、复杂嵌套场景
- `.tscn` 生成器：解析 → 写回 → 再解析一致性测试
- MCP Tools：模拟 AI 调用，验证输入输出格式
- Godot CLI 封装：Mock Godot 可执行文件进行单元测试

#### T3.5 编写项目文档（P1·必须）
**输出**：完整文档集

文档清单：
- `README.md`：项目介绍、安装、快速上手
- `docs/installation.md`：详细安装指南（npm 全局安装、本地开发模式）
- `docs/configuration.md`：配置说明（Godot 路径、项目路径、AI 助手集成）
- `docs/tools-reference.md`：每个 Tool 的详细参数说明与示例
- `docs/ai-usage-examples.md`：AI 助手调用示例集（让 AI 生成场景、修改节点、运行项目等）
- `CONTRIBUTING.md`：贡献指南

---

## 阶段四：版本兼容与生态

### 目标
支持更多 Godot 版本，完善生态，发布正式版本。

### 任务清单

#### T4.1 适配 Godot 3.x（P2·重要）
**输出**：`src/adapters/v3/` 适配层

Godot 3.x 差异处理：
- `.tscn` 格式为 format=2/3（而非 Godot 4 的 format=4）
- 节点类型名称差异（如 `KinematicBody2D` → `CharacterBody2D`）
- GDScript 1.0 语法差异
- CLI 参数差异

架构设计：
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

自动检测：读取 `.tscn` 文件的 `format=` 字段，自动选择对应适配器。

#### T4.2 实现高阶 Tools（P3·可选）
按需实现：

| Tool | 功能 |
| ---- | ---- |
| `manage_resources` | 管理项目资源（图片、音频、字体等）的导入/删除 |
| `edit_project_settings` | 修改 `project.godot` 配置文件 |
| `list_nodes` | 仅返回场景节点树结构（不含属性，轻量快速） |
| `search_nodes` | 在场景中搜索指定类型/名称的节点 |
| `duplicate_scene` | 复制场景文件 |
| `delete_node` | 删除场景中的节点 |

#### T4.3 搭建 CI/CD（P2·可选）
**输出**：GitHub Actions 工作流

工作流：
- `ci.yml`：每次 PR 自动运行测试 + lint
- `release.yml`：打 tag 后自动发布到 npm + 创建 GitHub Release
- `test-compatibility.yml`：定期测试 Godot 各版本兼容性

#### T4.4 发布 v1.0（P2·重要）
**输出**：npm 上的 `@yourname/godot-mcp-server` 包

发布步骤：
1. 确定包名（如 `godot-mcp-server`，需提前在 npm 查重）
2. 完善 `package.json`（description、keywords、repository、license）
3. `npm publish` 发布
4. 创建 GitHub Release，附变更日志
5. 撰写发布公告（Reddit r/godot、Twitter、知乎等）

---

## 依赖关系图

```
T1.1 调研 Godot 文档
  └──→ T2.1 实现 .tscn 解析器

T1.2 调研 MCP SDK
  └──→ T1.3 初始化项目脚手架
          └──→ T1.4 验证 MCP 通信
                  └──→ T2.3 阶段1 Tools

T2.1 .tscn 解析器
  └──→ T2.2 .tscn 生成器
          └──→ T2.4 阶段2 Tools

T1.4 MCP 通信验证
  └──→ T3.1 集成 Godot CLI
          └──→ T3.2 execute_gdscript Tool

T2.1 + T2.2 + T2.3 + T2.4
  └──→ T3.4 编写单元测试

T3.4 单元测试
  └──→ T4.3 搭建 CI/CD

T3.4 + T3.5 文档
  └──→ T4.4 发布 v1.0

T4.4 发布 v1.0
  └──→ T4.1 适配 Godot 3.x（可并行）
```

---

## 各任务详细说明

### 关键设计决策

#### 1. .tscn 解析策略
- **方案 A**：手写解析器（完全控制，无依赖）✅ 推荐
- **方案 B**：使用现有库（如 `godot-tscn-parser`）需验证是否支持 Godot 4

手写解析器思路：
- 按行读取，状态机解析
- 识别 `[xxx]` 块声明
- 解析缩进表示层级关系
- 属性行格式：`property_name = value`

#### 2. 版本适配架构
采用**适配器模式**，每个 Godot 大版本对应一个适配模块：
- 解析器/生成器/CLI 都通过适配器接口调用
- 新增版本支持仅需添加适配器，不影响现有代码

#### 3. 安全设计
- 路径白名单：所有文件操作仅允许在项目目录内进行
- 自动备份：写入前备份，出错自动回滚
- 参数校验：使用 Zod 严格校验所有 Tool 参数

#### 4. 错误处理规范
MCP Tool 错误返回格式：
```typescript
{
  content: [{
    type: "text",
    text: "错误：无法读取场景文件。文件路径：xxx。原因：xxx"
  }],
  isError: true
}
```

---

## 时间规划总表

| 周次 | 主要任务 | 里程碑 |
| ----- | -------- | -------- |
| 第1周 | T1.1~T1.4 | ✅ MCP 通信验证通过 |
| 第2周 | T2.1 .tscn 解析器 | ✅ 可正确解析 Godot 4 场景文件 |
| 第3周 | T2.2 .tscn 生成器 + T2.3 阶段1 Tools | ✅ 可读场景 Tool 上线 |
| 第4周 | T2.4 阶段2 Tools | ✅ 可写场景 Tool 上线 |
| 第5周 | T3.1 Godot CLI 集成 + T3.4 单元测试 | ✅ 可运行项目 Tool 上线 |
| 第6周 | T3.5 文档 + T4.4 发布准备 | ✅ v1.0 发布到 npm |

总计：**6 周完成 v1.0 可用版本**

---

## 立即行动

如果你想立即启动，建议从 **T1.3 初始化项目脚手架** 开始，我可以帮你：

1. ✅ 直接生成完整的项目初始化代码（package.json、tsconfig.json、src/index.ts）
2. ✅ 生成 .tscn 解析器的核心实现代码
3. ✅ 生成第一个 MCP Tool（list_scenes）的完整实现

**请告诉我你想从哪一步开始？**
