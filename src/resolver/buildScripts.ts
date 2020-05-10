import { ZipeDependency } from "./resolveZipeDependency";
import { StyleHeader } from "./processSFC";
import { parse as parseImports } from "es-module-lexer";

const debug = require("debug")("zipe:buildScript");

export function buildScript(
  item: ZipeDependency,
  script: string,
  template: string | undefined = undefined,
  scopeId: string | undefined = undefined,
  styles: StyleHeader[] | undefined = undefined
) {
  const name = item.varName;

  let code = `let ${name}`;

  // start block
  code += "\n{";

  // script
  const [, exports] = parseImports(script);
  if (exports.length === 1 && exports[0] === "default") {
    code += script.replace("export default", `${name} = `);
  } else {
    let replaced = script;
    code += `\n${name} = {}\n`;
    exports.forEach((e) => {
      const init = replaced;
      // export existing
      replaced = replaced.replace("export " + e, `${name}.${e} = `);

      // export function
      replaced = replaced.replace(
        `export function ${e}`,
        `${name}.${e} = function`
      );

      // export let
      replaced = replaced.replace(`export let ${e}`, `${name}.${e} `);

      // export const
      replaced = replaced.replace(`export const ${e}`, `${name}.${e} `);

      // export var
      replaced = replaced.replace(`export var ${e}`, `${name}.${e} `);

      // hasn't changed
      if (init === replaced) {
        console.warn("unrecognised export", e);
      }
    });
    code += replaced;
  }
  debug("exports", exports, item.relativePath);

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
