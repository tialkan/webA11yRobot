import dns from "node:dns/promises";
import net from "node:net";

export function normalizeTarget(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("Bir site adresi girin.");
  const raw = /^[a-z][\w+.-]*:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  let url;
  try { url = new URL(raw); } catch { throw new Error("Geçerli bir internet adresi girin."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) throw new Error("Yalnızca herkese açık HTTP(S) adresleri ve 80/443 portları kabul edilir.");
  url.hash = "";
  return url;
}

export function isPrivateIp(address) {
  const ip = address.toLowerCase();
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a >= 224;
  }
  if (net.isIPv6(ip)) return ip === "::" || ip === "::1" || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("ff") || ip.startsWith("::ffff:");
  return true;
}

export async function assertPublicUrl(input) {
  const url = input instanceof URL ? input : normalizeTarget(input);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Yerel ve özel ağ adresleri denetlenemez.");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Yerel ve özel ağ adresleri denetlenemez.");
    return url;
  }
  let records;
  try { records = await dns.lookup(host, { all: true, verbatim: true }); } catch { throw new Error("Alan adı çözümlenemedi."); }
  if (!records.length || records.some(({ address }) => isPrivateIp(address))) throw new Error("Alan adı genel bir IP adresine çözülmüyor.");
  return url;
}

export async function fetchPublicHtml(input, options = {}) {
  let current = normalizeTarget(input);
  for (let hop = 0; hop < 5; hop += 1) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout ?? 10_000);
    let response;
    try {
      response = await fetch(current, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "WebA11yRobot/0.1 (+https://tezatlas.com/weba11yrobot)", accept: "text/html,application/xhtml+xml;q=0.9" } });
      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location")) {
        current = new URL(response.headers.get("location"), current);
        continue;
      }
      if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") || "")) throw new Error("Hedef HTML yanıtı vermiyor.");
      const limit = options.maxBytes ?? 1_000_000;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Boş yanıt.");
      let size = 0; const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); throw new Error("HTML yanıtı boyut sınırını aşıyor."); }
        chunks.push(value);
      }
      return { url: current.href, status: response.status, body: new TextDecoder().decode(Buffer.concat(chunks)) };
    } catch (error) {
      throw new Error(error.name === "AbortError" ? "İstek zaman aşımına uğradı." : error.message);
    } finally { clearTimeout(timer); }
  }
  throw new Error("Yönlendirme sınırı aşıldı.");
}
