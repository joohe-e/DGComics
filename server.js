const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");

const hostname = "haiv.unist.ac.kr";
const port = 2019;

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const credentials = {
  key: fs.readFileSync('/etc/nginx/ssl/server.key'),
  cert: fs.readFileSync('/etc/nginx/ssl/server.pem'),
};

app.prepare().then(() => {
  createServer(credentials, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://${hostname}:${port}`);
  });
});
