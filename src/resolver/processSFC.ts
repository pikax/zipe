import { SFCParseResult, resolveCompiler } from "../utils";
import { posix } from "path";
import hash_sum from "hash-sum";

export interface StyleHeader {
  id: string;
  href: string;
}

export interface ProcessSFCResult {
  sfc: SFCParseResult;

  template: string;
  script: string;
  scopeId: string;
  styles: StyleHeader[];
}

export async function processSFC(
  content: string,
  publicPath: string,
  root: string
): Promise<ProcessSFCResult> {
  const item: ProcessSFCResult = {
    sfc: {},

    template: null,
    script: null,
    scopeId: undefined,
    styles: [],
  } as any;

  // TODO add options information
  const { parse, compileTemplate } = resolveCompiler(root);
  const sfc = (item.sfc = parse(content));

  //TODO output errors

  // TODO use customBlocks?

  if (sfc.descriptor.template?.content) {
    const { code, map, errors } = compileTemplate({
      source: sfc.descriptor.template.content,
      filename: posix.basename(publicPath),
      transformAssetUrls: {
        base: posix.dirname(publicPath),
      },
      // todo rest options on serverPluginVue.ts:300
    });

    // TODO use map
    // TODO output errors

    item.template = code.replace("export function render(", "function render(");
  }

  item.script = sfc.descriptor.script?.content ?? "";

  // TODO styles

  // console.log('publui path ', publicPath)
  // styles
  // code from vite serverPluginVue
  const id = hash_sum(publicPath);
  let hasScoped = false;
  let hasCSSModules = false;
  let styleCode = "";
  sfc.descriptor.styles.forEach((s, i) => {
    const styleRequest = publicPath + `?type=style&index=${i}`;
    if (s.scoped) hasScoped = true;
    if (s.module) {
      if (!hasCSSModules) {
        styleCode += `\nconst __cssModules = __script.__cssModules = {}`;
        hasCSSModules = true;
      }
      const styleVar = `__style${i}`;
      const moduleName = typeof s.module === "string" ? s.module : "$style";
      styleCode += `\nimport ${styleVar} from ${JSON.stringify(
        styleRequest + "&module"
      )}`;
      styleCode += `\n__cssModules[${JSON.stringify(
        moduleName
      )}] = ${styleVar}`;
    }

    item.styles.push({
      id: `${id}-${i}`,
      href: styleRequest,
    });
  });
  if (hasScoped) {
    item.scopeId = id;
    // styleCode += `\n__script.__scopeId = "data-v-${id}"`;
  }

  return item;
}
