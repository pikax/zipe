const { ssrBuild } = require("../dist");
const { createServer } = require("vite");

const zipePlugin = ({
  root, // project root directory, absolute path
  app, // Koa app instance
  resolver, // resolve file
  server, // raw http server instance
  watcher, // chokidar file watcher instance
}) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      const filePath = resolver.requestToFile("/App.vue"); // get the full path
      const html = await ssrBuild(filePath, resolver, root, watcher); // build HTML
      ctx.body = html; //assign the html output
      return;
    }
    await next();
  });
};

createServer({
  plugins: [zipePlugin],
}).listen(3000);
