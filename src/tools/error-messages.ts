// 中文错误信息 + 解决方案建议
// Map English errors to Chinese messages with actionable suggestions

const ERROR_SUGGESTIONS: Array<{ pattern: RegExp; message: string }> = [
  // ── 路径 / 文件 ──
  {
    pattern: /project_path is required/i,
    message: "缺少项目路径参数。请在调用时传入 project_path（Godot 项目根目录的绝对路径）。",
  },
  {
    pattern: /scene_path is required/i,
    message: "缺少场景文件路径。请在调用时传入 scene_path（如 scenes/Main.tscn）。",
  },
  {
    pattern: /script_path is required/i,
    message: "缺少脚本文件路径。请在调用时传入 script_path（如 scripts/player.gd）。",
  },
  {
    pattern: /project path not found/i,
    message: "项目路径不存在。请检查传入的 project_path 是否正确，目录是否已被移动或删除。",
  },
  {
    pattern: /scene file not found/i,
    message: "场景文件不存在。请确认场景路径正确，或先用 list_scenes / analyze_project 查看项目中可用的场景。",
  },
  {
    pattern: /script file not found/i,
    message: "脚本文件不存在。请确认脚本路径正确。",
  },
  {
    pattern: /resource not found/i,
    message: "资源文件不存在。检查资源路径，或先通过 manage_assets/list 查看已有资源。",
  },
  {
    pattern: /file not found/i,
    message: "文件不存在。请检查路径是否正确。",
  },
  {
    pattern: /already exists/i,
    message: "文件或资源已存在。如需覆盖请先删除或使用不同名称。",
  },

  // ── 格式 / 语法 ──
  {
    pattern: /parse.*error/i,
    message: "文件解析失败。可能的原因：① .tscn 格式有语法错误 ② 属性值加错了引号（Vector2/Color/ExtResource 不加引号，只有纯文本才加）③ GDScript 有语法错误。",
  },
  {
    pattern: /Failed to parse/i,
    message: "场景文件解析失败。检查 .tscn 文件的格式是否符合 Godot 4 规范。",
  },
  {
    pattern: /format 3/i,
    message: "当前文件是 Godot 3.x 格式。请使用 translate_project 工具进行转换。",
  },
  {
    pattern: /GDScript.*error/i,
    message: "GDScript 编译错误。注意严格模式下：① 不要用 := 类型推断（改用显式类型如 : float）② 用 absf() 代替 abs() ③ 用 == null 代替 not 进行空值判断。",
  },
  {
    pattern: /invalid type/i,
    message: "参数类型错误。请检查传入的参数类型是否与工具定义匹配。",
  },

  // ── 执行 / 运行 ──
  {
    pattern: /GODOT_PATH/i,
    message: "找不到 Godot 可执行文件。请设置环境变量 GODOT_PATH 指向 Godot 4.x 的 exe 路径，或将 Godot 添加到系统 PATH 中。",
  },
  {
    pattern: /godot.*not found/i,
    message: "找不到 Godot 可执行文件。请设置环境变量 GODOT_PATH。",
  },
  {
    pattern: /timeout/i,
    message: "Godot 执行超时。项目可能陷入了死循环或缺少 get_tree().quit()。如果场景中使用了 headless 模式，请确保脚本最后调用了 quit()。",
  },
  {
    pattern: /exit code/i,
    message: "Godot 进程异常退出。运行 --headless --import 导入资源后再试，或检查项目是否有语法错误。",
  },

  // ── 引用 / 依赖 ──
  {
    pattern: /ext_resource.*not found/i,
    message: "场景引用了不存在的资源文件。检查 ExtResource 的 path 属性是否指向正确的文件，或资源文件是否已被删除。",
  },
  {
    pattern: /vanished/i,
    message: "节点父路径丢失。通常是因为父节点创建失败（如脚本加载错误）。检查父节点的脚本和属性是否正确。",
  },
  {
    pattern: /parent.*not found/i,
    message: "父节点路径不存在。检查 parent 属性指向的节点名称是否正确，所有父节点必须在子节点之前声明。",
  },
  {
    pattern: /reference/i,
    message: "引用断裂。被引用的资源或节点不存在。",
  },

  // ── 生成器 ──
  {
    pattern: /template.*not found/i,
    message: "模板类型不存在。可用类型：platformer2d, rpg_topdown, topdown_shooter, strategy_slg。",
  },
  {
    pattern: /unknown.*type/i,
    message: "不支持的生成类型。可用 generate_game type 列表：component, terrain, behavior_tree, equipment, scene_transition, slg_map, example_project, character_animation, character_demo, sprite, minecraft_demo。",
  },
  {
    pattern: /unknown tool/i,
    message: "未知的工具名称。可用工具列表：init_project, edit_scene, edit_script, edit_settings, generate_game, run_project, analyze_project, manage_assets, translate_project, generate_template, generate_scene_3d, fetch_asset, ping。",
  },

  // ── 通用 ──
  {
    pattern: /required/i,
    message: "缺少必要参数。请查阅工具定义，补全 required 中列出的参数。",
  },
];

/**
 * Wrap an error with Chinese message + solution suggestion
 */
export function cnError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  for (const entry of ERROR_SUGGESTIONS) {
    if (entry.pattern.test(msg)) {
      return `❌ 操作失败\n\n原因：${msg}\n\n💡 解决方案：${entry.message}`;
    }
  }
  return `❌ 操作失败\n\n原因：${msg}\n\n💡 如果问题持续，请检查传入参数是否正确，或查看 README 中的工具使用说明。`;
}
