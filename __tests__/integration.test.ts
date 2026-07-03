// Integration tests: end-to-end workflows using actual tools
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { addNode } from "../src/tools/impl/add_node.js";
import { editNode } from "../src/tools/impl/edit_node.js";
import { createScene } from "../src/tools/impl/create_scene.js";
import { createScript } from "../src/tools/impl/create_script.js";
import { readScene } from "../src/tools/impl/read_scene.js";
import { parseTscnFile } from "../src/parsers/tscn-parser.js";
import { writeSceneToFile } from "../src/writers/tscn-writer.js";
import * as fs from "fs";
import * as path from "path";

const TEST_DIR = path.resolve("test-fixtures/integration");
const TEST_SCENE = path.join(TEST_DIR, "TestGame.tscn");

describe("Integration: full workflow", () => {
  beforeAll(() => {
    // Ensure test dir exists
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Clean up any leftover test file
    if (fs.existsSync(TEST_SCENE)) {
      fs.unlinkSync(TEST_SCENE);
    }
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(TEST_SCENE)) {
      fs.unlinkSync(TEST_SCENE);
    }
  });

  it("1. create_scene → add_node → edit_node → read_scene workflow", () => {
    // Step 1: Create scene
    const createResult = createScene({
      scene_path: TEST_SCENE,
      root_node_name: "World",
      root_node_type: "Node2D",
    });
    expect(createResult).toContain("Created scene");
    expect(createResult).toContain("World (Node2D)");

    // Step 2: Add a child node
    const addResult = addNode({
      scene_path: TEST_SCENE,
      parent_node_name: ".",
      node_type: "CharacterBody2D",
      node_name: "Player",
      properties: { position: "Vector2(100, 200)" },
    });
    expect(addResult).toContain('Added node "Player"');

    // Step 3: Add another node under Player
    const addSpriteResult = addNode({
      scene_path: TEST_SCENE,
      parent_node_name: "Player",
      node_type: "Sprite2D",
      node_name: "Sprite",
    });
    expect(addSpriteResult).toContain('Added node "Sprite"');

    // Step 4: Edit the Player node properties
    const editResult = editNode({
      scene_path: TEST_SCENE,
      node_name: "Player",
      properties: { speed: 300, health: 100 },
    });
    expect(editResult).toContain("Updated");
    expect(editResult).toContain("speed");

    // Step 5: Read back and verify
    const readResult = readScene(TEST_SCENE);
    expect(readResult.success).toBe(true);
    expect(readResult.scene?.nodeCount).toBe(3); // World + Player + Sprite
    expect(readResult.scene?.rootNode).toBe("World");

    const playerNode = readResult.scene!.nodes.find(n => n.name === "Player");
    expect(playerNode).toBeDefined();
    expect(playerNode!.type).toBe("CharacterBody2D");
  });

  it("2. create_script reads back correctly", () => {
    const scriptPath = path.join(TEST_DIR, "test_script.gd");
    const scriptContent = "extends Node2D\n\nfunc _ready() -> void:\n\tpass\n";

    const result = createScript({
      script_path: scriptPath,
      content: scriptContent,
    });
    expect(result).toContain("Created script");

    // Verify file exists and content matches
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toBe(scriptContent);

    // Clean up
    fs.unlinkSync(scriptPath);
  });

  it("3. parse → modify → write → re-parse round-trip with World.tscn", () => {
    const worldPath = path.resolve("test-fixtures/scenes/World.tscn");
    const tmpPath = path.resolve("test-fixtures/scenes/__world_roundtrip.tscn");

    // Parse original
    const original = parseTscnFile(worldPath);
    expect(original.rootNode).not.toBeNull();

    // Modify: add a new node
    original.rootNode!.children.push({
      name: "NewNode",
      type: "Node2D",
      parent: original.rootNode!.name,
      properties: {},
      children: [],
    });

    // Write to temp
    writeSceneToFile(original, tmpPath);

    // Re-parse and verify
    const reparsed = parseTscnFile(tmpPath);
    expect(reparsed.rootNode).not.toBeNull();
    expect(reparsed.rootNode!.children.length).toBeGreaterThanOrEqual(3);

    // Clean up
    fs.unlinkSync(tmpPath);
  });

  it("4. duplicate name detection works", () => {
    // Add a second node with same name should fail
    expect(() => {
      addNode({
        scene_path: TEST_SCENE,
        parent_node_name: ".",
        node_type: "Sprite2D",
        node_name: "Player", // Name already exists
      });
    }).toThrow(/already exists/);
  });

  it("5. edit_node removes property when set to null", () => {
    // health was set to 100 earlier, now remove it
    const editResult = editNode({
      scene_path: TEST_SCENE,
      node_name: "Player",
      properties: { health: null as unknown as Record<string, unknown> },
    });
    expect(editResult).toContain("Removed");
  });
});
