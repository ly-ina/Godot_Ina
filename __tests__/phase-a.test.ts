// Tests for Phase A tools: import_resource, delete_resource, rename_node
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { importResource } from "../src/tools/impl/import_resource.js";
import { deleteResource } from "../src/tools/impl/delete_resource.js";
import { renameNode } from "../src/tools/impl/rename_node.js";
import { createScene } from "../src/tools/impl/create_scene.js";
import { addNode } from "../src/tools/impl/add_node.js";
import { parseTscnFile } from "../src/parsers/tscn-parser.js";

const TMP = path.resolve("test-fixtures/scenes");
const TMP_IMG = path.join(TMP, "__test_import.png");
const TMP_GD = path.join(TMP, "__test_import.gd");
const TMP_SCENE = path.join(TMP, "__rename_test.tscn");
const TMP_RES = path.join(TMP, "__test_delete_resource.png");

afterEach(() => {
  [TMP_IMG, TMP_GD, TMP_SCENE, TMP_RES].forEach((f) => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  });
  // Clean up subdirectories
  const subDir = path.resolve("test-fixtures/textures");
  try { if (fs.existsSync(path.join(subDir, "sprite.png"))) fs.unlinkSync(path.join(subDir, "sprite.png")); } catch {}
  try { if (fs.existsSync(subDir)) fs.rmdirSync(subDir); } catch {}
});

// ── import_resource ──
describe("importResource", () => {
  it("imports a .gd file into the project", () => {
    fs.writeFileSync(TMP_GD, "extends Node2D", "utf-8");
    const result = importResource({ source_path: TMP_GD, dest_path: TMP_IMG });
    expect(result).toContain("Imported resource");
    expect(result).toContain(".gd");
    expect(fs.existsSync(TMP_IMG)).toBe(true);
  });

  it("creates subdirectories when mkdir is true", () => {
    const dest = path.resolve("test-fixtures/textures/sprite.png");
    // Create a minimal valid file
    fs.writeFileSync(TMP_IMG, "fake-png", "utf-8");
    const result = importResource({ source_path: TMP_IMG, dest_path: dest });
    expect(result).toContain("Imported resource");
    expect(fs.existsSync(dest)).toBe(true);
  });

  it("rejects non-existent source", () => {
    expect(() => importResource({ source_path: "/nonexistent.png", dest_path: TMP_IMG }))
      .toThrow(/not found/);
  });

  it("rejects unsupported file types", () => {
    const exeFile = path.join(TMP, "__test.exe");
    fs.writeFileSync(exeFile, "hello", "utf-8");
    expect(() => importResource({ source_path: exeFile, dest_path: path.join(TMP, "out.exe") }))
      .toThrow(/Unsupported/);
    try { fs.unlinkSync(exeFile); } catch {}
  });

  it("rejects existing destination", () => {
    fs.writeFileSync(TMP_IMG, "data", "utf-8");
    fs.writeFileSync(TMP_GD, "data", "utf-8");
    expect(() => importResource({ source_path: TMP_GD, dest_path: TMP_IMG }))
      .toThrow(/already exists/);
  });
});

// ── delete_resource ──
describe("deleteResource", () => {
  it("rejects missing params", () => {
    expect(() => deleteResource({ resource_path: "", project_path: "" })).toThrow(/required/);
  });

  it("rejects non-existent resource", () => {
    expect(() => deleteResource({ resource_path: "/nonexistent.png", project_path: TMP }))
      .toThrow(/not found/);
  });

  it("moves file to trash by default", () => {
    fs.writeFileSync(TMP_RES, "data", "utf-8");
    const result = deleteResource({ resource_path: TMP_RES, project_path: TMP });
    expect(result).toContain("moved to trash");
    expect(fs.existsSync(TMP_RES)).toBe(false);
  });
});

// ── rename_node ──
describe("renameNode", () => {
  beforeEach(() => {
    createScene({ scene_path: TMP_SCENE, root_node_name: "Root", root_node_type: "Node2D" });
    addNode({ scene_path: TMP_SCENE, parent_node_name: ".", node_type: "Sprite2D", node_name: "Player" });
    addNode({ scene_path: TMP_SCENE, parent_node_name: "Player", node_type: "Sprite2D", node_name: "Weapon" });
  });

  it("renames a node", () => {
    const result = renameNode({ scene_path: TMP_SCENE, old_name: "Player", new_name: "Hero" });
    expect(result).toContain("Renamed node");
    expect(result).toContain('"Player" → "Hero"');
    const scene = parseTscnFile(TMP_SCENE);
    expect(scene.rootNode!.children.find((c: { name: string }) => c.name === "Hero")).toBeDefined();
    expect(scene.rootNode!.children.find((c: { name: string }) => c.name === "Player")).toBeUndefined();
  });

  it("updates child parent references by default", () => {
    renameNode({ scene_path: TMP_SCENE, old_name: "Player", new_name: "Hero" });
    const scene = parseTscnFile(TMP_SCENE);
    const hero = scene.rootNode!.children.find((c: { name: string }) => c.name === "Hero");
    const weapon = hero!.children.find((c: { name: string }) => c.name === "Weapon");
    expect(weapon).toBeDefined();
  });

  it("rejects same old and new name", () => {
    expect(() => renameNode({ scene_path: TMP_SCENE, old_name: "Root", new_name: "Root" }))
      .toThrow(/must be different/);
  });

  it("rejects non-existent node", () => {
    expect(() => renameNode({ scene_path: TMP_SCENE, old_name: "NonExistent", new_name: "X" }))
      .toThrow(/not found/);
  });
});
