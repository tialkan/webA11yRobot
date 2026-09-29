# WebA11yRobot

Herkese açık sitelerin **sunucudan gelen HTML'ini** sınırlı ve pasif biçimde inceleyen, bulguları sayfaya özgü manuel test görevlerine dönüştüren açık kaynak araç. Öğrenciler kendi sitelerini geliştirme sürecinde hızlı bir başlangıç kontrolü ve yapılacaklar listesi olarak kullanabilir.

Canlı ve kolay kullanım: [tezatlas.com/weba11yrobot](https://tezatlas.com/weba11yrobot)

## Yerelde kullanım

Node.js 20.11+ gerekir.

```bash
npm install
node bin/weba11yrobot.js https://example.com
node bin/weba11yrobot.js https://example.com --json
npm test
```

## Neleri kontrol eder?

İlk en fazla dört herkese açık HTML sayfasında `html[lang]`, sayfa başlığı, görsel `alt` niteliği, form etiketi, düğme/bağlantı adı ve iframe başlığı gibi **kaynakta gözlenebilir** eksikleri raporlar. Sayfadaki form, medya, modal ve etkileşimli öğelere göre klavye, odak, ekran okuyucu, kontrast, yakınlaştırma ve hata mesajı test görevleri oluşturur.

JavaScript çalıştırmaz; CSS'in gerçek kontrastını, erişilebilirlik ağacını, dinamik durumları ve ekran okuyucu deneyimini ölçmez. “Bulgu yok” sonucu WCAG uygunluğu veya sertifika anlamına gelmez. Yalnızca sahibi olduğunuz veya denetlemeye yetkili olduğunuz sitelerde kullanın. İstekler sayfa okuma amaçlıdır; form gönderimi, giriş veya aktif saldırı yapılmaz.

Kapsamın neden insan doğrulaması gerektirdiği için [W3C WAI değerlendirme araçları rehberine](https://www.w3.org/WAI/test-evaluate/tools/selecting/) bakın.

## Geliştirme

Hata bildirimi ve kod katkısı için GitHub Issues / Pull Requests kullanabilirsiniz. Raporları paylaşırken özel URL ve verileri kaldırın. Proje MIT lisanslıdır.
