"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return send(res, 405, "Method not allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "Bad request");
  }

  if (pathname === "/health" || pathname === "/healthz") {
    return send(res, 200, JSON.stringify({ status: "ok", app: "avon-toastmasters" }), "application/json; charset=utf-8");
  }

  if (pathname === "/") pathname = "/index.html";
  let filePath = path.resolve(ROOT, "." + pathname);
  if (!filePath.startsWith(ROOT + path.sep)) return send(res, 403, "Forbidden");

  fs.stat(filePath, (statError, stat) => {
    if (!statError && stat.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (error, data) => {
      if (error) return send(res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Page not found" : "Server error");
      const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Frame-Options": "SAMEORIGIN",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cache-Control": type.includes("text/html") ? "no-cache" : "public, max-age=3600"
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log("Avon Toastmasters website listening on http://" + HOST + ":" + PORT);
});

server.on("error", error => {
  console.error("Unable to start Avon Toastmasters server:", error.message);
  process.exitCode = 1;
});