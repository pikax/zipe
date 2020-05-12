import { createServer as createViteServer } from "vite";
import { createViteSSR } from "./plugin";
import { Router } from "vue-router";

const SSR = createViteSSR(({ app, zipeSSR }) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      ctx.body = await zipeSSR("/App.vue", ctx, [
        {
          importLine: "import router from '/router.js'",
          enhance(app, dependency) {
            return app.use(dependency);
          },
        },
      ]);
      return;
    }
    if (ctx.path === "/router") {
      ctx.body = await zipeSSR("/AppRouter.vue", ctx, [
        {
          importLine: "import router from '/router.js'",
          enhance(app, dependency) {
            app.use(dependency);
          },
          async ssr(app, router: Router, ctx) {
            console.log("pushing path", ctx.request.url);
            router.push(ctx.request.url);
            await router.isReady();
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
