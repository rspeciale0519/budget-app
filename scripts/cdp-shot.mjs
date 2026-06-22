// Minimal Chrome DevTools Protocol screenshot over the existing Chrome on :9222.
// Usage: node scripts/cdp-shot.mjs <url> <outPath> [waitMs]
import fs from "node:fs";

const url = process.argv[2];
const out = process.argv[3];
const waitMs = Number(process.argv[4] ?? 3500);
const vh = Number(process.argv[5] ?? 900);

const tab = await fetch(`http://localhost:9222/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
const ws = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;
const cmd = (method, params = {}) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});
await new Promise((r) => ws.addEventListener("open", r));

await cmd("Page.enable");
await cmd("Page.navigate", { url });
await new Promise((r) => setTimeout(r, waitMs));
if (vh > 0) await cmd("Emulation.setDeviceMetricsOverride", { width: 1440, height: vh, deviceScaleFactor: 1, mobile: false });
const shot = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: vh > 0 });
fs.writeFileSync(out, Buffer.from(shot.data, "base64"));

// Read back the banner text so we have a textual assertion too.
const evalRes = await cmd("Runtime.evaluate", {
  expression: `(${() => {
    const t = document.body.innerText;
    return JSON.stringify({
      hasBanner: t.includes("Mark it paid?"),
      hasVendor: t.includes("Electric Co"),
      url: location.pathname,
    });
  }})()`,
  returnByValue: true,
});
console.log("EVAL:", evalRes.result?.value);
console.log("SAVED:", out);
ws.close();
process.exit(0);
