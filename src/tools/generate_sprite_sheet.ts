// MCP Tool: generate_sprite_sheet — AI Game Workbench 集成
// 将 Workbench 的工作流管线直接嵌入 MCP 项目。
// 使用前需要在 src/workbench/config.json 中配置 AI API key。
import { runCharacterPipeline, getWorkbenchStatus, type CharacterPipelineArgs } from "../workbench/pipeline.js";

export type { CharacterPipelineArgs } from "../workbench/pipeline.js";

export function generateSpriteSheet(args: CharacterPipelineArgs): string {
  const { project_path, name } = args;
  if (!project_path) throw new Error("project_path is required");
  if (!name) throw new Error("name is required");

  // 检查状态
  const status = getWorkbenchStatus();

  // 运行管线
  try {
    return runCharacterPipeline(args);
  } catch (e: unknown) {
    return (
      `❌ 角色生成管线执行失败: ${e instanceof Error ? e.message : String(e)}\n\n` +
      status
    );
  }
}
