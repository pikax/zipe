import { createServer as createViteServer } from "vite";
import { createViteSSR } from "./plugin";

const SSR = createViteSSR(({ app, zipeSSR }) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      ctx.body = await zipeSSR("/App.vue", [
        {
          importLine: "import {default as vueRouterInstal} from 'vue-router'",
          enhance(app, dependency) {
            return app.use(dependency);
          },
        },
      ]);
      return;
    }
    if (ctx.path === "/playground") {
      ctx.body = await zipeSSR("/playground/App.vue");
      return;
    }

    await next();
  });
});

createViteServer({
  plugins: [SSR],
}).listen(4242);
