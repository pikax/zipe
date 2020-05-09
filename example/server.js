const { ssrBuild } = require("../dist");
const { createServer } = require("vite");

const myPlugin = ({
  root, // project root directory, absolute path
  app, // Koa app instance
  resolver, // resolve file
  server, // raw http server instance
  watcher, // chokidar file watcher instance
}) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/app") {
      const filePath = resolver.requestToFile("/App.vue"); // get the full path
      const html = ssrBuild(filePath, resolver, root, watcher); // build HTML
      ctx.body = html; //assign the html output
      return;
    }
  });
};

createServer({
  plugins: [myPlugin],
}).listen(3200);
