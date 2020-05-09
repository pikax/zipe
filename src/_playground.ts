import path from "path";
let port = 4242;

console.log("root", process.cwd());
require("../dist")
  .createServer({
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
