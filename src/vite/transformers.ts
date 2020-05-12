import { transform } from "vite/dist/esbuildService";
import { ZipeScriptTransform } from "../next/transformers";

export const scriptTransforms: Record<string, ZipeScriptTransform> = {
  ts: (content, filepath, opts) =>
    transform(content, filepath, { ...opts, loader: "ts" }),
  js: (content, filepath, opts) =>
    transform(content, filepath, { ...opts, loader: "js" }),
  jsx: (content, filepath, opts) =>
    transform(content, filepath, { ...opts, loader: "jsx" }),
  tsx: (content, filepath, opts) =>
    transform(content, filepath, { ...opts, loader: "tsx" }),
  json: (content, filepath, opts) => {
    // TODO add map
    return Promise.resolve({
      code: `export default JSON.parse(\`${JSON.stringify(
        JSON.parse(content)
      )}\`)`,
      map: undefined,
    });
  },
  // transform(content, filepath, { ...opts, loader: "json" }),

  // TODO more
};
