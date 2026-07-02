# 工具参考

## 场景操作

### `create_scene`
创建新的 `.tscn` 场景文件。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_path` | string | 是 | 场景文件路径 |
| `root_node_name` | string | 是 | 根节点名称 |
| `root_node_type` | string | 是 | 根节点类型（如 `Node2D`, `CharacterBody2D`） |
| `project_path` | string | 否 | Godot 项目根路径 |

### `read_scene`
读取并解析 `.tscn` 场景文件，返回节点树。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_path` | string | 是 | 场景文件路径 |

### `list_scenes`
列出项目中的所有 `.tscn` 场景文件。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 否 | 项目路径（默认当前目录） |

### `add_node`
向场景添加新节点。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_path` | string | 是 | 场景文件路径 |
| `parent_node_name` | string | 是 | 父节点名称（`.` 表示根级） |
| `node_type` | string | 是 | 节点类型 |
| `node_name` | string | 是 | 新节点名称（必须唯一） |
| `properties` | object | 否 | 初始属性 |

### `edit_node`
编辑节点属性。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_path` | string | 是 | 场景文件路径 |
| `node_name` | string | 是 | 要编辑的节点名称 |
| `properties` | object | 是 | 要修改的属性（设为 `null` 删除属性） |

### `delete_node`
从场景中删除节点。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_path` | string | 是 | 场景文件路径 |
| `node_name` | string | 是 | 要删除的节点名称 |
| `recursive` | boolean | 否 | 是否级联删除子节点（默认 `false`） |

---

## 脚本操作

### `create_script`
创建 `.gd` GDScript 文件，可选绑定到场景节点。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `script_path` | string | 是 | 脚本文件路径 |
| `content` | string | 是 | GDScript 代码 |
| `scene_path` | string | 否 | 场景文件路径（用于绑定） |
| `node_name` | string | 否 | 要绑定到的节点名称 |

### `read_script`
读取 `.gd` GDScript 文件。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `script_path` | string | 是 | 脚本文件路径 |

### `edit_script`
修改已有 `.gd` 脚本内容（搜索替换模式）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `script_path` | string | 是 | 脚本文件路径 |
| `replacements` | array | 是 | 替换操作列表 `[{search, replace}]` |
| `create_backup` | boolean | 否 | 是否创建备份（默认 `true`） |

---

## 项目操作

### `run_project`
通过 Godot CLI 运行项目。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |
| `mode` | string | 否 | 运行模式: `normal` / `headless` / `debug` |
| `extra_args` | array | 否 | 额外 CLI 参数 |
| `timeout` | number | 否 | 超时毫秒数（默认 30000） |

### `delete_file`
删除项目文件（默认移到回收站）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file_path` | string | 是 | 文件路径 |
| `use_trash` | boolean | 否 | 是否使用回收站（默认 `true`） |

### `execute_gdscript`
通过 Godot CLI 执行 GDScript 代码片段。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | GDScript 代码 |
| `project_path` | string | 是 | 项目路径 |
| `timeout` | number | 否 | 超时毫秒数（默认 30000） |

---

## 资源与配置

### `list_resources`
列出项目资源文件。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |
| `type` | string | 否 | 筛选类型: `all` / `image` / `audio` / `font` / `scene` / `script` |

### `read_project_settings`
读取 project.godot 配置。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |

### `edit_project_settings`
修改 project.godot 配置项。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |
| `section` | string | 是 | 配置节（如 `application`, `rendering`） |
| `key` | string | 是 | 配置键（如 `config/name`） |
| `value` | string | 是 | 值 |
| `type` | string | 否 | 类型提示: `string` / `int` / `float` / `bool` |

---

## 校验与搜索

### `validate_scene`
校验 `.tscn` 场景文件完整性。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_path` | string | 是 | 场景文件路径 |
| `project_path` | string | 否 | 项目路径（用于资源引用检查） |

### `validate_project`
校验整个 Godot 项目。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |

### `search_nodes`
跨场景搜索节点。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |
| `node_type` | string | 否 | 按类型筛选 |
| `name_contains` | string | 否 | 按名称（子串）筛选 |
| `has_property` | string | 否 | 按属性名筛选 |

### `find_references`
查找资源/脚本的场景引用。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_path` | string | 是 | 项目路径 |
| `resource_path` | string | 是 | 资源路径 |

---

## 通用

### `ping`
测试连通性。无参数，返回 `"pong"`。
