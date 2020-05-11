import { createServer as createViteServer } from "vite";
import { createViteSSR } from "./plugin";

const SSR = createViteSSR(({ app, zipeSSR }) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      ctx.body = await zipeSSR("/App.vue");
      return;
    }
    if (ctx.path === "/output") {
      ctx.body = await zipeSSR("/views/Test.vue");
      return;
    }

    await next();
  });
});

createViteServer({
  plugins: [SSR],
}).listen(4242);
