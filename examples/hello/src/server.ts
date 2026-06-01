import http from "node:http";
import os from "node:os";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? 3000);
const startedAt = new Date().toISOString();
let requests = 0;

const server = http.createServer((req, res) => {
  requests++;

  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptimeSec: Math.round(process.uptime()) }));
    return;
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html>
<html>
  <head><title>node-runner hello</title></head>
  <body style="font-family:system-ui;max-width:42rem;margin:4rem auto;line-height:1.6">
    <h1>👋 Hello from node-runner</h1>
    <p>This app was deployed by the node-runner agent.</p>
    <ul>
      <li>Host: ${os.hostname()}</li>
      <li>PID: ${process.pid}</li>
      <li>Port: ${port}</li>
      <li>Node: ${process.version}</li>
      <li>Started: ${startedAt}</li>
      <li>Requests served: ${requests}</li>
    </ul>
    <p>WebSocket echo server is available at <code>/ws</code>.</p>
  </body>
</html>`);
});

// Exercises websocket support through Caddy's reverse proxy.
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  ws.send("connected to node-runner hello");
  ws.on("message", (data) => ws.send(`echo: ${data.toString()}`));
});

server.listen(port, () => {
  console.log(`hello app listening on :${port}`);
});
