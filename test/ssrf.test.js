import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { guvenliFetch, isPrivateIp } from "../src/net.js";

test("eşlemeli IPv6, NAT64 ve özel aralıklar engellenir", () => {
  for (const ip of ["169.254.169.254", "::ffff:169.254.169.254", "::ffff:a9fe:a9fe", "::ffff:172.16.0.1", "64:ff9b::a9fe:a9fe", "2002:a9fe:a9fe::1", "100.64.0.1", "198.18.0.1", "0.0.0.0", "::", "::1", "fe80::1", "[::1]"]) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) assert.equal(isPrivateIp(ip), false, ip);
});

test("bağlantı anında özel adrese çözülen alan adı reddedilir", async () => {
  const sunucu = createServer((_, res) => res.end("gizli"));
  await new Promise((r) => sunucu.listen(0, "127.0.0.1", r));
  try {
    await assert.rejects(
      guvenliFetch(`http://localhost:${sunucu.address().port}/`),
      (e) => /özel ağ/.test(e.cause?.message ?? e.message),
    );
  } finally {
    sunucu.close();
  }
});
