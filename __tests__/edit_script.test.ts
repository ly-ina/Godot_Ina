// Tests for edit_script MCP Tool
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { editScript } from "../src/tools/edit_script_orig.js";

const TMP_SCRIPT = path.resolve("test-fixtures/scripts/__edit_test.gd");
const TMP_BAK = TMP_SCRIPT + ".bak";

beforeEach(() => {
  // Create a test script with known content
  const content = [
    'extends CharacterBody2D',
    '',
    '# Player movement speed',
    'const SPEED = 300.0',
    '',
    'func _ready():',
    '\tprint("Player ready")',
    '',
    'func _physics_process(delta):',
    '\tvar velocity = Vector2.ZERO',
    '\tif Input.is_action_pressed("ui_right"):',
    '\t\tvelocity.x += 1',
    '\tif Input.is_action_pressed("ui_left"):',
    '\t\tvelocity.x -= 1',
    '\tmove_and_slide()',
    '',
  ].join("\n");
  fs.mkdirSync(path.dirname(TMP_SCRIPT), { recursive: true });
  fs.writeFileSync(TMP_SCRIPT, content, "utf-8");
});

afterEach(() => {
  // Clean up
  [TMP_SCRIPT, TMP_BAK].forEach((f) => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  });
});

describe("editScript", () => {
  it("replaces a single string successfully", () => {
    const result = editScript({
      script_path: TMP_SCRIPT,
      replacements: [{ search: "const SPEED = 300.0", replace: "const SPEED = 500.0" }],
    });
    expect(result).toContain("Changes applied: 1");
    expect(result).toContain("SPEED = 500.0");
    // Verify file content
    const content = fs.readFileSync(TMP_SCRIPT, "utf-8");
    expect(content).toContain("const SPEED = 500.0");
    expect(content).not.toContain("const SPEED = 300.0");
  });

  it("applies multiple replacements in order", () => {
    const result = editScript({
      script_path: TMP_SCRIPT,
      replacements: [
        { search: "const SPEED = 300.0", replace: "const SPEED = 400.0" },
        { search: 'print("Player ready")', replace: 'print("Player is ready!")' },
      ],
    });
    expect(result).toContain("Changes applied: 2");
    const content = fs.readFileSync(TMP_SCRIPT, "utf-8");
    expect(content).toContain("const SPEED = 400.0");
    expect(content).toContain("print(\"Player is ready!\")");
  });

  it("creates a backup file by default", () => {
    editScript({
      script_path: TMP_SCRIPT,
      replacements: [{ search: "const SPEED = 300.0", replace: "const SPEED = 999.0" }],
    });
    expect(fs.existsSync(TMP_BAK)).toBe(true);
    const backupContent = fs.readFileSync(TMP_BAK, "utf-8");
    expect(backupContent).toContain("const SPEED = 300.0"); // Original value
  });

  it("skips backup when create_backup is false", () => {
    editScript({
      script_path: TMP_SCRIPT,
      replacements: [{ search: "const SPEED = 300.0", replace: "const SPEED = 999.0" }],
      create_backup: false,
    });
    expect(fs.existsSync(TMP_BAK)).toBe(false);
  });

  it("includes line numbers in change report", () => {
    const result = editScript({
      script_path: TMP_SCRIPT,
      replacements: [{ search: "const SPEED = 300.0", replace: "const SPEED = 200.0" }],
    });
    // const SPEED = line 4
    expect(result).toContain("line 4");
  });

  describe("error handling", () => {
    it("throws for empty script_path", () => {
      expect(() => editScript({
        script_path: "",
        replacements: [{ search: "foo", replace: "bar" }],
      })).toThrow(/script_path is required/);
    });

    it("throws for wrong extension", () => {
      expect(() => editScript({
        script_path: "/path/to/script.txt",
        replacements: [{ search: "foo", replace: "bar" }],
      })).toThrow(/not a .gd script/);
    });

    it("throws for non-existent file", () => {
      expect(() => editScript({
        script_path: "/nonexistent/script.gd",
        replacements: [{ search: "foo", replace: "bar" }],
      })).toThrow(/Script file not found/);
    });

    it("throws for empty replacements array", () => {
      expect(() => editScript({
        script_path: TMP_SCRIPT,
        replacements: [],
      })).toThrow(/At least one replacement/);
    });

    it("throws for replacement with empty search string", () => {
      expect(() => editScript({
        script_path: TMP_SCRIPT,
        replacements: [{ search: "", replace: "bar" }],
      })).toThrow(/missing 'search' string/);
    });

    it("throws when search string not found in script", () => {
      expect(() => editScript({
        script_path: TMP_SCRIPT,
        replacements: [{ search: "THIS_DOES_NOT_EXIST_XYZ", replace: "bar" }],
      })).toThrow(/not found/);
    });

    it("throws with clear error message for not-found search", () => {
      try {
        editScript({
          script_path: TMP_SCRIPT,
          replacements: [{ search: "NONEXISTENT_VALUE", replace: "replacement" }],
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        expect(msg).toContain("NONEXISTENT_VALUE");
        expect(msg).toContain("whitespace");
      }
    });
  });
});
