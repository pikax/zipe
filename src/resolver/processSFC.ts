import { SFCParseResult, resolveCompiler } from "../utils";
import { posix } from "path";
import { parse as sfcParse, compileTemplate } from "@vue/compiler-sfc";

export interface ProcessSFCResult {
  sfc: SFCParseResult;

  template: string;
  script: string;
  styles: string;
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
    styles: null,
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

  return item;
}
