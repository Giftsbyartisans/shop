const path = require("node:path");
const fs = require("fs-extra");

const project = path.resolve(__dirname, "..");
fs.copySync(path.join(project, "node_modules", "tinymce"), path.join(project, "public", "tinymce"), {
  overwrite: true,
  filter: source => !/[\\/]node_modules[\\/]tinymce[\\/](?:README\.md|CHANGELOG\.md|license\.md|notices\.txt|package\.json|tinymce\.d\.ts|tinymce\.js)$/.test(source),
});
