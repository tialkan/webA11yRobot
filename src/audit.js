import { load } from "cheerio";
import { fetchPublicHtml, normalizeTarget } from "./net.js";

const MAX_PAGES = 4;

export async function auditSite(input, options = {}) {
  const target = normalizeTarget(input);
  const started = Date.now();
  const maxPages = Math.min(MAX_PAGES, Math.max(1, Number(options.maxPages) || MAX_PAGES));
  const queue = [target.href];
  const visited = new Set();
  const pages = [];
  const findings = [];
  const tasks = [];
  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    let response;
    try { response = await fetchPublicHtml(url, options); }
    catch (error) {
      if (!pages.length) throw error;
      findings.push(makeFinding("PAGE-UNAVAILABLE", "inceleme gerekli", url, "Sayfa okunamadı", error.message, "Bağlantıyı ve canlı yanıtı kendiniz kontrol edin."));
      continue;
    }
    if (response.status !== 200) {
      findings.push(makeFinding("PAGE-STATUS", "inceleme gerekli", url, "Sayfa 200 yanıtı vermedi", `HTTP ${response.status}`, "Hedefin erişilebilir olup olmadığını kontrol edin."));
      continue;
    }
    const result = inspectHtml(response.body, response.url);
    pages.push(result.page);
    findings.push(...result.findings);
    tasks.push(...result.tasks);
    for (const link of result.links) {
      const candidate = new URL(link);
      if (candidate.origin === target.origin && !visited.has(link) && !queue.includes(link) && queue.length < maxPages * 2) queue.push(link);
    }
  }
  return {
    surum: "0.1.0", olusturuldu: new Date().toISOString(),
    hedef: { girilen: target.href, son: pages[0]?.url || null },
    ozet: { sureMs: Date.now() - started, incelenenSayfa: pages.length, bulgu: findings.length, manuelGorev: tasks.length },
    bulgular: findings, manuelTestler: tasks, sayfalar: pages,
    sinirlar: ["Yalnızca sunucunun döndürdüğü HTML incelenir; JavaScript çalıştırılmaz.", "Klavye akışı, odak görünürlüğü, ekran okuyucu deneyimi, gerçek kontrast ve medya içeriği otomatik doğrulanmaz.", "Bulgu olmaması WCAG uygunluğu veya erişilebilirlik sertifikası değildir.", `En fazla ${maxPages} herkese açık sayfa incelenir; oturum, form gönderimi ve etkileşim denenmez.`]
  };
}

export function inspectHtml(html, url) {
  const $ = load(html);
  const findings = [];
  const tasks = [];
  const add = (code, title, evidence, advice) => findings.push(makeFinding(code, "otomatik gözlem", url, title, evidence, advice));
  const task = (code, title, steps) => tasks.push({ kod: code, sayfa: url, baslik: title, adimlar: steps });
  const lang = $("html").attr("lang")?.trim();
  if (!lang) add("HTML-LANG-MISSING", "Sayfa dili belirtilmemiş", "html[lang] bulunamadı", "İçeriğin gerçek dilini html lang niteliğinde belirtin.");
  const title = $("title").first().text().trim();
  if (!title) add("TITLE-MISSING", "Sayfa başlığı bulunamadı", "title boş veya yok", "Sayfanın amacını anlatan özgün bir title ekleyin.");
  $("img").each((index, element) => {
    if ($(element).attr("alt") === undefined) add("IMAGE-ALT-MISSING", "Görselde alt niteliği yok", `img ${index + 1}: ${short($(element).attr("src") || "src yok")}`, "Anlamlı görsele bağlama uygun alt metni, dekoratif görsele boş alt niteliği ekleyin.");
  });
  $("iframe").each((index, element) => {
    if (!$(element).attr("title")?.trim()) add("IFRAME-TITLE-MISSING", "Çerçevenin adı yok", `iframe ${index + 1}: ${short($(element).attr("src") || "src yok")}`, "İçeriğini anlatan kısa bir title ekleyin.");
  });
  $("button").each((index, element) => {
    if (!accessibleName($, element)) add("BUTTON-NAME-MISSING", "Düğmenin erişilebilir adı yok", `button ${index + 1}`, "Görünen veya programatik olarak belirlenen anlamlı bir ad verin.");
  });
  $("input:not([type=hidden]), select, textarea").each((index, element) => {
    const type = ($(element).attr("type") || "text").toLowerCase();
    if (["submit", "button", "reset", "image"].includes(type)) return;
    if (!accessibleName($, element)) add("FIELD-LABEL-MISSING", "Form alanının etiketi yok", `${element.tagName} ${index + 1}: ${short($(element).attr("name") || $(element).attr("id") || "kimlik yok")}`, "Görünür label veya bağlama uygun erişilebilir ad ekleyin; placeholder etiket yerine geçmez.");
  });
  $("a[href]").each((index, element) => {
    if (!accessibleName($, element)) add("LINK-NAME-MISSING", "Bağlantının erişilebilir adı yok", `a ${index + 1}: ${short($(element).attr("href") || "")}`, "Bağlantı amacını anlatan görünen metin ya da erişilebilir ad verin.");
  });
  if ($("a, button, input, select, textarea, [tabindex]").length) task("KEYBOARD", "Klavye ve odak akışını dene", ["Yalnızca Tab ve Shift+Tab ile tüm etkileşimli öğelere sırayla ulaşın.", "Odağın her adımda görünür olduğunu; Enter/Space ile işlemlerin çalıştığını doğrulayın.", "Açılır menü ve modal varsa Esc ile çıkış ve odak dönüşünü test edin."]);
  if ($("img, svg, [style], link[rel=stylesheet]").length) task("CONTRAST", "Gerçek kontrastı ve yakınlaştırmayı ölç", ["Tarayıcıda metin ve kontrol kontrastını görünür durumlarıyla ölçün.", "%200 yakınlaştırmada taşma ve içerik kaybını kontrol edin.", "Yalnızca renkle aktarılan bilginin metinle de sunulduğunu doğrulayın."]);
  if ($("form").length) task("FORMS", "Formu hatalı girişlerle tamamla", ["Zorunlu alanları boş bırakıp gönderin; hatanın metinle açıklandığını kontrol edin.", "Hata sonrası odağın ve ilgili alan ilişkisinin anlaşılır olduğuna bakın.", "Klavye ve ekran okuyucuyla formun baştan sona tamamlanabildiğini doğrulayın."]);
  if ($("video, audio").length) task("MEDIA", "Medya alternatiflerini izle", ["Konuşmalı video için doğru altyazı, ses için metin dökümü olup olmadığını inceleyin.", "Görsel bilgi sesle aktarılmıyorsa sesli betimleme ihtiyacını değerlendirin.", "Oynatıcı kontrollerini klavye ile deneyin."]);
  if ($("dialog, [role=dialog], [aria-modal=true]").length) task("DIALOG", "Modal etkileşimini dene", ["Açılınca odağın modal içine geçtiğini doğrulayın.", "Tab ile odak yönetimini, Esc ve kapatma sonrası tetikleyiciye dönüşü test edin."]);
  task("SCREEN-READER", "Ekran okuyucu ile anlamı doğrula", ["Sayfa başlıklarını ve bölgeleri ekran okuyucuyla sırayla gezin.", "Görsel alt metinlerinin bağlama uygunluğunu ve dinamik bildirimleri insan gözüyle değerlendirin."]);
  const links = $("a[href]").map((_, element) => { try { const href = new URL($(element).attr("href"), url); href.hash = ""; return /^https?:$/.test(href.protocol) ? href.href : null; } catch { return null; } }).get();
  return { page: { url, title, lang: lang || null, goruntu: $("img").length, form: $("form").length, etkilesim: $("a, button, input, select, textarea").length }, findings, tasks, links: [...new Set(links)] };
}

function accessibleName($, element) {
  const node = $(element);
  if (node.attr("aria-label")?.trim() || node.attr("title")?.trim()) return true;
  const labelledby = node.attr("aria-labelledby")?.trim();
  if (labelledby && labelledby.split(/\s+/).some((id) => $("[id]").filter((_, candidate) => $(candidate).attr("id") === id).text().trim())) return true;
  if (node.closest("label").text().trim()) return true;
  const id = node.attr("id");
  if (id && $("label[for]").filter((_, label) => $(label).attr("for") === id).text().trim()) return true;
  if (node.text().trim() || node.find("img[alt]").filter((_, image) => $(image).attr("alt")?.trim()).length) return true;
  const type = node.attr("type")?.toLowerCase();
  if (["submit", "button", "reset"].includes(type) && node.attr("value")?.trim()) return true;
  return false;
}

function short(value) { return String(value).replace(/\s+/g, " ").slice(0, 160); }
function makeFinding(kod, guven, url, baslik, bulunan, cozum) { return { kod, guven, baslik, kanit: { url, bulunan }, cozum, otomatikDuzeltilebilir: false }; }
