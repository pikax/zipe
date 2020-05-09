import { createServer as createViteServer } from "vite";
import { createZipePrerender } from "./plugin";
let port = 4242;

// console.log("root", process.cwd());
// require("../dist").
createServer({
  // root: path.join(__dirname, "../playground"),
  root: process.cwd(),
})
  .then((server) => {
    server.listen(port, () => {
      console.log(`listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(`failed to start server. error:\n`, err);
  });

export async function createServer(options = {}) {
  return createViteServer({
    ...options,
    plugins: [
      createZipePrerender({
        // component: "/playground/index.vue",
        component: "/App.vue",
      }),
    ],
    resolvers: [],
  });
}
