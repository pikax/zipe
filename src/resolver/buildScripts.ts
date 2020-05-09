import { ZipeDependency } from "./resolveZipeDependency";
import { StyleHeader } from "./processSFC";

// TODO styles
export function buildScript(
  item: ZipeDependency,
  script: string,
  template: string,
  scopeId: string | undefined,
  styles: StyleHeader[]
) {
  const name = item.varName;

  let code = `let ${name}`;

  // start block
  code += "\n{";

  // script
  code += script.replace("export default", `${name} = `);

  if (scopeId) {
    code += `\n${name}.__scopeId = "data-v-${scopeId}"\n`;
  }

  if (styles) {
    // styles.forEach((s) => (code += `\n${s}\n`));
    styles.forEach((x) => `updateStyle("${x.id}", "${x.href}")\n`);
  }

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
