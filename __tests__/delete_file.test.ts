// Tests for delete_file MCP Tool
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { deleteFile } from "../src/tools/delete_file.js";

const TMP_FILE = path.resolve("test-fixtures/scripts/__to_delete.gd");
const TMP_SCENE = path.resolve("test-fixtures/scenes/__to_delete.tscn");
const TMP_TXT = path.resolve("test-fixtures/scenes/__not_allowed.txt");

afterEach(() => {
  // Clean up any leftover files
  [TMP_FILE, TMP_SCENE, TMP_TXT].forEach((f) => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  });
  // Clean up trash
  const trashDir = path.join(os.tmpdir(), "godot-mcp-trash");
  try {
    const files = fs.readdirSync(trashDir);
    for (const f of files) {
      if (f.startsWith("__to_delete") || f.startsWith("__to_delete_scene")) {
        fs.unlinkSync(path.join(trashDir, f));
      }
    }
  } catch {}
});

describe("deleteFile", () => {
  it("moves .gd file to trash by default", () => {
    fs.writeFileSync(TMP_FILE, "extends Node2D", "utf-8");
    const result = deleteFile({ file_path: TMP_FILE });
    expect(result).toContain("Moved");
    expect(result).toContain("__to_delete.gd");
    expect(fs.existsSync(TMP_FILE)).toBe(false);
  });

  it("moves .tscn file to trash by default", () => {
    fs.writeFileSync(TMP_SCENE, "[gd_scene format=3]", "utf-8");
    const result = deleteFile({ file_path: TMP_SCENE });
    expect(result).toContain("Moved");
    expect(fs.existsSync(TMP_SCENE)).toBe(false);
  });

  it("permanently deletes when use_trash is false", () => {
    fs.writeFileSync(TMP_FILE, "extends Node2D", "utf-8");
    const result = deleteFile({ file_path: TMP_FILE, use_trash: false });
    expect(result).toContain("Permanently deleted");
    expect(fs.existsSync(TMP_FILE)).toBe(false);
  });

  describe("error handling", () => {
    it("throws for empty file_path", () => {
      expect(() => deleteFile({ file_path: "" })).toThrow(/file_path is required/);
    });

    it("throws for non-existent file", () => {
      expect(() => deleteFile({ file_path: "/nonexistent/path.gd" })).toThrow(/not found/);
    });

    it("throws for unsupported file type", () => {
      fs.writeFileSync(TMP_TXT, "hello", "utf-8");
      expect(() => deleteFile({ file_path: TMP_TXT })).toThrow(/Unsupported/);
    });

    it("throws for directories", () => {
      expect(() => deleteFile({ file_path: path.resolve("test-fixtures") })).toThrow(/directory/);
    });
  });
});
