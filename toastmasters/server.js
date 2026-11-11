const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp"
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }

  let requested = path.resolve(ROOT, "." + pathname);
  if (!requested.startsWith(ROOT + path.sep) && requested !== ROOT) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  if (pathname.endsWith("/")) requested = path.join(requested, "index.html");
  fs.stat(requested, (statError, stat) => {
    if (!statError && stat.isDirectory()) requested = path.join(requested, "index.html");
    fs.readFile(requested, (error, data) => {
      if (error) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Page not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(requested).toLowerCase()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Cache-Control": "no-cache"
      });
      res.end(data);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Avon Toastmasters website running at http://localhost:${PORT}`);
});