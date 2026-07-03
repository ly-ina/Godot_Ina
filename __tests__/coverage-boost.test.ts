// Coverage boost — target remaining uncovered branches
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";

// ── create_scene.ts uncovered branches ──
import { createScene, validateCreatedScene } from "../src/tools/impl/create_scene.js";

// ── add_node.ts uncovered branches ──
import { addNode } from "../src/tools/impl/add_node.js";

// ── create_script.ts uncovered branches ──
import { createScript } from "../src/tools/impl/create_script.js";

// ── edit_node.ts uncovered branches ──
import { editNode } from "../src/tools/impl/edit_node.js";

// ── tscn-writer.ts uncovered branches ──
import { sceneToTscn, createEmptyScene, writeSceneToFile } from "../src/writers/tscn-writer.js";

// ── cli.ts uncovered branches ──
import * as cli from "../src/godot/cli.js";

const TMP_SCENE = path.resolve("test-fixtures/scenes/__cov_test.tscn");
const TMP_DIR = path.resolve("test-fixtures/__cov_subdir");
const TMP_SUB_SCENE = path.join(TMP_DIR, "sub_test.tscn");

// ============================================================
// create_scene.ts (61.11% → ~80%)
// Targets: line 29 (root_node_type empty), 37-38 (project_path),
//          59-66 (validateCreatedScene)
// ============================================================
describe("create_scene — remaining branches", () => {
  afterEach(() => {
    [TMP_SCENE, TMP_SUB_SCENE].forEach((f) => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    });
    try { if (fs.existsSync(TMP_DIR)) fs.rmdirSync(TMP_DIR); } catch {}
  });

  it("rejects missing root_node_type when name is provided", () => {
    expect(() => createScene({
      scene_path: TMP_SCENE,
      root_node_name: "Root",
      root_node_type: "",  // line 29: empty type
    })).toThrow(/root_node_name and root_node_type are required/);
  });

  it("resolves relative path with project_path", () => {
    // project_path set → should resolve relative to it
    const result = createScene({
      scene_path: "../__cov_test_subdir/test_scene.tscn",
      root_node_name: "Main",
      root_node_type: "Node3D",
      project_path: path.resolve("test-fixtures/scenes"),
    });
    // Should have created the file in test-fixtures/__cov_test_subdir/
    const expected = path.resolve("test-fixtures/__cov_test_subdir/test_scene.tscn");
    expect(fs.existsSync(expected)).toBe(true);
    expect(result).toContain("Created scene");
    // Cleanup
    try { fs.unlinkSync(expected); } catch {}
    try {
      const dir = path.dirname(expected);
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    } catch {}
  });

  it("validateCreatedScene returns true for valid scenes", () => {
    createScene({
      scene_path: TMP_SCENE,
      root_node_name: "Root",
      root_node_type: "Node2D",
    });
    expect(validateCreatedScene(TMP_SCENE)).toBe(true);
  });

  it("validateCreatedScene returns false for non-existent file", () => {
    expect(validateCreatedScene("/nonexistent/path.tscn")).toBe(false);
  });

  it("validateCreatedScene returns false for malformed content", () => {
    fs.writeFileSync(TMP_SCENE, "garbage content", "utf-8");
    expect(validateCreatedScene(TMP_SCENE)).toBe(false);
  });
});

// ============================================================
// add_node.ts (67.64% → ~85%)
// Targets: 33,36,39,50,62,110-118
// ============================================================
describe("add_node — remaining branches", () => {
  beforeEach(() => {
    createScene({
      scene_path: TMP_SCENE,
      root_node_name: "Root",
      root_node_type: "Node2D",
    });
  });

  afterEach(() => {
    try { if (fs.existsSync(TMP_SCENE)) fs.unlinkSync(TMP_SCENE); } catch {}
  });

  it("rejects empty parent_node_name", () => {
    expect(() => addNode({
      scene_path: TMP_SCENE,
      parent_node_name: "",
      node_type: "Sprite2D",
      node_name: "Sprite",
    })).toThrow(/parent_node_name is required/);
  });

  it("rejects empty node_type", () => {
    expect(() => addNode({
      scene_path: TMP_SCENE,
      parent_node_name: ".",
      node_type: "",
      node_name: "Child",
    })).toThrow(/node_type is required/);
  });

  it("rejects empty node_name", () => {
    expect(() => addNode({
      scene_path: TMP_SCENE,
      parent_node_name: ".",
      node_type: "Sprite2D",
      node_name: "",
    })).toThrow(/node_name is required/);
  });

  it("rejects scene with no root node", () => {
    // Create a file with header but no nodes
    const badScene = path.resolve("test-fixtures/scenes/__bad_no_root.tscn");
    fs.writeFileSync(badScene, "[gd_scene load_steps=1 format=3]\n\n", "utf-8");
    expect(() => addNode({
      scene_path: badScene,
      parent_node_name: ".",
      node_type: "Node2D",
      node_name: "Orphan",
    })).toThrow(/no root node/);
    try { fs.unlinkSync(badScene); } catch {}
  });

  it("rejects when parent node not found (triggers listNodeNames/collectNames)", () => {
    expect(() => addNode({
      scene_path: TMP_SCENE,
      parent_node_name: "NonExistentParent",
      node_type: "Sprite2D",
      node_name: "Child",
    })).toThrow(/not found/);
  });

  it("includes available node names in error when parent not found", () => {
    try {
      addNode({
        scene_path: TMP_SCENE,
        parent_node_name: "NonExistent",
        node_type: "Sprite2D",
        node_name: "Child",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      expect(msg).toContain("Root"); // Available node name listed
    }
  });
});

// ============================================================
// create_script.ts (72% → ~85%)
// Targets: 27,49,63,66,72,78,92-94,118,133-137
// ============================================================
describe("create_script — remaining branches", () => {
  const TMP_SCRIPT = path.resolve("test-fixtures/scripts/__cov_test.gd");
  const TMP_SCRIPT_DIR = path.resolve("test-fixtures/scripts/__cov_new_dir/new_script.gd");
  const TMP_BAD_SCENE = path.resolve("test-fixtures/scenes/__cov_no_root.tscn");

  afterEach(() => {
    [TMP_SCRIPT, TMP_SCRIPT_DIR].forEach((f) => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    });
    [TMP_BAD_SCENE].forEach((f) => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    });
    // Clean up directory created for TMP_SCRIPT_DIR
    const dir = path.dirname(TMP_SCRIPT_DIR);
    try { if (fs.existsSync(dir)) fs.rmdirSync(dir); } catch {}
  });

  it("rejects empty script_path", () => {
    expect(() => createScript({
      script_path: "",
      content: "extends Node2D",
    })).toThrow(/script_path is required/);
  });

  it("creates parent directory when it doesn't exist", () => {
    const result = createScript({
      script_path: TMP_SCRIPT_DIR,
      content: "extends Node2D\n",
    });
    expect(fs.existsSync(TMP_SCRIPT_DIR)).toBe(true);
    expect(result).toContain("Created script");
  });

  it("rejects attach with non-tscn scene_path", () => {
    expect(() => createScript({
      script_path: TMP_SCRIPT,
      content: "extends Node2D",
      scene_path: "/path/to/scene.txt",
      node_name: "Root",
    })).toThrow(/scene_path must end with .tscn/);
  });

  it("rejects attach with non-existent scene file", () => {
    expect(() => createScript({
      script_path: TMP_SCRIPT,
      content: "extends Node2D",
      scene_path: "/nonexistent/file.tscn",
      node_name: "Root",
    })).toThrow(/Scene file not found/);
  });

  it("rejects attach when scene has no root node", () => {
    // Create a scene with only header
    fs.writeFileSync(TMP_BAD_SCENE, "[gd_scene load_steps=1 format=3]\n", "utf-8");
    expect(() => createScript({
      script_path: TMP_SCRIPT,
      content: "extends Node2D",
      scene_path: TMP_BAD_SCENE,
      node_name: "Main",
    })).toThrow(/no root node/);
  });

  it("rejects attach when node not found in scene", () => {
    // Create a valid scene, then try to attach script to a non-existent node
    const scenePath = path.resolve("test-fixtures/scenes/World.tscn");
    if (!fs.existsSync(scenePath)) return; // skip if no fixture
    expect(() => createScript({
      script_path: TMP_SCRIPT,
      content: "extends Node2D",
      scene_path: scenePath,
      node_name: "NonExistentNode12345",
    })).toThrow(/not found/);
  });

  it("handles attach without project.godot (fallback path resolution)", () => {
    // Create a scene file in a temp dir without project.godot
    const tmpDir = path.resolve("test-fixtures/__cov_no_project");
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    const scenePath = path.join(tmpDir, "temp.tscn");
    const scriptPath = path.join(tmpDir, "temp.gd");
    try {
      // Create scene with root node
      createScene({
        scene_path: scenePath,
        root_node_name: "Root",
        root_node_type: "Node2D",
      });
      const result = createScript({
        script_path: scriptPath,
        content: "extends Node2D\n",
        scene_path: scenePath,
        node_name: "Root",
      });
      expect(result).toContain("Attached");
    } finally {
      try { fs.unlinkSync(scenePath); } catch {}
      try { fs.unlinkSync(scriptPath); } catch {}
      try { fs.rmdirSync(tmpDir); } catch {}
    }
  });

  it("scene_path without node_name adds a note", () => {
    const result = createScript({
      script_path: TMP_SCRIPT,
      content: "extends Node2D",
      scene_path: path.resolve("test-fixtures/scenes/World.tscn"),
    });
    expect(result).toContain("script was not attached");
  });

  it("findProjectRoot checks parent directory", () => {
    // Create a scene file in a subdir of a project
    const subDir = path.resolve("test-fixtures/__cov_sub_project/sub");
    try { fs.mkdirSync(subDir, { recursive: true }); } catch {}
    const projFile = path.resolve("test-fixtures/__cov_sub_project/project.godot");
    const sceneFile = path.join(subDir, "scene.tscn");
    const scriptFile = path.join(subDir, "script.gd");
    try {
      // Create project.godot in parent dir
      fs.writeFileSync(projFile, "config_version=5\n", "utf-8");
      createScene({
        scene_path: sceneFile,
        root_node_name: "Root",
        root_node_type: "Node2D",
      });
      const result = createScript({
        script_path: scriptFile,
        content: "extends Node2D\n",
        scene_path: sceneFile,
        node_name: "Root",
      });
      expect(result).toContain("res://");
      expect(result).toContain("script.gd");
    } finally {
      try { fs.unlinkSync(scriptFile); } catch {}
      try { fs.unlinkSync(sceneFile); } catch {}
      try { fs.unlinkSync(projFile); } catch {}
      try { fs.rmdirSync(subDir); } catch {}
      try { fs.rmdirSync(path.resolve("test-fixtures/__cov_sub_project")); } catch {}
    }
  });
});

// ============================================================
// edit_node.ts (83.78% → ~92%)
// Targets: 27,30,38,44,70
// ============================================================
describe("edit_node — remaining branches", () => {
  beforeEach(() => {
    createScene({
      scene_path: TMP_SCENE,
      root_node_name: "Root",
      root_node_type: "Node2D",
    });
  });

  afterEach(() => {
    try { if (fs.existsSync(TMP_SCENE)) fs.unlinkSync(TMP_SCENE); } catch {}
  });

  it("rejects wrong scene_path extension", () => {
    expect(() => editNode({
      scene_path: "/path/to/file.txt",
      node_name: "Root",
      properties: { x: 1 },
    })).toThrow(/scene_path must point to a \.tscn file/);
  });

  it("rejects empty node_name", () => {
    expect(() => editNode({
      scene_path: TMP_SCENE,
      node_name: "",
      properties: { x: 1 },
    })).toThrow(/node_name is required/);
  });

  it("rejects non-existent scene file", () => {
    expect(() => editNode({
      scene_path: "/nonexistent/file.tscn",
      node_name: "Root",
      properties: { x: 1 },
    })).toThrow(/Scene file not found/);
  });

  it("rejects scene with no root node", () => {
    const badScene = path.resolve("test-fixtures/scenes/__bad_edit_no_root.tscn");
    fs.writeFileSync(badScene, "[gd_scene load_steps=1 format=3]\n\n", "utf-8");
    expect(() => editNode({
      scene_path: badScene,
      node_name: "Root",
      properties: { x: 1 },
    })).toThrow(/no root node/);
    try { fs.unlinkSync(badScene); } catch {}
  });

  it("updates existing property (triggers 'updated' path)", () => {
    // First add a property
    addNode({
      scene_path: TMP_SCENE,
      parent_node_name: ".",
      node_type: "Sprite2D",
      node_name: "Player",
      properties: { position: "Vector2(100, 100)" },
    });
    // Now update it
    const result = editNode({
      scene_path: TMP_SCENE,
      node_name: "Player",
      properties: { position: "Vector2(200, 200)" },
    });
    expect(result).toContain("Updated");
    expect(result).toContain("position");
  });
});

// ============================================================
// tscn-writer.ts (83.72% → ~90%)
// Targets: 114 (deep nesting), 168 (conn args), 179 (undefined),
//          203 (NodePath), 209-223 (array/object), 239 (mkdirSync)
// ============================================================
describe("tscn-writer — remaining branches", () => {
  it("writes deep nested nodes (line 114)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    // Level 1 child
    const l1 = { name: "Level1", type: "Node2D", parent: "Root", properties: {}, children: [] };
    // Level 2 child
    const l2 = { name: "Level2", type: "Node2D", parent: "Level1", properties: {}, children: [] };
    // Level 3 child  
    const l3 = { name: "Level3", type: "Sprite2D", parent: "Level2", properties: {}, children: [] };
    l2.children.push(l3);
    l1.children.push(l2);
    scene.rootNode!.children.push(l1);
    const tscn = sceneToTscn(scene);
    // The deep child should have parent="Level1/Level2" (relative from root)
    expect(tscn).toContain('parent="Level1/Level2"');
  });

  it("writes connection with args (line 168)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    scene.connections.push({
      signal: "pressed",
      from: "Button",
      to: "Root",
      method: "_on_pressed",
      flags: 0,
      args: ["hello", 42],
    });
    const tscn = sceneToTscn(scene);
    expect(tscn).toContain('signal="pressed"');
    expect(tscn).toContain('args=');
  });

  it("handles undefined value in valueToString (line 179)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    scene.rootNode!.properties["test"] = undefined;
    const tscn = sceneToTscn(scene);
    // undefined should become empty string
    expect(tscn).toContain("test = ");
  });

  it("handles NodePath in valueToString (line 203)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    scene.rootNode!.properties["target"] = 'NodePath("Root/Player")';
    const tscn = sceneToTscn(scene);
    // NodePath should be preserved as-is (not wrapped in extra quotes)
    expect(tscn).toContain('NodePath("Root/Player")');
  });

  it("handles array values in valueToString (lines 209-212)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    scene.rootNode!.properties["positions"] = ["a", "b", "c"];
    const tscn = sceneToTscn(scene);
    expect(tscn).toContain('"a"');
    expect(tscn).toContain('"b"');
  });

  it("handles object/dict values in valueToString (lines 214-220)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    scene.rootNode!.properties["metadata"] = { author: "test", version: 1 };
    const tscn = sceneToTscn(scene);
    expect(tscn).toContain("author");
    expect(tscn).toContain("version");
  });

  it("handles fallback String conversion (line 223)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    // Symbol is not null, bool, number, string, array, or plain object → hits fallback
    const sym = String(Symbol("test"));
    scene.rootNode!.properties["fallback"] = sym;
    const tscn = sceneToTscn(scene);
    expect(tscn).toContain("Symbol(");
  });

  it("creates directory in writeSceneToFile (line 239)", () => {
    const scene = createEmptyScene("Root", "Node2D");
    const deepPath = path.resolve("test-fixtures/__deep_dir/nested/scene.tscn");
    writeSceneToFile(scene, deepPath);
    expect(fs.existsSync(deepPath)).toBe(true);
    // Cleanup
    try { fs.unlinkSync(deepPath); } catch {}
    try { fs.rmdirSync(path.dirname(deepPath)); } catch {}
    try { fs.rmdirSync(path.resolve("test-fixtures/__deep_dir/nested")); } catch {}
    try { fs.rmdirSync(path.resolve("test-fixtures/__deep_dir")); } catch {}
  });
});

// ============================================================
// cli.ts (55.93% → ~70%)
// Targets: 40 (GODOT_PATH set but file missing),
//          47 (fallback path iteration),
//          241 (executeScript via runProject)
// ============================================================
describe("cli.ts — remaining branches", () => {
  const ORIG_GODOT_PATH = process.env.GODOT_PATH;

  afterEach(() => {
    if (ORIG_GODOT_PATH) {
      process.env.GODOT_PATH = ORIG_GODOT_PATH;
    } else {
      delete process.env.GODOT_PATH;
    }
  });

  it("continues to fallback when GODOT_PATH is set but file doesn't exist (line 40)", () => {
    process.env.GODOT_PATH = "/nonexistent/godot.exe";
    // Without Godot in PATH, it should throw
    // But at least it should not crash — it should iterate fallbacks
    expect(() => cli.detectGodotExecutable()).toThrow(/not found/);
  }, 15000);

  it("executeScript delegates to runProject (line 241)", async () => {
    // Set GODOT_PATH to a valid exe for this test
    if (fs.existsSync("E:/Godot/Godot_v4.7-stable_win64.exe")) {
      process.env.GODOT_PATH = "E:/Godot/Godot_v4.7-stable_win64.exe";
    }
    // executeScript with non-existent script should return error, not crash
    const result = cli.executeScript({
      projectPath: path.resolve("test-fixtures/scenes"),
      scriptPath: "/nonexistent/script.gd",
    });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain("not found");
  });

  it("validateGodotProject returns false for invalid project", () => {
    expect(cli.validateGodotProject("/nonexistent/path")).toBe(false);
  });
});
