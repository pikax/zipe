import { init as initLexer } from "es-module-lexer";
import { Plugin } from "vite";
import { ssrBuild } from "./ssrBuild";

export function createZipePrerender(options?: { component: string }): Plugin {
  options = options ?? { component: "/App.vue" };

  return ({ app, root, watcher, resolver, server }) => {
    app.use(async (ctx, next) => {
      if (ctx.path === "/") {
        await initLexer;
        const html = await ssrBuild(
          resolver.requestToFile(options!.component),
          resolver,
          root,
          watcher
        );
        ctx.body = html;
        return;
      }

      await next();
    });
  };
}
