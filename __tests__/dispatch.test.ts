// Tests for the consolidated MCP dispatch layer
import { getToolDefinitions, executeTool } from "../src/tools/dispatch.js";
import * as path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("getToolDefinitions", () => {
  it("returns 10 tools", () => {
    const tools = getToolDefinitions();
    expect(tools.length).toBeGreaterThanOrEqual(10);
  });

  it("all tools have name, description, inputSchema", () => {
    for (const tool of getToolDefinitions()) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeTruthy();
    }
  });

  it("includes all 10 consolidated tools", () => {
    const names = getToolDefinitions().map(t => t.name);
    expect(names).toContain("init_project");
    expect(names).toContain("edit_scene");
    expect(names).toContain("edit_script");
    expect(names).toContain("edit_settings");
    expect(names).toContain("generate_game");
    expect(names).toContain("run_project");
    expect(names).toContain("analyze_project");
    expect(names).toContain("manage_assets");
    expect(names).toContain("translate_project");
    expect(names).toContain("ping");
  });
});

describe("executeTool", () => {
  it("ping returns pong", () => {
    const result = executeTool("ping", {});
    expect(result.content[0].text).toBe("pong");
  });

  it("returns error for unknown tool", () => {
    const result = executeTool("nonexistent_tool", {});
    expect(result.isError).toBe(true);
  });

  it("init_project requires project_path", () => {
    const result = executeTool("init_project", {});
    expect(result.isError).toBe(true);
  });

  it("run_project requires project_path", () => {
    const result = executeTool("run_project", {});
    expect(result.isError).toBe(true);
  });

  it("edit_settings requires project_path", () => {
    const result = executeTool("edit_settings", { action: "read" });
    expect(result.isError).toBe(true);
  });

  it("generate_game requires type and project_path", () => {
    const result = executeTool("generate_game", {});
    expect(result.isError).toBe(true);
  });

  it("analyze_project requires action and project_path", () => {
    const result = executeTool("analyze_project", {});
    expect(result.isError).toBe(true);
  });

  it("manage_assets requires action and project_path", () => {
    const result = executeTool("manage_assets", {});
    expect(result.isError).toBe(true);
  });

  it("translate_project requires project_path", () => {
    const result = executeTool("translate_project", {});
    expect(result.isError).toBe(true);
  });
});
