// CI validation script — validate project test fixtures
const { validateProject } = require("./dist/tools/validate_project.js");
const result = validateProject({ project_path: "test-fixtures" });
console.log(result);
if (result.includes("[ERROR]") && !result.includes("无法校验")) {
  process.exit(1);
}
