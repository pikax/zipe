import path from "path";
import {
  createServer as createViteServer,
  cachedRead,
  Plugin,
  ServerConfig,
} from "vite";

import { renderToString } from "@vue/server-renderer";
import {
  createApp,
  defineAsyncComponent,
  h,
  defineComponent,
  createSSRApp,
} from "vue";
import {
  parse,
  SFCTemplateBlock,
  SFCStyleBlock,
  compileTemplate,
} from "@vue/compiler-sfc";
import { resolveCompiler } from "vite/dist/utils";
import { InternalResolver } from "vite/dist/resolver";
import { init as initLexer, parse as parseImports } from "es-module-lexer";
import {
  moduleRewritePlugin,
  rewriteImports,
  rewriteCache,
} from "vite/dist/server/serverPluginModuleRewrite";
import { hmrClientId } from "vite/dist/server/serverPluginHmr";
import { resolveTree, resolvedTreeToContent } from "./resolveTree";

//https://gist.github.com/manekinekko/7e58a17bc62a9be47172
const importRegex = /import(?:["'\s]*([\w*{}\n\r\t, ]+)from\s*)?["'\s].*([@\w_-]+)["'\s].*;?$/gm;
const importFilename = /'(.*)'|`(.*)`|"(.*)"/;

function createVitePreRender(): Plugin {
  return ({ app, root, watcher, resolver, server }) => {
    app.use(async (ctx, next) => {
      console.log("p", ctx.path);
      if (ctx.path === "/hello") {
        ctx.type = "text";
        ctx.body = "HELLO";
        return;
      }

      if (ctx.path === "/app") {
        await initLexer;
        const f = await cachedRead(ctx, "App.vue");
        const { descriptor } = parse(f);

        // console.log("fg", descriptor);
        ctx.body = descriptor.script?.content.match(importRegex);

        const sfc = await stringFromSFC(
          f,
          "App.vue",
          "/",
          resolver,
          root,
          new Set<string>([]),
          new Set<string>([])
        );

        const code = buildContent(
          sfc.sfcResult,
          "App.vue",
          "/",
          "/App.vue",
          new Set()
        );
        ctx.body = code;
        return;

        // parse();
      }

      if (ctx.path === "/app2") {
        await initLexer;

        const dependencies = new Map();
        const externals = new Map();

        const item = await resolveTree(
          resolver.requestToFile("/App.vue"),
          resolver,
          dependencies,
          externals
        );

        ctx.body = item.content;
        ctx.body = item;

        return;
      }
      if (ctx.path === "/app3") {
        await initLexer;

        const dependencies = new Map();
        const externals = new Map();

        const item = await resolveTree(
          resolver.requestToFile("/App.vue"),
          resolver,
          dependencies,
          externals
        );

        const content = resolvedTreeToContent(item, dependencies, externals);

        ctx.body = content;

        return;
      }

      // createSSRApp()
      const app = createApp(
        defineComponent({
          // template: '<div>XX</div>',
          setup() {
            return () => {
              return h("div", "textXXX");
            };
          },
        })
      );

      ctx.body = await renderToString(app, {});

      // if (ctx.path === "/App.vue") {

      //   const file = resolver.requestToFile(ctx.path);

      //   const xx = await cachedRead(ctx, file);

      //   console.log("c", ctx.body);
      //   // createApp()
      // }
    });
  };
}

export async function createServer(options: ServerConfig = {}) {
  return createViteServer({
    ...options,
    plugins: [createVitePreRender()],
    resolvers: [],
  });
}

async function stringFromSFC(
  source: string,
  name: string,
  filepath: string,
  resolver: InternalResolver,
  root: string,
  imported: Set<string>,
  modules: Set<string>
): Promise<FileDependency> {
  const current: FileDependency = {
    name,
    filepath,
    source,

    content: null as any,
    imports: [],

    sfcResult: {} as any,

    hasDynamicImports: false,
  };
  const filename = path.posix.resolve(root, filepath, name);
  console.log("filename", { filename, root, filepath, name });

  imported.add(filename);

  const parsedSFC = (current.sfcResult = parse(source, {
    filename,
    sourceMap: true,
  }));
  // current.sfcResult = null;

  const script = rewriteImports(
    parsedSFC.descriptor.script?.content ?? "",
    filepath,
    resolver
  );

  parsedSFC.descriptor.script!.content = script;

  const [imports, other] = parseImports(script);

  console.log("otehrs", other);
  // console.log(script);

  let removeScripts: string[] = [];

  for (let i = imports.length - 1; i >= 0; --i) {
    const ip = imports[i];
    const file = script.slice(ip.s, ip.e);
    // console.log("eee", { ip }, script.slice(ip.ss, ip.se));
    removeScripts.push(script.slice(ip.ss, ip.se));

    // TODO fix this, it doesnt work properly
    if (file.startsWith("/@modules") || resolver.idToRequest(file)) {
      console.log("external[skipping]", file);
      continue;
    }

    if (imported.has(file)) {
      console.log("file imported [skipping]");
      continue;
    }

    // console.log("fp", { file, fff: resolver.requestToFile(file) });

    const content = await cachedRead(null, resolver.requestToFile(file));
    // console.log("import content", content);
    const sfc = await stringFromSFC(
      content,
      path.basename(file),
      file,
      resolver,
      root,
      imported,
      modules
    );

    current.imports.push(sfc);
  }

  console.log({ removeScripts });
  for (const s of removeScripts) {
    console.log("ss", `--${s}-`);
    current.source.replace(s, "");
    current.sfcResult.descriptor.script?.src?.replace(s, "");
    const xc = current.sfcResult.descriptor.script!.content!.replace(s, "");
    current.sfcResult.descriptor.script!.content = xc;
  }

  return current;
}

function buildContent(
  sfc: ReturnType<typeof parse>,
  filename: string,
  filePath: string,
  publicPath: string,

  dependencies: Set<string>
): string {
  // NOTE this
  const template = buildTemplate(
    sfc.descriptor.template!,
    filename,
    publicPath,
    dependencies
  );

  let code = sfc.descriptor.script?.content.replace(
    `export default`,
    "const __script ="
  );

  code += template;
  code += `\n__script.render = render`;

  code += `\n__script.__hmrId = ${JSON.stringify(publicPath)}`;
  code += `\n__script.__file = ${JSON.stringify(filePath)}`;

  return `let {${code}}`;
}

function buildStyle(styleBlock: SFCStyleBlock, publicPath: string): string {
  // hmrClientId

  return "";
}

function buildTemplate(
  template: SFCTemplateBlock,
  filename: string,
  publicPath: string,
  dependencies: Set<string>
): string {
  const { code, map, errors } = compileTemplate({
    source: template.content,
    filename,
    inMap: template.map,
    transformAssetUrls: {
      base: path.posix.dirname(publicPath),
    },
    // todo rest serverPluginVue:300
  });

  let output = code;

  const [imports] = parseImports(output);

  for (const i of imports) {
    dependencies.add(output.slice(i.ss, i.se));
    output = output.replace(output.slice(i.ss, i.se), "");
  }

  return output;
}

interface FileDependency {
  name: string;
  filepath: string;
  source: string;

  content: string;
  imports: FileDependency[];

  sfcResult: ReturnType<typeof parse>;

  hasDynamicImports: boolean;
}
