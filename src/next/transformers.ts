import { RawSourceMap } from "source-map";
import { CommonOptions } from "esbuild";
import { vueTemplateTransform } from "./transformers/vueTemplate";
import { vueStyleTransform } from "./transformers/vueStyleTransform";

export interface ZipeScriptTransformOptions extends CommonOptions {
  root: string;
}

export type ZipeScriptTransform = (
  content: string,
  filePath: string,
  options: Partial<ZipeScriptTransformOptions>,
  extra?: Record<string, any>
) => Promise<{
  code: string | undefined;
  map: string | RawSourceMap | undefined;
}>;

// TODO add transformers for SSR

export const scriptTransforms: Record<string, ZipeScriptTransform> = {
  // ts: (content, filepath, opts) =>
  //   transform(content, filepath, { ...opts, loader: "ts" }),
  // js: (content, filepath, opts) =>
  //   transform(content, filepath, { ...opts, loader: "js" }),
  // jsx: (content, filepath, opts) =>
  //   transform(content, filepath, { ...opts, loader: "jsx" }),
  // tsx: (content, filepath, opts) =>
  //   transform(content, filepath, { ...opts, loader: "tsx" }),
  // json: (content, filepath, opts) =>
  //   transform(content, filepath, { ...opts, loader: "json" }),

  // TODO more

  "vue.template": vueTemplateTransform,
  "vue.style": vueStyleTransform,
};
