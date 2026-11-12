# Kıbrıs 2027

Gün ailesinin 24–30 Ocak 2027 Kıbrıs tatili için telefon uygulaması: bugünün planı, gün gün program, yapay zekâ asistanı, otel saatleri, telefonlar, bütçe ve hazırlık listesi.

Adres: https://urgano.github.io/kibris-2027/

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Uygulamanın tamamı: tasarım, program, asistan ekranı, şifreli rezervasyon kodları |
| `sw.js` | Uygulamayı telefona saklar. İnternet yokken, örneğin uçakta, de açılır |
| `manifest.webmanifest`, `icon-*.png`, `icon.svg` | "Ana ekrana ekle" ile uygulama gibi açılması için |
| `worker/asistan-worker.js` | Asistanın Cloudflare Worker'ı (Arşivci ile aynı yapı) |
| `tools/sifrele.html` | Rezervasyon kodlarını yeni bir aile şifresiyle yeniden şifrelemek için |
| `.nojekyll` | GitHub Pages'in dosyaları olduğu gibi yayınlamasını sağlar |

## Kurulum

1. **GitHub Pages:** Repo → Settings → Pages → Source: *Deploy from a branch*, Branch: `main` / `(root)` → Save.
2. **Asistan:** `worker/asistan-worker.js` dosyasının başındaki 4 adımı izleyin. Worker kurulana kadar asistan, sorulara programdan basit yanıtlar verir.
3. **Telefona kurma (Android):** Siteyi Chrome'da açın → sağ üstteki ⋮ → *Ana ekrana ekle*. Ya da uygulamada *Bilgiler → Ana ekrana ekle*.

## Güncelleme

- **Program:** `index.html` içindeki `DAYS` listesi. Her satır `{t:"saat", x:"ne yapılacak", drive:"sürüş", ease:"yürüme notu", hard:true}` biçimindedir.
- **Bütçe:** `BUDGET` listesi. **Hazırlık listesi:** `CHECKLIST` listesi.
- Yaptığınız değişikliklerin telefonlara hemen ulaşması için `sw.js` içindeki sürüm adını değiştirin (`kb27-v1` → `kb27-v2`).
- **Deneme:** Adresin sonuna `?gun=2027-01-26T14:00` ekleyerek uygulamanın o gün ve saatte nasıl görüneceğine bakabilirsiniz.

## Gizlilik

- Repo ve site herkese açıktır.
- PNR, bilet ve rezervasyon numaraları sayfada AES-256 ile şifreli durur. Aile şifresi olmadan okunamaz.
- TC kimlik numarası, doğum tarihi ve kart bilgisi uygulamada hiç yoktur.
- Şifreyi değiştirmek için `tools/sifrele.html` sayfasını kullanın.
- Asistanın kişisel ihtiyaç notları ve sohbet geçmişi yalnızca kişinin kendi telefonunda saklanır. Soru sorulduğunda Worker üzerinden yanıtı üretmek için gönderilir, kaydedilmez.

## Kaynaklar

- Hava durumu: [Open-Meteo](https://open-meteo.com), canlı ve son 11 yılın ortalaması.
- Sürüş süreleri: [OSRM](https://project-osrm.org) ve OpenStreetMap.
- Müze saatleri her kış yeniden ilan edilir: [Eski Eserler ve Müzeler Dairesi](https://eemd.gov.ct.tr).
