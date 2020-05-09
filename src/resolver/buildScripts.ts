import { ZipeDependency } from "./resolveZipeDependency";

// TODO styles
export function buildScript(
  item: ZipeDependency,
  script: string,
  template: string
) {
  const name = item.varName;

  let code = `let ${name}`;

  // start block
  code += "\n{";

  // script
  code += script.replace("export default", `${name} = `);

  // template
  if (template) {
    code += template;

    code += `\n${name}.render = render`;

    code += `\n${name}.__hmrId = ${JSON.stringify(item.relativePath)}`;
    code += `\n${name}.__file = ${JSON.stringify(item.filePath)}`;
  }

  // end block
  code += "\n}";

  return code;
}
