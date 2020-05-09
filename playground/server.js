let port = 4242;

require("../dist")
  .createServer({
    // root: __dirname,
  })
  .then((server) => {
    server.listen(port, () => {
      console.log(`listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(`failed to start server. error:\n`, err);
  });
