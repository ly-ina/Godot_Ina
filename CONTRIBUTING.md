# 贡献指南

感谢你考虑为 godot-mcp-server 贡献代码！

## 行为准则

- 尊重所有参与者
- 接受建设性反馈
- 关注对项目最有利的事

## 如何贡献

### 报告 Bug

提交 Issue 时请包含：

- Godot 版本
- Node.js 版本
- 操作系统
- 完整的错误信息
- 复现步骤（最好附上最小复现项目）

### 建议新功能

提交 Issue 时请说明：

- 这个功能解决什么问题
- 预期的行为
- 是否与现有功能冲突

### 提交 Pull Request

1. Fork 仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交改动：`git commit -m "feat: add my feature"`
4. 推送到你的 Fork：`git push origin feature/my-feature`
5. 创建 Pull Request

## 开发规范

### 代码风格

- 使用 TypeScript，严格模式
- 遵循现有的代码风格（2 空格缩进）
- 所有函数必须有 TypeScript 类型注解
- 所有 MCP Tool 必须有 Zod 或手动参数校验

### 提交信息格式

```
<type>: <description>

type 可选: feat, fix, docs, style, refactor, test, chore
```

示例：
- `feat: add edit_script tool with search/replace support`
- `fix: handle empty parent path in node tree builder`
- `docs: update installation guide for Windows`

### 测试要求

- 新功能必须添加单元测试
- 所有测试必须通过：`npm test`
- 尽量保持或提升代码覆盖率

### MCP Tool 设计规范

1. 工具名称使用蛇形命名法（`snake_case`）
2. 所有参数使用 `interface` 定义类型
3. 输入参数必须校验（空值、类型、文件存在性）
4. 返回人类可读的 Markdown 文本
5. 错误信息必须可操作（告诉用户该怎么做）

## 项目结构

```
src/
├── index.ts          # MCP Server 入口
├── tools/            # MCP 工具实现
│   ├── dispatch.ts   # 工具分发层
│   └── *.ts          # 各工具实现
├── parsers/          # .tscn 解析器
├── writers/          # .tscn 生成器
├── godot/            # Godot CLI 封装
└── utils/            # 工具函数
```

## 本地开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（自动重编译）
npm run dev

# 运行测试
npm test

# 查看覆盖率
npx vitest run --coverage
```

## 发布流程

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 创建 Git Tag：`git tag v1.0.0`
4. 推送到 GitHub：`git push --tags`
5. GitHub Actions 自动发布到 npm

## 联系方式

- GitHub Issues: [https://github.com/ly-ina/Godot_Ina/issues](https://github.com/ly-ina/Godot_Ina/issues)
- 项目主页: [https://github.com/ly-ina/Godot_Ina](https://github.com/ly-ina/Godot_Ina)
