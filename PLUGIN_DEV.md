# 插件开发指南

godot-mcp-server 支持外部开发者通过**插件机制**扩展游戏系统生成器。本文档说明如何编写、注册和测试你自己的生成器插件。

## 插件是什么

插件是**自定义的 `generate_game` 类型**。内置类型包括 `component`、`terrain`、`behavior_tree` 等，插件可以添加你自己的类型，比如 `my_dialogue_system`、`my_quest_system`。

## 快速开始

### 1. 创建插件文件

在 `src/plugins/` 目录下创建一个 `.ts` 文件：

```typescript
// src/plugins/my_system.ts
import type { GeneratorPlugin } from "../tools/plugin-registry.js";

export const plugin: GeneratorPlugin = (args) => {
  const { project_path, extra } = args;
  
  // 你的生成逻辑
  const output = `生成的系统内容，包含项目路径：${project_path}`;
  
  return output;
};

// 插件名称（用于 generate_game type 参数）
export const pluginName = "my_system";
```

### 2. 注册插件

在 `src/plugin_loader.ts` 中添加注册代码：

```typescript
import { PluginRegistry } from "../tools/plugin-registry.js";
import { plugin as mySystemPlugin } from "./plugins/my_system.js";
import { pluginName as mySystemName } from "./plugins/my_system.js";

// 注册
PluginRegistry.register(mySystemName, mySystemPlugin);
```

### 3. 调用插件

通过 `generate_game` 工具调用：

```json
{
  "type": "my_system",
  "project_path": "/path/to/godot/project",
  "extra": "{\"param1\": \"value1\", \"param2\": 42}"
}
```

## 插件 API

### 函数签名

```typescript
type GeneratorPlugin = (args: GenerateGameArgs) => string;
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `project_path` | `string` | Godot 项目根目录绝对路径 |
| `type` | `string` | 插件类型名（与注册名一致） |
| `name` | `string` | 生成的系统名称（可选） |
| `description` | `string` | 描述文本（可选） |
| `behavior` | `string` | 行为模式（可选） |
| `template` | `string` | 模板名称（可选） |
| `extra` | `string` | JSON 字符串，自定义参数（可选） |

### 返回值

返回一个字符串，描述生成的内容。可以是纯文本、JSON 或 Markdown。

## 完整示例

```typescript
// src/plugins/collectible_system.ts
import * as fs from "fs";
import * as path from "path";
import type { GeneratorPlugin } from "../tools/plugin-registry.js";

export const plugin: GeneratorPlugin = (args) => {
  const { project_path, extra } = args;
  const itemsDir = path.join(project_path, "scenes", "collectibles");
  
  // 解析自定义参数
  let count = 5;
  if (extra) {
    try {
      const parsed = JSON.parse(extra);
      count = parsed.count || count;
    } catch { /* 使用默认值 */ }
  }
  
  // 创建目录
  fs.mkdirSync(itemsDir, { recursive: true });
  
  // 生成收集品场景
  for (let i = 0; i < count; i++) {
    const scenePath = path.join(itemsDir, `gem_${i}.tscn`);
    fs.writeFileSync(scenePath, `
[gd_scene format=3]
[node name="Gem${i}" type="Area2D"]
position = Vector2(${i * 50}, 0)
    `.trim(), "utf-8");
  }
  
  return `Created ${count} collectible scenes in ${itemsDir}`;
};

export const pluginName = "collectibles";
```

## 最佳实践

1. **参数验证**：在插件函数开始时验证必要参数，抛出清晰错误
2. **文件操作**：使用 `fs.mkdirSync` 确保目录存在，使用绝对路径
3. **输出说明**：返回的字符串应说明生成了什么、在哪里
4. **失败安全**：使用 try-catch 包装复杂逻辑，不要抛出未处理异常
5. **引用统一配置**：从 `src/config/game-theme.ts` 导入颜色/尺寸保持风格一致

## 调试插件

```bash
# 1. 确保编译通过
npm run build

# 2. 直接调用测试
node -e "
const { PluginRegistry } = require('./dist/tools/plugin-registry.js');
console.log('Registered plugins:', PluginRegistry.list());
"

# 3. 通过 dispatch 测试
node -e "
const { executeTool } = require('./dist/tools/dispatch.js');
console.log(JSON.stringify(executeTool('generate_game', {
  type: 'my_system',
  project_path: '/tmp/test_project'
})));
"
```

## 常见问题

**Q: 插件注册了但 generate_game 找不到？**
A: 确保 `plugin_loader.ts` 在服务器启动时执行。将注册代码放在文件顶层（不在函数内）。

**Q: 插件需要 NPM 依赖？**
A: 插件文件在服务器进程内运行，可以 `import` 任何已安装的依赖。如果依赖不存在，build 会失败。

**Q: 怎么让插件自动加载？**
A: `src/plugin_loader.ts` 已经扫描 `src/plugins/` 目录。只要文件在目录下且被 `import`，就会自动加载。
