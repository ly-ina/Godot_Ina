import { describe, it, expect } from "vitest";
import { SceneNode } from "../src/parsers/tscn-types.js";
import {
  findNodeInTree,
  countNodes,
  flattenNodes,
} from "../src/utils/tree-utils.js";

function makeTree(): SceneNode {
  return {
    name: "Root",
    type: "Node2D",
    parent: null,
    properties: {},
    children: [
      {
        name: "Player",
        type: "CharacterBody2D",
        parent: "Root",
        properties: {},
        children: [
          {
            name: "Sprite",
            type: "Sprite2D",
            parent: "Player",
            properties: {},
            children: [],
          },
          {
            name: "Collider",
            type: "CollisionShape2D",
            parent: "Player",
            properties: {},
            children: [],
          },
        ],
      },
      {
        name: "Camera",
        type: "Camera2D",
        parent: "Root",
        properties: {},
        children: [],
      },
    ],
  };
}

describe("findNodeInTree", () => {
  const root = makeTree();

  it("finds root node by name", () => {
    expect(findNodeInTree(root, "Root")?.name).toBe("Root");
  });

  it("finds deeply nested node", () => {
    expect(findNodeInTree(root, "Sprite")?.type).toBe("Sprite2D");
    expect(findNodeInTree(root, "Collider")?.type).toBe("CollisionShape2D");
  });

  it("returns null for non-existent node", () => {
    expect(findNodeInTree(root, "NonExistent")).toBeNull();
  });

  it("returns null for empty tree", () => {
    const emptyNode: SceneNode = {
      name: "",
      type: "",
      parent: null,
      properties: {},
      children: [],
    };
    expect(findNodeInTree(emptyNode, "anything")).toBeNull();
  });
});

describe("countNodes", () => {
  it("counts all nodes in a tree", () => {
    expect(countNodes(makeTree())).toBe(5); // Root + Player + Sprite + Collider + Camera
  });

  it("returns 0 for null", () => {
    expect(countNodes(null)).toBe(0);
  });
});

describe("flattenNodes", () => {
  const root = makeTree();
  const flat = flattenNodes(root);

  it("returns flat array of all nodes", () => {
    expect(flat).toHaveLength(5);
  });

  it("maps parent relationships correctly", () => {
    const player = flat.find((n) => n.name === "Player");
    expect(player?.parent).toBe("Root");

    const sprite = flat.find((n) => n.name === "Sprite");
    expect(sprite?.parent).toBe("Player");
  });

  it("root node has null parent", () => {
    const rootNode = flat.find((n) => n.name === "Root");
    expect(rootNode?.parent).toBeNull();
  });
});
