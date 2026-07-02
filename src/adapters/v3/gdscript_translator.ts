// GDScript 1.0 (Godot 3.x) to 2.0 (Godot 4.x) translation utilities
//
// Key differences between GDScript 1.0 and 2.0:
// - `func _ready():` → `func _ready():` (same, but self keyword removed)
// - `onready var` → `@onready var`
// - `export var` → `@export var`
// - `tool` → `@tool`
// - `is` keyword for type checking → `is` still works but `is_instance_of()` removed
// - `preload()` → `preload()` (same)
// - `yield()` → `await` + signal
// - `assert()` → `assert()` (same but slightly different error format)
// - `range()` with floats → floats work in Godot 4
// - `OS` → `DisplayServer`, `Time`, etc.

export interface GDScriptTranslation {
  original: string;
  translated: string;
  changes: string[];
}

/**
 * Translate a GDScript file from Godot 3.x (1.0) to Godot 4.x (2.0) syntax.
 */
export function translateGDScript(code: string): GDScriptTranslation {
  const changes: string[] = [];
  let result = code;

  // 1. `tool` → `@tool`
  if (/^tool\s*$|^tool\s*\n/m.test(result)) {
    result = result.replace(/^tool\s*$/m, "@tool");
    changes.push("tool → @tool");
  }

  // 2. `onready var` → `@onready var` (but not `@onready var` → `@@onready var`)
  if (/\bonready\s+var\b/.test(result) && !/^@onready\s+var\b/m.test(result)) {
    result = result.replace(/(?<!@)onready\s+var\b/g, "@onready var");
    changes.push("onready var → @onready var");
  }

  // 3. `export var` → `@export var`
  if (/^export\s+var\b/m.test(result)) {
    result = result.replace(/^export\s+var\b/gm, "@export var");
    changes.push("export var → @export var");
  }

  // 4. `export(...)` → `@export_...`
  result = result.replace(/^export\((\d+)\)\s+var\b/gm, "@export_range($1) var");
  // simpler export hints
  result = result.replace(/^export\((\w+(?:\.\w+)?)\)\s+var\b/gm, "@export var");

  // 5. `yield(` → `await ` (basic pattern - complex yields need manual review)
  if (/\byield\s*\(/.test(result)) {
    // Simple yield(get_tree(), "idle_frame") → await get_tree().process_frame
    result = result.replace(/yield\s*\(\s*get_tree\(\s*\)\s*,\s*["']idle_frame["']\s*\)/g, "await get_tree().process_frame");
    result = result.replace(/yield\s*\(\s*get_tree\(\s*\)\s*,\s*["']physics_frame["']\s*\)/g, "await get_tree().physics_frame");
    // yield(object, "signal_name") → await object.signal_name
    result = result.replace(/yield\s*\(\s*(\$?\w+)\s*,\s*["'](\w+)["']\s*\)/g, "await $1.$2");
    changes.push("yield → await (signals)");
  }

  // 6. `Input.is_key_pressed()` → `Input.is_key_pressed()` (same API but enum values changed)

  // 7. Remove `self.` prefix in most cases (still valid, but idiom changed)
  // Not auto-removing since it's still valid syntax

  // 8. `OS.get_window_size()` → `DisplayServer.window_get_size()`
  if (/\bOS\.get_window_size\s*\(/.test(result)) {
    result = result.replace(/\bOS\.get_window_size\s*\(\)/g, "DisplayServer.window_get_size()");
    changes.push("OS.get_window_size() → DisplayServer.window_get_size()");
  }

  // 9. `OS.get_screen_size()` → `DisplayServer.screen_get_size()`
  if (/\bOS\.get_screen_size\s*\(/.test(result)) {
    result = result.replace(/\bOS\.get_screen_size\s*\(\)/g, "DisplayServer.screen_get_size()");
    changes.push("OS.get_screen_size() → DisplayServer.screen_get_size()");
  }

  // 10. `OS.get_datetime()` → `Time.get_datetime_dict_from_system()`
  if (/\bOS\.get_datetime\s*\(/.test(result)) {
    result = result.replace(/\bOS\.get_datetime\s*\(\)/g, "Time.get_datetime_dict_from_system()");
    changes.push("OS.get_datetime() → Time.get_datetime_dict_from_system()");
  }

  // 11. Pool*Array → Packed*Array
  const poolArrays = [
    ["PoolByteArray", "PackedByteArray"],
    ["PoolIntArray", "PackedInt32Array"],
    ["PoolFloatArray", "PackedFloat32Array"],
    ["PoolStringArray", "PackedStringArray"],
    ["PoolVector2Array", "PackedVector2Array"],
    ["PoolVector3Array", "PackedVector3Array"],
    ["PoolColorArray", "PackedColorArray"],
  ];
  for (const [old, next] of poolArrays) {
    if (result.includes(old)) {
      result = result.split(old).join(next);
      changes.push(`${old} → ${next}`);
    }
  }

  return {
    original: code,
    translated: result,
    changes,
  };
}
