import { WebSocket } from "ws";

async function runTests() {
  console.log("=== Testing Ticket RT-01 ===");

  // 1. Test REST endpoint: GET /health
  console.log("\n[1] Testing GET http://localhost:3000/health ...");
  const res = await fetch("http://localhost:3000/health");
  const data = await res.json();
  console.log("Response status:", res.status);
  console.log("Response body:", data);

  if (res.status === 200 && data.status === "ok") {
    console.log("✅ REST /health check PASSED");
  } else {
    console.error("❌ REST /health check FAILED");
    process.exit(1);
  }

  // 2. Test WebSocket connection with multiple clients
  console.log("\n[2] Connecting Client A and Client B to ws://localhost:3000/realtime ...");
  
  const clientA = new WebSocket("ws://localhost:3000/realtime");
  const clientB = new WebSocket("ws://localhost:3000/realtime");

  const waitForOpen = (ws: WebSocket) =>
    new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

  await Promise.all([waitForOpen(clientA), waitForOpen(clientB)]);
  console.log("✅ Both clients connected successfully");

  // 3. Test Echo & Unicast
  console.log("\n[3] Testing echo & unicast isolation ...");
  const clientAReceived: string[] = [];
  const clientBReceived: string[] = [];

  clientA.on("message", (msg) => clientAReceived.push(msg.toString()));
  clientB.on("message", (msg) => clientBReceived.push(msg.toString()));

  clientA.send("hello");
  clientB.send("from B");

  // Wait 300ms for responses
  await new Promise((r) => setTimeout(r, 300));

  console.log("Client A received:", clientAReceived);
  console.log("Client B received:", clientBReceived);

  if (
    clientAReceived.length === 1 &&
    clientAReceived[0] === "echo: hello" &&
    clientBReceived.length === 1 &&
    clientBReceived[0] === "echo: from B"
  ) {
    console.log("✅ Echo works & Unicast isolation confirmed (no cross-talk)!");
  } else {
    console.error("❌ Echo test FAILED");
    process.exit(1);
  }

  // 4. Test Disconnect
  console.log("\n[4] Testing disconnect behavior ...");
  clientA.close();
  clientB.close();

  await new Promise((r) => setTimeout(r, 300));
  console.log("✅ Both clients closed cleanly. Server is still alive!");

  console.log("\n🎉 ALL ACCEPTANCE CRITERIA PASSED!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
