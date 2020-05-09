
let port = 8989
require("../dist")
  .createServer()
  .then((server) => {
    server.listen(port, () => {
      console.log(`listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(`failed to start server. error:\n`, err);
  });
