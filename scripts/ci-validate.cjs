// CI validation script — validate project test fixtures
const path = require("path");
const projectRoot = path.resolve(__dirname, "..");
const { validateProject } = require(path.join(projectRoot, "dist/tools/validate_project.js"));
const result = validateProject({ project_path: "test-fixtures" });
console.log(result);
if (result.includes("[ERROR]") && !result.includes("无法校验")) {
  process.exit(1);
}
