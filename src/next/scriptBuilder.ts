import { ZipeModule } from "./parse";
import { ZipeCache } from "./cache";

const debug = require("debug")("zipe:scriptBuilder");

export function scriptBuilder(
  item: ZipeModule,
  dependencyCache: ZipeCache<string, ZipeModule>,
  varNameResolver: (s: string) => string,
  ssr = false,
  comments = false
) {
  const name = varNameResolver(item.module.path);
  // TODO check if this is actually correct, not sure if is worth to have script builder as a transformer
  const script = item.sfc.script.code
    ? item.sfc.script.code
    : item.code || item.rawContent;
  const exports = item.exports;

  const start = Date.now();

  let code = `let ${name}`;

  // start block
  code += "\n{";

  if (exports.length === 0) {
    console.log("no exports");
  } else if (exports.length === 1 && exports[0] === "default") {
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

  if (item.sfc) {
    const { scopeId, styles, template, ssrTemplate } = item.sfc;

    if (styles.length > 0) {
      // TODO do cssModules
      // styles.forEach(x=> {
      //   if(x.modules){
      //   }
      // })
      // // NOTE not sure how this works :D
      // code += `\nconst __cssModules = ${name}.__cssModules = {}`;
      // const modules = Object.entries()
      // for (const (m, i) in Object.entries(styles.modules)) {
      // }
      // const styleVar = `__style${i}`;
      // TODO styles
    }

    if (scopeId) {
      code += `\n${name}.__scopeId = "data-v-${scopeId}"\n`;
    }

    if (ssr) {
      console.log("ssrTem", ssrTemplate);
    }
    if (ssr && ssrTemplate.code) {
      code += ssrTemplate.code;

      code += `\n${name}.ssrRender = ssrRender`;
    } else if (template.code) {
      code += template.code;

      code += `\n${name}.render = render`;
    }

    if (!ssr) {
      // TODO pass this as options
      code += `\n${name}.__hmrId = ${JSON.stringify(item.module.path)}`;
      code += `\n${name}.__file = ${JSON.stringify(item.module.fullPath)}`;
    }
  }

  // end block
  code += "\n}";

  debug(`${item.name} script built in ${Date.now() - start}ms.`);

  return code;
}
