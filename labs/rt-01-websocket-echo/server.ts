import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const PORT = 3000;

// 1. Create standard HTTP server for REST endpoints
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

// 2. Attach WebSocket server to the same HTTP server on path '/realtime'
const wss = new WebSocketServer({ server, path: "/realtime" });

wss.on("connection", (ws: WebSocket) => {
  console.log("client connected");

  ws.on("message", (data: WebSocket.RawData) => {
    const message = data.toString();

    // Broadcast to all connected clients (including sender)
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`broadcast: ${message}`);
      }
    }
  });

  ws.on("close", () => {
    console.log("client disconnected");
  });

  ws.on("error", (error) => {
    // Avoid unhandled errors crashing the process
    console.error("ws client error:", error.message);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`REST: http://localhost:${PORT}/health`);
  console.log(`WS:   ws://localhost:${PORT}/realtime`);
});
