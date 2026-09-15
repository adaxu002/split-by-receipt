import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8080);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");

  if (requestUrl.pathname === "/api/receipt/parse") {
    response.writeHead(501, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      message: "AI receipt scanning requires the original server-side Gemini integration. Use manual entry or JSON import in this frontend build.",
    }));
    return;
  }

  const relativePath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const candidate = normalize(join(root, relativePath));
  const safePath = candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : join(root, "index.html");

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(safePath)] || "application/octet-stream",
  });
  createReadStream(safePath).pipe(response);
}).listen(port, () => {
  console.log(`Split by Receipt is running at http://localhost:${port}`);
});
