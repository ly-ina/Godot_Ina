# godot-mcp-server 开发计划

> 通用 Godot MCP Server · MIT 开源 · TypeScript + Node.js

---

## 当前进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：调研与准备 | ✅ 完成 | MCP 通信验证通过 |
| 阶段二：MVP 核心功能 | ✅ 完成 | 9 个 Tools，场景读写闭环 |
| 阶段三：实用价值提升 | ✅ 完成 | Godot CLI 集成，31 个单元测试 |
| 阶段四：版本兼容与生态 | 🚧 进行中 | |

---

## 阶段四：版本兼容与生态（详细）

### 目标
支持多 Godot 版本，完善生态，发布正式版本。

---

### T4.1 适配 Godot 3.x（P2·重要）

#### 调研
- [ ] 4.1.1 确认 Godot 3.x 与 4.x 的 `.tscn` 格式差异清单
- [ ] 4.1.2 确认 Godot 3.x 与 4.x 的 CLI 参数差异清单
- [ ] 4.1.3 确认 GDScript 1.0 与 2.0 语法差异清单
- [ ] 4.1.4 确认节点类型名称差异映射表（如 `KinematicBody2D` → `CharacterBody2D`）

#### 适配层实现
- [ ] 4.1.5 设计适配器接口（`ITscnParser`、`ITscnWriter`、`IGodotCli`）
- [ ] 4.1.6 实现 Godot 3.x TscnParser（format=2/3）
- [ ] 4.1.7 实现 Godot 3.x TscnWriter（format=2/3 输出）
- [ ] 4.1.8 实现 Godot 3.x CLI 封装（参数差异处理）
- [ ] 4.1.9 实现版本自动检测 + 适配器选择逻辑

#### 测试
- [ ] 4.1.10 编写 Godot 3.x 解析器单元测试
- [ ] 4.1.11 编写 Godot 3.x round-trip 测试
- [ ] 4.1.12 用真实 Godot 3.x 项目验证

---

### T4.2 高阶 MCP Tools（P3·可选）

#### 场景增强工具
- [ ] 4.2.1 `remove_node` — 从场景中删除指定节点
- [ ] 4.2.2 `duplicate_node` — 复制场景中的节点（含子树）
- [ ] 4.2.3 `rename_node` — 重命名场景节点
- [ ] 4.2.4 `move_node` — 移动节点到不同父节点
- [ ] 4.2.5 `merge_scenes` — 将一个场景的节点树合并到另一个场景
- [ ] 4.2.6 `validate_scene` — 校验 `.tscn` 格式 + 资源引用完整性
- [ ] 4.2.7 `execute_gdscript` — 通过 Godot CLI 执行 GDScript 代码片段（写入临时文件 → 执行 → 清理 → 返回结果）

#### 资源管理工具
- [ ] 4.2.8 `list_resources` — 列出项目所有资源文件（图片、音频、字体等）
- [ ] 4.2.9 `import_resource` — 导入新资源文件到项目
- [ ] 4.2.10 `edit_resource` — 修改资源的导入设置（`.import` 文件）

#### 项目配置工具
- [ ] 4.2.11 `read_project_settings` — 读取 `project.godot` 配置
- [ ] 4.2.12 `edit_project_settings` — 修改 `project.godot` 配置（应用名、图标、输入映射等）
- [ ] 4.2.13 `list_autoloads` — 列出项目自动加载的脚本/场景

#### 搜索与查询工具
- [ ] 4.2.14 `search_nodes` — 跨场景搜索节点（按名称/类型/属性过滤）
- [ ] 4.2.15 `search_resources` — 搜索资源文件（按类型/名称/标签）
- [ ] 4.2.16 `list_dependencies` — 列出场景依赖的资源文件

#### 工程管理工具
- [ ] 4.2.17 `export_project` — 调用 Godot CLI 导出项目（Android/iOS/Windows/Linux/Web）
- [ ] 4.2.18 `backup_project` — 备份项目为时间戳压缩包
- [ ] 4.2.19 `diff_scene` — 对比两个场景文件的节点差异

---

### T4.3 搭建 CI/CD（P2·可选）

- [ ] 4.3.1 配置 GitHub Actions：`ci.yml`
  - [ ] 每次 PR 自动运行 `npm test`
  - [ ] 运行 `npm run build` 验证 TypeScript 编译
  - [ ] 缓存 node_modules 加速构建
- [ ] 4.3.2 配置 GitHub Actions：`release.yml`
  - [ ] Git tag 触发自动构建
  - [ ] 自动运行全部测试
  - [ ] `npm publish` 发布到 npm
  - [ ] 创建 GitHub Release 页面
  - [ ] 生成 changelog
- [ ] 4.3.3 配置代码质量检查
  - [ ] ESLint 自动检查
  - [ ] Prettier 格式化检查
  - [ ] TypeScript strict 模式检查
- [ ] 4.3.4 配置版本兼容性测试
  - [ ] 定期测试 Godot 4.x 最新版本兼容性
  - [ ] Godot 3.x 适配完成后加入兼容矩阵

---

### T4.4 测试覆盖完善（P1·必须）

#### 现有测试补充
- [ ] 4.4.1 补充解析器 edge case 测试：空属性节点、嵌套深度 >10、超大文件（>1MB）
- [ ] 4.4.2 补充生成器测试：含所有属性类型的 round-trip 验证
- [ ] 4.4.3 补充 `add_node`/`edit_node`/`create_script` 集成测试
- [ ] 4.4.4 补充 `run_project` Tool 测试（mock Godot CLI）
- [ ] 4.4.5 补充 `read_scene` 输出格式验证测试

#### 新增测试类型
- [ ] 4.4.6 集成测试：完整工作流（create_scene → add_node → edit_node → read_scene）
- [ ] 4.4.7 错误处理测试：非法输入、文件不存在、权限不足
- [ ] 4.4.8 性能测试：解析大型 `.tscn` 文件（500+ 节点）
- [ ] 4.4.9 覆盖率目标：`src/` 目录 >85%

---

### T4.5 文档完善（P1·必须）

#### 核心文档（已有 README，需细化）
- [ ] 4.5.1 `docs/installation.md` — 详细安装指南（npm 全局 / 源码 / Docker）
- [ ] 4.5.2 `docs/configuration.md` — 配置说明（Godot 路径、AI 助手集成方式）
- [ ] 4.5.3 `docs/tools-reference.md` — 每个 Tool 的完整参数表 + 调用示例 + 返回值说明
- [ ] 4.5.4 `docs/ai-usage-examples.md` — AI 助手调用场景示例（中文 prompt + 对应 Tool 调用）
- [ ] 4.5.5 `CONTRIBUTING.md` — 贡献指南（代码规范、PR 流程、issue 模板）

#### 辅助文档
- [ ] 4.5.6 `CHANGELOG.md` — 版本变更记录
- [ ] 4.5.7 `SECURITY.md` — 安全策略（漏洞报告流程）
- [ ] 4.5.8 `CODE_OF_CONDUCT.md` — 行为准则

---

### T4.6 发布 v1.0（P2·重要）

#### 发布准备
- [ ] 4.6.1 最终确定包名（`godot-mcp-server`，npm 查重）
- [ ] 4.6.2 完善 `package.json`（含 `bin`、`exports`、`engines`、`funding` 字段）
- [ ] 4.6.3 生成 `LICENSE` 文件（MIT）
- [ ] 4.6.4 检查所有第三方依赖的许可证兼容性
- [ ] 4.6.5 确保 `npm pack --dry-run` 输出的文件列表正确（不含源码、测试、文档）

#### 发布执行
- [ ] 4.6.6 打 `v1.0.0` 标签并推送到 GitHub
- [ ] 4.6.7 CI/CD 自动发布到 npm（或手动 `npm publish`）
- [ ] 4.6.8 创建 GitHub Release 页面，编写 changelog

#### 发布后
- [ ] 4.6.9 发布到 Reddit r/godot（英文介绍 + 快速开始）
- [ ] 4.6.10 发布到知乎/掘金（中文介绍 + 使用教程）
- [ ] 4.6.11 发布到 GitHub Topic：`mcp-server`、`godot`、`game-development`
- [ ] 4.6.12 编写 AI 助手配置教程（Claude Desktop / Cursor / Windsurf）

---

### T4.7 长期维护（持续）

- [ ] 4.7.1 跟踪 Godot 官方更新，及时适配新版本
- [ ] 4.7.2 处理 GitHub Issues 和 PR
- [ ] 4.7.3 定期审查和更新依赖版本
- [ ] 4.7.4 收集用户反馈，规划 v2.0 功能
- [ ] 4.7.5 考虑支持 Godot 插件生态（Asset Library 集成）

---

## 依赖关系图

```
当前基础：阶段一/二/三已完成（9 个 Tools + 31 个测试）

阶段四任务依赖：

4.1 适配 Godot 3.x
  ├── 4.1.1~4.1.4 调研（独立，可并行开始）
  ├── 4.1.5~4.1.9 实现（依赖调研结果）
  └── 4.1.10~4.1.12 测试（依赖实现）

4.2 高阶 Tools（可与 4.1 并行）
  ├── 4.2.1~4.2.7 场景增强（依赖现有 Parser/Writer）
  ├── 4.2.8~4.2.10 资源管理（独立）
  ├── 4.2.11~4.2.13 项目配置（独立）
  ├── 4.2.14~4.2.16 搜索查询（可并行）
  └── 4.2.17~4.2.19 工程管理（依赖 CLI）

4.3 CI/CD（可与 4.1/4.2 并行）
  └── 依赖：4.4 测试通过

4.4 测试覆盖（贯穿全程，持续补充）
  └── 依赖：现有代码稳定

4.5 文档（可与 4.1/4.2 并行）
  └── 依赖：功能稳定后文档才准确

4.6 发布 v1.0
  └── 依赖：4.4 测试达标 + 4.5 文档完整

4.7 长期维护（发布后持续）
  └── 依赖：4.6 v1.0 发布
```

---

## 优先级建议

| 优先级 | 任务 | 预计时间 | 推荐顺序 |
|--------|------|---------|---------|
| P0 | 4.4 测试覆盖完善 | 2-3 天 | **先做** |
| P1 | 4.5 文档完善 | 2 天 | 第2顺位 |
| P1 | 4.6 发布 v1.0 | 1 天 | 第3顺位 |
| P2 | 4.1 适配 Godot 3.x | 5-7 天 | 发布后 |
| P2 | 4.3 CI/CD 搭建 | 2 天 | 发布后 |
| P3 | 4.2 高阶 Tools | 长期迭代 | 按需 |
| P3 | 4.7 长期维护 | 持续 | 持续 |

**建议下一步**：从 4.4（测试覆盖）开始，确保代码质量后发布 v1.0。
