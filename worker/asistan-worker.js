// "Kıbrıs 2027" asistanı için Cloudflare Worker.
// Kurulum (Arşivci ile aynı adımlar):
//   1. Cloudflare panelinde Workers & Pages → Create → Worker. Adını "kibris-asistan" koyun.
//   2. Edit code'a tıklayıp bu dosyanın tamamını yapıştırın, Deploy'a basın.
//   3. Settings → Variables and Secrets → Add → Secret, adı ANTHROPIC_API_KEY (Arşivci'deki anahtarın aynısı olabilir).
//   4. Adres https://kibris-asistan.ugurgun.workers.dev/ olur; index.html'deki ASK_ENDPOINT zaten bu adresi gösterir.

const ALLOWED_ORIGINS = ["https://urgano.github.io"];
// SÜRÜM: 1 (12 Kasım 2026)
const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 900;
const PER_MINUTE = 8;

const hits = new Map();
const cors = origin => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
});
const reply = (body, status, origin) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors(origin) } });
const clip = (v, n) => String(v ?? "").slice(0, n);

// Sabit gezi bilgileri. Kişisel kodlar (PNR, bilet no, TC) burada YOK ve olmamalı.
const TRIP = `
GEZİ: Gün ailesi, 24–30 Ocak 2027, Kuzey Kıbrıs. 5 kişi: Uğur, Birgül (Ayşe Birgül, 64 yaşında, ailenin büyüğü, "Birgül abla" diye hitap edilir), Umay (10 yaşında, kız), Ceyda, Uygar (13 yaş ve üzeri, erkek).
UÇUŞ: Gidiş 24 Ocak Pazar SunExpress XQ842 İzmir 10:40 → Ercan 11:05. Dönüş 30 Ocak Cumartesi Pegasus PC1867 Ercan 15:40 → İzmir 18:05. Bagaj kişi başı 20 kg + kabin. Dönüşte havalimanına uçuştan ~3 saat önce gidilmesi öneriliyor.
OTEL: Salamis Bay Conti Resort Hotel, Yeniboğaziçi/Gazimağusa, denize sıfır, Salamis antik kentinin yanında. Garden oda, Ultra Her Şey Dahil. Giriş 14:00, çıkış 12:00. Ercan'a 45–58 dk, Mağusa merkezine 8 km.
Otel saatleri (kış): Kahvaltı 07:00–10:00, geç kahvaltı 10:00–11:00, öğle 12:30–14:30, akşam 18:00–21:00, gece büfesi 23:00–01:00, Saluna Cafe 09:00–18:00, Lobi Bar 08:00–02:00, Corner Pub 10:00–00:00 (maç yayını), Salamis Club 23:00–02:00 Çarşamba/Cuma/Cumartesi. Oda servisi ücretli. Kapalı ısıtmalı havuz, jakuzi, kapalı çocuk havuzu, fitness, aquapark (kışın açık havuzlar havaya bağlı).
ARAÇ: British Rent a Car, Nissan Note benzeri, otomatik, benzinli, sınırsız km. Ercan'da çıkış kapısında görevli karşılar. İade 30 Ocak 12:00 Ercan. KKTC'de trafik soldan akar, direksiyon sağdadır. Kiralık araç sigortası Güney'de genelde geçmez.
ACİL: Ambulans 112, Polis 155, İtfaiye 199. En yakın hastane Gazimağusa Devlet Hastanesi (otelden ~15 dk). Para birimi Türk lirası. Prizler İngiliz tipi (3 pimli), adaptör gerekir.
GÜNEYE GEÇİŞ: Türk vatandaşları için pasaport ve geçerli GKRY vizesi ya da Schengen vizesi gerekir. Kesin bilgi için resmi kaynaklara bakılmalı.
YEREL LEZZETLER: Şeftali kebabı, hellim, Kıbrıs mezesi, molehiya, kolokas, pirohu, hellimli pide, macun (ceviz, turunç), gullurikya. Mağusa'da Petek Pastanesi ünlüdür.
OCAK İKLİMİ: Son 11 yılda 24–30 Ocak arası gündüz ortalama 15,8 °C, gece 7,6 °C. Günlerin yaklaşık üçte biri yağmurlu. Gün batımı ~17:25.
MÜZELER: Kış saatleri her yıl ilan edilir (geçen kış 08:00–17:00, son giriş 16:00). Yaz 2026 Girne Kalesi tam bilet 150 TL, öğrenci 50 TL; kış 2026–27 ücretleri kesin değil.
`.trim();

const SYSTEM = `Sen Gün ailesinin Kıbrıs tatili için hazırlanmış uygulamanın sıcak, sabırlı ve pratik asistanısın. Yalnızca Türkçe yanıt ver.

Üslup:
- Kısa ve sade yaz: çoğu yanıt 2–5 cümle. Ayrıntı istenirse en fazla 150 kelime.
- Telefonda, büyük yazıyla okunacak. Gerekirse en çok 4–5 maddelik kısa liste kullan, tablo kullanma.
- Kiminle konuştuğunu bil ve ona göre seslen. Birgül ile konuşurken "Birgül abla" diye hitap et; saygılı, sıcak, acele ettirmeyen bir dil kullan; teknik kelime ve kısaltma kullanma; saatleri ve yerleri net söyle. Çocuklarla (Umay, Uygar) neşeli ve basit konuş.
- Yanıtın sesli okunabilir; emoji ve sembolü az kullan.

İhtiyaçlara dikkat:
- Kişinin belirttiği ihtiyaçları (ör. merdiven zorluğu, çabuk yorulma, ilaç, soğuğa hassasiyet) HER öneride dikkate al. Zorlayıcı bir yer varsa açıkça söyle ve daha rahat bir seçenek öner (araçta/kafede bekleme, düz zeminli kısım, otelde dinlenme).
- Kişi bir ihtiyacından söz ederse (yorgunum, dizim ağrıyor, ilacımı unuttum) önce onu dinle ve pratik çözüm sun. Bilmediğin önemli bir ihtiyaç olabilecekse nazikçe tek bir soru sor.
- İlaç: Ne zaman alınacağını hatırlamaya yardım edebilirsin ama doz ya da ilaç önerisi verme; doktor/eczacıya yönlendir. Acil belirtilerde (göğüs ağrısı, nefes darlığı, bayılma, ani konuşma bozukluğu) hemen 112'yi aramasını söyle.

Doğruluk:
- Aşağıdaki gezi bilgileri ve uygulamanın gönderdiği güncel bağlam (tarih, saat, program, hava) senin kaynağındır. Bunlarda olmayan bilgiyi uydurma; emin değilsen "emin değilim" de ve nereden öğrenileceğini söyle (otel resepsiyonu, araç firması, resmi site).
- Rezervasyon kodu, PNR, bilet numarası, kimlik numarası sorulursa bunları bilmediğini, uygulamadaki "Bilgiler → Rezervasyon kodları" bölümünde aile şifresiyle açılabileceğini söyle.
- Tatille ilgisi olmayan talepleri kibarca kısaca geri çevir.

GEZİ BİLGİLERİ:
${TRIP}`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "POST") return reply({ error: "Yalnızca POST kabul edilir." }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return reply({ error: "Bu adresten soru kabul edilmiyor." }, 403, origin);
    if (!env.ANTHROPIC_API_KEY) return reply({ error: "Asistan henüz yapılandırılmadı." }, 500, origin);

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
    if (recent.length >= PER_MINUTE) return reply({ error: "Çok sık soru geldi, bir dakika sonra tekrar deneyin." }, 429, origin);
    recent.push(now); hits.set(ip, recent);

    let data;
    try { data = await request.json(); } catch { return reply({ error: "Geçersiz istek." }, 400, origin); }

    // Sohbet geçmişi: son 10 mesaj, user ile başlayıp user ile bitmeli
    let msgs = (Array.isArray(data?.messages) ? data.messages : [])
      .filter(m => m && (m.role === "user" || m.role === "assistant"))
      .slice(-10)
      .map(m => ({ role: m.role, content: clip(m.content, m.role === "user" ? 500 : 1500) }))
      .filter(m => m.content.trim());
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return reply({ error: "Soru boş." }, 400, origin);

    const c = data?.context || {};
    const who = c.person?.name ? `Şu an soran: ${clip(c.person.name, 20)}${c.person.kid ? " (çocuk)" : ""}.` : "Soran kişi belirtilmedi.";
    const needs = Array.isArray(c.needs) && c.needs.length ? `Bu kişinin belirttiği ihtiyaçlar: ${c.needs.slice(0, 10).map(n => clip(n, 60)).join("; ")}.` : "Bu kişi henüz özel bir ihtiyaç belirtmedi.";
    const ctx = `GÜNCEL BAĞLAM (uygulamadan):
Şu an: ${clip(c.now, 40)} (Türkiye/Kıbrıs saati UTC+3). Bugün: ${clip(c.today, 12)}. ${Number.isInteger(c.dayIndex) && c.dayIndex >= 0 ? `Tatilin ${c.dayIndex + 1}. günü.` : "Tatil günlerinden biri değil."}
${who} ${needs}
${c.weatherNow ? "Anlık hava: " + clip(c.weatherNow, 120) : ""}
Günlük hava (tahmin ya da geçmiş ortalama):
${clip(c.weatherDays, 1500)}
PROGRAM:
${clip(c.plan, 5000)}`;

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM + "\n\n" + ctx, messages: msgs }),
      });
      const out = await r.json();
      if (!r.ok) return reply({ error: "Asistan şu an yanıt veremiyor. Biraz sonra tekrar deneyin." }, 502, origin);
      let text = (out.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (out.stop_reason === "max_tokens") {
        const cut = Math.max(text.lastIndexOf(". "), text.lastIndexOf(".\n"), text.lastIndexOf("? "), text.lastIndexOf("! "));
        if (cut > text.length * 0.5) text = text.slice(0, cut + 1);
      }
      return reply({ text: text || "Bu soruya yanıt üretemedim." }, 200, origin);
    } catch {
      return reply({ error: "Asistana ulaşılamadı." }, 502, origin);
    }
  },
};
