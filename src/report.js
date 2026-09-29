export function reportToMarkdown(report) {
  const lines = [`# WebA11yRobot — ${report.hedef.girilen}`, "", `İncelenen sayfa: ${report.ozet.incelenenSayfa}; statik HTML bulgusu: ${report.ozet.bulgu}; manuel görev: ${report.ozet.manuelGorev}.`, "", "## Statik HTML bulguları"];
  for (const item of report.bulgular) lines.push(`- **${item.kod}** — ${item.baslik} (${item.kanit.url}): ${item.kanit.bulunan}. ${item.cozum}`);
  lines.push("", "## Sayfaya özel manuel test planı");
  for (const item of report.manuelTestler) lines.push(`### ${item.baslik} — ${item.sayfa}`, ...item.adimlar.map((step) => `- [ ] ${step}`), "");
  lines.push("## Sınırlar", ...report.sinirlar.map((limit) => `- ${limit}`));
  return lines.join("\n");
}

export function buildFixPrompt(report) {
  return `Aşağıdaki WebA11yRobot raporunu mevcut projede ele al. Önce repoyu, AGENTS.md dosyalarını ve framework belgelerini incele. Kullanıcının ilgisiz değişikliklerini koru. Statik HTML bulgularını canlı yanıtla doğrula; manuel görevleri otomatik olarak geçti sayma. Klavye, odak, ekran okuyucu, kontrast ve form hatalarını gerçek tarayıcıda test et. WCAG uyumluluğu veya sertifikası iddia etme. Değişikliklerden sonra testleri çalıştır ve her bulgunun nasıl doğrulandığını raporla.\n\n${reportToMarkdown(report)}`;
}
