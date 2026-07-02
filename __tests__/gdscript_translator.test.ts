// Tests for GDScript 1.0 → 2.0 translator
import { describe, it, expect } from "vitest";
import { translateGDScript } from "../src/adapters/v3/gdscript_translator.js";

describe("translateGDScript", () => {
  it("translates tool → @tool", () => {
    const r = translateGDScript("tool\nextends Node2D\n");
    expect(r.translated).toContain("@tool");
    expect(r.changes).toContain("tool → @tool");
  });

  it("translates onready var → @onready var", () => {
    const r = translateGDScript("onready var sprite = $Sprite\n");
    expect(r.translated).toContain("@onready var");
    expect(r.changes).toContain("onready var → @onready var");
  });

  it("translates export var → @export var", () => {
    const r = translateGDScript("export var speed = 300\n");
    expect(r.translated).toContain("@export var");
    expect(r.changes).toContain("export var → @export var");
  });

  it("translates yield() → await", () => {
    const r = translateGDScript('yield(get_tree(), "idle_frame")\n');
    expect(r.translated).toContain("await get_tree().process_frame");
    expect(r.changes).toContain("yield → await (signals)");
  });

  it("translates yield with custom signal", () => {
    const r = translateGDScript('yield($Timer, "timeout")\n');
    expect(r.translated).toContain("await $Timer.timeout");
  });

  it("translates PoolByteArray → PackedByteArray", () => {
    const r = translateGDScript("var data = PoolByteArray()\n");
    expect(r.translated).toContain("PackedByteArray");
    expect(r.changes).toContain("PoolByteArray → PackedByteArray");
  });

  it("translates PoolStringArray → PackedStringArray", () => {
    const r = translateGDScript("var names = PoolStringArray()\n");
    expect(r.translated).toContain("PackedStringArray");
  });

  it("translates OS.get_window_size()", () => {
    const r = translateGDScript("var size = OS.get_window_size()\n");
    expect(r.translated).toContain("DisplayServer.window_get_size()");
  });

  it("translates OS.get_datetime()", () => {
    const r = translateGDScript("var dt = OS.get_datetime()\n");
    expect(r.translated).toContain("Time.get_datetime_dict_from_system()");
  });

  it("no changes for already v2.0 syntax", () => {
    const code = "extends Node2D\n@onready var sprite = $Sprite\n@export var speed = 300\nfunc _ready():\n\tpass\n";
    const r = translateGDScript(code);
    expect(r.translated).toBe(code);
    expect(r.changes).toHaveLength(0);
  });

  it("preserves non-matching code", () => {
    const code = "extends Node2D\nfunc _ready():\n\tprint(\"hello\")\n";
    const r = translateGDScript(code);
    expect(r.translated).toBe(code);
  });

  it("returns original and changes list", () => {
    const code = "tool\nonready var x = 1\n";
    const r = translateGDScript(code);
    expect(r.original).toBe(code);
    expect(Array.isArray(r.changes)).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });
});
