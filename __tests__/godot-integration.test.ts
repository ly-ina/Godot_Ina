// Integration tests with real Godot CLI — dedicated test project
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs";

const GODOT_EXE = "E:/Godot/Godot_v4.7-stable_win64.exe";
const HAS_GODOT = fs.existsSync(GODOT_EXE) || !!process.env.GODOT_PATH;
const INTEG_DIR = path.resolve("test-fixtures/godot-integration");
const GODOT_PATH_FOR_TEST = fs.existsSync(GODOT_EXE) ? GODOT_EXE : process.env.GODOT_PATH;

const describeIfGodot = HAS_GODOT ? describe : describe.skip;

describeIfGodot("godot-integration", () => {
  beforeAll(() => {
    fs.mkdirSync(INTEG_DIR, { recursive: true });
    fs.writeFileSync(path.join(INTEG_DIR, "project.godot"),
      `; Integration test\nconfig_version=5\n\n[application]\nconfig/name="MCPTest"\nrun/main_scene="res://Main.tscn"\n`,
      "utf-8"
    );
    fs.writeFileSync(path.join(INTEG_DIR, "main.gd"),
      'extends Node2D\n\nfunc _ready():\n\tget_tree().quit()\n',
      "utf-8"
    );
    fs.writeFileSync(path.join(INTEG_DIR, "Main.tscn"),
      '[gd_scene load_steps=2 format=3]\n\n[ext_resource type="Script" path="res://main.gd" id="1"]\n\n[node name="Main" type="Node2D"]\nscript = ExtResource("1")\n',
      "utf-8"
    );
    if (GODOT_PATH_FOR_TEST) {
      process.env.GODOT_PATH = GODOT_PATH_FOR_TEST;
    }
  });

  afterAll(() => {
    try { fs.unlinkSync(path.join(INTEG_DIR, "project.godot")); } catch {}
    try { fs.unlinkSync(path.join(INTEG_DIR, "Main.tscn")); } catch {}
    try { fs.unlinkSync(path.join(INTEG_DIR, "main.gd")); } catch {}
    try { fs.unlinkSync(path.join(INTEG_DIR, "__test_script.gd")); } catch {}
    try { fs.rmdirSync(INTEG_DIR); } catch {}
    delete process.env.GODOT_PATH;
  });

  it("detects Godot via GODOT_PATH", async () => {
    const cli = await import("../src/godot/cli.js");
    const result = cli.detectGodotExecutable();
    expect(result).toBe(GODOT_PATH_FOR_TEST);
  });

  it("runs project in headless mode", async () => {
    const cli = await import("../src/godot/cli.js");
    const result = cli.runProject({ projectPath: INTEG_DIR, mode: "headless", timeout: 15000 });
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
  });

  it("executes a script via godot --headless --script", async () => {
    const cli = await import("../src/godot/cli.js");
    const scriptPath = path.join(INTEG_DIR, "__test_script.gd");
    fs.writeFileSync(scriptPath,
      '#!/usr/bin/env -S godot --headless --script\n'
      + 'extends SceneTree\n\n'
      + 'func _init():\n'
      + '\tprint("MCP_TEST_OK")\n'
      + '\tquit()\n',
      "utf-8"
    );
    const result = cli.executeScript({ projectPath: INTEG_DIR, scriptPath, timeout: 15000 });
    expect(result.success).toBe(true);
    expect(result.stdout).toContain("MCP_TEST_OK");
  });

  it("returns formatted success output via runGodotProject", async () => {
    const rp = await import("../src/tools/run_project.js");
    const result = rp.runGodotProject({ project_path: INTEG_DIR, mode: "headless" });
    expect(result).toContain("Completed");
    expect(result).toContain("Exit Code: 0");
  });
});
