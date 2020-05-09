import { createServer as createViteServer, Plugin } from "vite";
import { ssrBuild } from "./ssrBuild";
// let port = 4242;

// // console.log("root", process.cwd());
// // require("../dist").
// createServer({
//   // root: path.join(__dirname, "../playground"),
//   root: process.cwd(),
// })
//   .then((server) => {
//     server.listen(port, () => {
//       console.log(`listening at http://localhost:${port}`);
//     });
//   })
//   .catch((err) => {
//     console.error(`failed to start server. error:\n`, err);
//   });

// export async function createServer(options = {}) {
//   return createViteServer({
//     ...options,
//     plugins: [
//       createZipePrerender({
//         // component: "/playground/index.vue",
//         component: "/App.vue",
//       }),
//     ],
//     resolvers: [],
//   });
// }

const zipePlugin: Plugin = ({
  root, // project root directory, absolute path
  app, // Koa app instance
  resolver, // resolve file
  server, // raw http server instance
  watcher, // chokidar file watcher instance
}) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      // NOTE is is using the root folder
      const filePath = resolver.requestToFile("/App.vue"); // get the full path
      const html = await ssrBuild(filePath, resolver, root, watcher); // build HTML
      ctx.body = html; //assign the html output
      return;
    }
    await next();
  });
};

createViteServer({
  // root: process.cwd(),
  plugins: [zipePlugin],
}).listen(4242);
