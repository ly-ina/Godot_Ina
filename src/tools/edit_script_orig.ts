// MCP Tool: edit_script — modify an existing .gd GDScript file
import * as fs from "fs";
import * as path from "path";

export interface EditScriptReplacement {
  /** Exact string to search for within the script */
  search: string;
  /** String to replace the matched text with */
  replace: string;
}

export interface EditScriptArgs {
  /** Path to the .gd script file */
  script_path: string;
  /** Search/replace operations to apply (applied in order) */
  replacements: EditScriptReplacement[];
  /** Whether to create a backup file (.bak) before editing (default: true) */
  create_backup?: boolean;
}

export interface EditScriptResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Human-readable summary message */
  message: string;
  /** Count of replacements made */
  changes: number;
  /** Path to backup file, if created */
  backupPath?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Modify the content of an existing .gd GDScript file.
 * Uses search/replace to apply changes.
 */
export function editScript(args: EditScriptArgs): string {
  const { script_path, replacements, create_backup = true } = args;

  // Validate inputs
  if (!script_path) {
    throw new Error("script_path is required");
  }
  if (!script_path.endsWith(".gd")) {
    throw new Error(`File is not a .gd script: ${script_path}`);
  }
  if (!fs.existsSync(script_path)) {
    throw new Error(`Script file not found: ${script_path}`);
  }
  if (!replacements || replacements.length === 0) {
    throw new Error("At least one replacement is required");
  }
  for (let i = 0; i < replacements.length; i++) {
    if (!replacements[i].search) {
      throw new Error(`Replacement at index ${i} is missing 'search' string`);
    }
  }

  // Read the file
  const content = fs.readFileSync(script_path, "utf-8");

  // Track changes
  let modified = content;
  let changes = 0;
  const details: string[] = [];

  for (let i = 0; i < replacements.length; i++) {
    const { search, replace } = replacements[i];

    // Count occurrences before replacing
    const occurrenceCount = (modified.match(new RegExp(escapeRegExp(search), "g")) || []).length;

    if (occurrenceCount === 0) {
      throw new Error(
        `Replacement #${i + 1}: search string not found in script.\n` +
        `Search: "${search.substring(0, 80)}${search.length > 80 ? "..." : ""}"\n` +
        `Tip: Check exact whitespace and indentation in the script.`
      );
    }

    // Perform the replace (only first occurrence to be safe)
    const firstOccurrence = modified.indexOf(search);
    if (firstOccurrence === -1) {
      // Already checked, but defensive
      throw new Error(`Replacement #${i + 1}: search string unexpectedly not found`);
    }

    modified = modified.substring(0, firstOccurrence) + replace + modified.substring(firstOccurrence + search.length);
    changes++;

    // Compute line numbers for the report
    const beforeLines = content.substring(0, firstOccurrence).split("\n").length;
    const lineEnd = content.substring(0, firstOccurrence + search.length).split("\n").length;

    details.push(
      `  #${i + 1}: Replaced "${search.substring(0, 40)}${search.length > 40 ? "..." : ""}" ` +
      `→ "${replace.substring(0, 40)}${replace.length > 40 ? "..." : ""}" ` +
      `(line ${beforeLines}${lineEnd !== beforeLines ? `-${lineEnd}` : ""})`
    );
  }

  // Create backup if enabled
  let backupPath: string | undefined;
  if (create_backup) {
    backupPath = script_path + ".bak";
    fs.copyFileSync(script_path, backupPath);
  }

  // Write the modified content back
  fs.writeFileSync(script_path, modified, "utf-8");

  // Build result message
  const parts: string[] = [
    `Modified script: ${path.basename(script_path)}`,
    `Changes applied: ${changes}`,
    "",
    ...details,
  ];

  if (backupPath) {
    parts.push("", `Backup saved to: ${path.basename(backupPath)}`);
  }

  return parts.join("\n");
}

/**
 * Escape special regex characters in a string.
 * Used to safely insert user-provided search strings into regex patterns.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
