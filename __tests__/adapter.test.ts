// Tests for Godot version adapter
import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { getAdapter, detectVersionFromScene, detectVersionFromProject, v4Adapter, v3Adapter } from "../src/adapters/adapter.js";

describe("v4Adapter", () => {
  it("returns 4.x version", () => {
    expect(v4Adapter.version).toBe("4.x");
  });

  it("toV4NodeType returns null (already v4)", () => {
    expect(v4Adapter.toV4NodeType("Node2D")).toBeNull();
  });

  it("returns format 3", () => {
    expect(v4Adapter.getSceneFormat()).toBe(3);
  });

  it("does not need GDScript translation", () => {
    expect(v4Adapter.needsGDScriptTranslation()).toBe(false);
  });
});

describe("v3Adapter", () => {
  it("returns 3.x version", () => {
    expect(v3Adapter.version).toBe("3.x");
  });

  it("maps KinematicBody2D to CharacterBody2D", () => {
    expect(v3Adapter.toV4NodeType("KinematicBody2D")).toBe("CharacterBody2D");
  });

  it("maps Spatial to Node3D", () => {
    expect(v3Adapter.toV4NodeType("Spatial")).toBe("Node3D");
  });

  it("maps Particles2D to GPUParticles2D", () => {
    expect(v3Adapter.toV4NodeType("Particles2D")).toBe("GPUParticles2D");
  });

  it("returns null for unknown v3 types", () => {
    expect(v3Adapter.toV4NodeType("NonExistent")).toBeNull();
  });

  it("maps CharacterBody2D back to KinematicBody2D", () => {
    expect(v3Adapter.fromV4NodeType("CharacterBody2D")).toBe("KinematicBody2D");
  });

  it("returns format 2", () => {
    expect(v3Adapter.getSceneFormat()).toBe(2);
  });

  it("translates --headless to --no-window", () => {
    const translated = v3Adapter.translateCliArgs(["--path", ".", "--headless"]);
    expect(translated).toContain("--no-window");
    expect(translated).not.toContain("--headless");
  });

  it("needs GDScript translation", () => {
    expect(v3Adapter.needsGDScriptTranslation()).toBe(true);
  });
});

describe("getAdapter", () => {
  it("returns v4 adapter for 4.x", () => {
    expect(getAdapter("4.x")).toBe(v4Adapter);
  });

  it("returns v3 adapter for 3.x", () => {
    expect(getAdapter("3.x")).toBe(v3Adapter);
  });

  it("throws for unknown version", () => {
    expect(() => getAdapter("2.x" as "4.x")).toThrow();
  });
});

describe("detectVersionFromScene", () => {
  const tmpDir = path.resolve("test-fixtures/scenes");

  it("detects Godot 4.x from format=3", () => {
    const scenePath = path.join(tmpDir, "World.tscn");
    expect(detectVersionFromScene(scenePath)).toBe("4.x");
  });

  it("detects Godot 3.x from format=2", () => {
    const tmpFile = path.join(tmpDir, "__fmt_test.tscn");
    try {
      fs.writeFileSync(tmpFile, '[gd_scene load_steps=1 format=2]\n', "utf-8");
      expect(detectVersionFromScene(tmpFile)).toBe("3.x");
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  });

  it("defaults to 4.x for non-existent files", () => {
    expect(detectVersionFromScene("/nonexistent.tscn")).toBe("4.x");
  });
});

describe("detectVersionFromProject", () => {
  it("detects 4.x from test fixtures", () => {
    expect(detectVersionFromProject(path.resolve("test-fixtures/scenes"))).toBe("4.x");
  });

  it("defaults to 4.x for non-existent paths", () => {
    expect(detectVersionFromProject("/nonexistent")).toBe("4.x");
  });
});
