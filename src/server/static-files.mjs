import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const staticFiles = new Set(["/index.html", "/styles.css", "/script.js"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

export function createStaticHandler({ publicDir }) {
  return async function serveStatic(request, response) {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);

    let pathname;

    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad Request");
      return;
    }

    const staticPath = pathname === "/" ? "/index.html" : pathname;

    if (!staticFiles.has(staticPath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const filePath = resolve(join(publicDir, staticPath.slice(1)));
    const relativePath = relative(publicDir, filePath);

    if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes("../")) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        throw new Error("Not a file");
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  };
}
