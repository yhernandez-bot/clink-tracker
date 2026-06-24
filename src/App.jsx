import { useState, useEffect, useCallback } from "react";

const TG_KEY = "clink-tg-config";
const ANTHROPIC_WORKER = "https://clink-anthropic.yayitou.workers.dev";
const WORKER_URL = "https://clink-telegram.yayitou.workers.dev";
const SUPABASE_URL = "https://dnphngdkphylfvgsxmui.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucGhuZ2RrcGh5bGZ2Z3N4bXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwNzIsImV4cCI6MjA4OTgwMzA3Mn0.Qyqj-ImZ6pg_G4kieMQdRaZBmZhODCamFhsQS6xKp1w";

const sbHeaders = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation"
};

async function sbGetSets() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sets?order=id`, { headers: sbHeaders });
  const data = await r.json();
  return data.map(s => ({
    id: s.id,
    name: s.name,
    sku: s.sku,
    asin: s.asin || "",
    img: s.img || "",
    minDiscount: s.min_discount || 30,
    avg90: s.avg90,
    min90: s.min90,
    notes: s.notes || "",
    originalPrice: s.original_price || null,
    lastSent: s.last_sent || null,
    priceData: s.price_data || null,

    retiringYear: s.retiring_year || "",
    retiringMonth: s.retiring_month || "",
    retiringStatus: s.retiring_status || "",
    retiringSource: s.retiring_source || "",
    retiringSentAt: s.retiring_sent_at || null,

    releaseYear: s.release_year || "",
    releaseMonth: s.release_month || "",
    releaseStatus: s.release_status || "",
    releaseSource: s.release_source || "",
    releaseSentAt: s.release_sent_at || null,

    externalStore: s.external_store || "",
    externalPrice: s.external_price || "",
    externalUrl: s.external_url || "",
    externalCheckedAt: s.external_checked_at || null,
    externalNote: s.external_note || ""
  }));
}

async function sbAddSet(set) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sets`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify({
      name: set.name,
      sku: set.sku,
      asin: set.asin,
      img: set.img,
      min_discount: set.minDiscount,
      avg90: set.avg90,
      min90: set.min90,
      notes: set.notes,
      original_price: set.originalPrice || null,

      retiring_year: set.retiringYear ? parseInt(set.retiringYear) : null,
      retiring_month: set.retiringMonth ? parseInt(set.retiringMonth) : null,
      retiring_status: set.retiringStatus || null,
      retiring_source: set.retiringSource || null,

      release_year: set.releaseYear ? parseInt(set.releaseYear) : null,
      release_month: set.releaseMonth ? parseInt(set.releaseMonth) : null,
      release_status: set.releaseStatus || null,
      release_source: set.releaseSource || null,

      external_store: set.externalStore || null,
      external_price: set.externalPrice ? parseFloat(set.externalPrice) : null,
      external_url: set.externalUrl || null,
      external_checked_at: set.externalCheckedAt || null,
      external_note: set.externalNote || null
    })
  });
  const data = await r.json();
  return data[0];
}

async function sbUpdateSet(set) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${set.id}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify({
      name: set.name,
      sku: set.sku,
      asin: set.asin,
      img: set.img,
      min_discount: set.minDiscount,
      avg90: set.avg90,
      min90: set.min90,
      notes: set.notes,
      original_price: set.originalPrice || null,

      retiring_year: set.retiringYear ? parseInt(set.retiringYear) : null,
      retiring_month: set.retiringMonth ? parseInt(set.retiringMonth) : null,
      retiring_status: set.retiringStatus || null,
      retiring_source: set.retiringSource || null,

      release_year: set.releaseYear ? parseInt(set.releaseYear) : null,
      release_month: set.releaseMonth ? parseInt(set.releaseMonth) : null,
      release_status: set.releaseStatus || null,
      release_source: set.releaseSource || null,

      external_store: set.externalStore || null,
      external_price: set.externalPrice ? parseFloat(set.externalPrice) : null,
      external_url: set.externalUrl || null,
      external_checked_at: set.externalCheckedAt || null,
      external_note: set.externalNote || null
    })
  });
}

async function sbUpdatePriceData(id, priceData) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${id}`, {
    method: "PATCH", headers: sbHeaders,
    body: JSON.stringify({ price_data: priceData })
  });
}

async function sbUpdateLastSent(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${id}`, {
    method: "PATCH", headers: sbHeaders,
    body: JSON.stringify({ last_sent: new Date().toISOString() })
  });
}

async function sbDeleteSet(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${id}`, {
    method: "DELETE",
    headers: sbHeaders
  });
}

function discountBadge(pct) {
  const p = Number(pct) || 0;
  if (p >= 60) return "🔥";
  if (p >= 40) return "💥";
  if (p >= 25) return "✅";
  return "💸";
}

function fmtPrice(n) {
  if (!n) return "";
  return "$" + Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function canonicalUrl(asin) {
  return asin ? `https://www.amazon.com.mx/dp/${asin}` : null;
}

function trackedUrl(set, d) {
  const directUrl = d?.url || canonicalUrl(set.asin);
  if (!directUrl) return null;

  return `https://clink-click.yayitou.workers.dev/r?slug=alert-${set.id}-${Date.now()}&url=${encodeURIComponent(directUrl)}&source=telegram&campaign=alerts_daily&post_type=alert&set_id=${set.id}`;
}

function getDiscount(d) {
  if (!d) return null;
  if (d.discount) return d.discount;
  if (d.originalPrice && d.price) return Math.round((1 - d.price / d.originalPrice) * 100);
  return null;
}

function isAlert(set, d) {
  if (!d?.found || !d.price) return false;
  const price = d.price;
  if (set.avg90 || set.min90) {
    if (set.avg90 && set.min90 && price === set.avg90 && price === set.min90) return false;
    const isNewLow = set.min90 ? price <= set.min90 : false;
    const isBelowAvg = set.avg90 ? price < (set.avg90 - 1) : false;
    return isNewLow || isBelowAvg;
  }
  const disc = getDiscount(d);
  const originalPrice = set.originalPrice || d.originalPrice;
  if (originalPrice && price >= originalPrice) return false;
  return disc != null && disc >= set.minDiscount;
}

function evaluateExternalDeal(set, d) {
  const externalPrice = Number(set.externalPrice);
  if (!externalPrice || !set.externalStore) return null;

  const amazonPrice = d?.found && d?.price ? Number(d.price) : null;
  const avg90 = set.avg90 ? Number(set.avg90) : null;
  const min90 = set.min90 ? Number(set.min90) : null;

  if (amazonPrice && externalPrice >= amazonPrice) {
    return {
      approved: false,
      reason: "Amazon sigue siendo mejor precio hoy",
      status: "reject"
    };
  }

  const belowAvgPct = avg90
    ? Math.round(((avg90 - externalPrice) / avg90) * 100)
    : null;

  if (min90 && externalPrice <= min90) {
    return {
      approved: true,
      reason: "Debajo del mínimo 90d de Amazon",
      status: "new_low",
      belowAvgPct
    };
  }

  if (belowAvgPct != null && belowAvgPct >= 8) {
    return {
      approved: true,
      reason: `Caída fuerte vs promedio 90d Amazon (-${belowAvgPct}%)`,
      status: "strong"
    };
  }

  if (avg90 && externalPrice < avg90) {
    return {
      approved: true,
      reason: "Debajo del promedio 90d de Amazon",
      status: "good",
      belowAvgPct
    };
  }

  return {
    approved: false,
    reason: "No mejora lo suficiente contra el histórico Amazon",
    status: "reject"
  };
}

function buildCaption(set, d) {
  const externalEval = evaluateExternalDeal(set, d);
  const useExternal = externalEval?.approved && set.externalStore && set.externalPrice;

  const price = useExternal ? Number(set.externalPrice) : d.price;
  const pct = useExternal
    ? null
    : getDiscount(d);

  const url = useExternal
    ? (set.externalUrl || "")
    : (trackedUrl(set, d) || "");

  const line2 = [
    fmtPrice(price),
    useExternal
      ? `🏪 ${String(set.externalStore || "").toUpperCase()}`
      : (pct != null && pct > 0 ? `${discountBadge(pct)} -${pct}%` : null)
  ]
    .filter(Boolean)
    .join(" · ");

  const diffVsAvg = (set.avg90 && price)
    ? Math.round(((set.avg90 - price) / set.avg90) * 100)
    : null;

  const isNewLow = set.min90 && price ? price <= set.min90 : false;
  const isCaidaFuerte = diffVsAvg != null && diffVsAvg >= (set.minDiscount || 3);
  const isBuenPrecio = set.avg90 && price < (set.avg90 - 1);

  let tag = "";

  if (useExternal) {
    if (externalEval.status === "new_low") tag = "🔥 NUEVO MÍNIMO VS AMAZON";
    else if (externalEval.status === "strong") tag = "💥 CAÍDA FUERTE VS AMAZON";
    else if (externalEval.status === "good") tag = "✅ MEJOR QUE AMAZON";
  } else {
    if (isNewLow) tag = "🔥 NUEVO MÍNIMO 90D";
    else if (isCaidaFuerte) tag = "💥 CAÍDA FUERTE";
    else if (isBuenPrecio) tag = "✅ BUEN PRECIO";
  }

const shareCta =
  tag === "🔥 NUEVO MÍNIMO 90D"
    ? "Si conoces a alguien que estaba esperando este set, se lo puedes pasar."
    : null;

const extras = [
  tag || null,
  set.avg90 ? `📊 Prom 90d Amazon: ${fmtPrice(set.avg90)}${diffVsAvg != null ? ` (-${diffVsAvg}%)` : ""}` : null,
  set.min90 ? `📉 Mín Amazon: ${fmtPrice(set.min90)}` : null,
  useExternal && d?.price ? `🛒 Amazon hoy: ${fmtPrice(d.price)}` : null,
  set.notes ? `🧠 ${set.notes}` : null,
  useExternal && set.externalNote ? `🏷️ ${set.externalNote}` : null,
  shareCta
].filter(Boolean);

  return {
    text: [`🧱 ${set.name}`, line2, ...extras].filter(Boolean).join("\n").slice(0, 900),
    url
  };
}

async function sendToTelegram(botToken, chatId, set, d) {
  const { text, url } = buildCaption(set, d);
  const img = set.img?.trim();

  const externalEval = evaluateExternalDeal(set, d);
  const useExternal = externalEval?.approved && set.externalStore && set.externalPrice;

  if (useExternal && !set.externalUrl) {
  throw new Error("Falta la URL de la tienda externa");
}

  const buttonLabel = useExternal
    ? `Ver en ${String(set.externalStore || "").toUpperCase()}`
    : "Ver en Amazon";

  const reply_markup = { inline_keyboard: [[{ text: buttonLabel, url }]] };

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      botToken,
      chatId,
      text: img ? text : text + "\n" + url,
      photo: img || null,
      reply_markup
    })
  });

  const json = await res.json();
  if (!json.ok) throw new Error(json.description || "Error Telegram");
  return json;
}

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDuplicate(newSet, sets) {
  const sku = (newSet.sku || "").trim();
  const asin = (newSet.asin || "").trim().toUpperCase();
  const name = normalizeText(newSet.name);

  const sameSku = sets.find(s => (s.sku || "").trim() === sku);
  if (sameSku) return { type: "sku", match: sameSku };

  const sameAsin = asin
    ? sets.find(s => (s.asin || "").trim().toUpperCase() === asin)
    : null;
  if (sameAsin) return { type: "asin", match: sameAsin };

  const sameName = sets.find(s => normalizeText(s.name) === name);
  if (sameName) return { type: "name", match: sameName };

  return null;
}

function TelegramConfig({ config, onSave, onClose }) {
  const [token, setToken] = useState(config.botToken || "");
  const [chatId, setChatId] = useState(config.chatId || "");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const inp = {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #333",
    color: "#e0e0e0",
    padding: "10px 12px",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 13,
    outline: "none"
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const r = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: token, chatId, text: "🧱 CLINK tracker conectado ✅" })
      });
      const j = await r.json();
      setResult(j.ok ? "ok" : j.description || "error");
    } catch (e) {
      setResult(e.message);
    }
    setTesting(false);
  };

  return (
    <div style={{ background: "#111", borderBottom: "1px solid #222", padding: 16 }}>
      <div style={{ fontSize: 11, color: "#2AABEE", letterSpacing: 2, marginBottom: 12 }}>
        ✈ CONFIGURACIÓN TELEGRAM
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>BOT TOKEN</div>
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            type="password"
            placeholder="123456:ABC..."
            style={inp}
          />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>CHAT ID / @canal</div>
          <input
            value={chatId}
            onChange={e => setChatId(e.target.value)}
            placeholder="@CLINK_MX"
            style={inp}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={test}
            disabled={testing || !token || !chatId}
            style={{ flex: 1, background: "#1a1a1a", color: "#aaa", border: "1px solid #333", padding: 10, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}
          >
            {testing ? "PROBANDO…" : "PROBAR"}
          </button>
          <button
            onClick={() => onSave({ botToken: token, chatId })}
            style={{ flex: 2, background: "#2AABEE", color: "#000", border: "none", padding: 10, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}
          >
            GUARDAR
          </button>
          <button
            onClick={onClose}
            style={{ background: "#222", color: "#888", border: "none", padding: "10px 14px", borderRadius: 6, fontSize: 14, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      </div>
      {result && (
        <div style={{ marginTop: 10, fontSize: 12, color: result === "ok" ? "#2ecc71" : "#ff5555" }}>
          {result === "ok" ? "✓ Mensaje enviado" : `✗ ${result}`}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: "#555" }}>
        El bot debe ser admin del canal para publicar
      </div>
    </div>
  );
}

function PreviewModal({ set, d, onSend, onClose, sending, sent }) {
  const { text } = buildCaption(set, d);
  const img = set.img?.trim();
  const externalEval = evaluateExternalDeal(set, d);
  const useExternal = externalEval?.approved && set.externalStore && set.externalPrice;
  const ctaLabel = useExternal
  ? `Ver en ${String(set.externalStore || "").toUpperCase()} ↗`
  : "Ver en Amazon ↗";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#141414", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 14 }}>PREVIEW · @CLINK_MX</div>
        <div style={{ background: "#1c2b1c", border: "1px solid #2a3a2a", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {img && <img src={img} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} onError={e => e.target.style.display = "none"} />}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#e8e8e8", whiteSpace: "pre-line", lineHeight: 1.7, fontFamily: "system-ui" }}>
              {text}
            </div>
            <a
  href={buildCaption(set, d).url}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    marginTop: 12,
    background: "#2a3a2a",
    borderRadius: 6,
    padding: "8px 14px",
    display: "inline-block",
    fontSize: 13,
    color: "#8bc89a",
    textDecoration: "none"
  }}
>
  {ctaLabel}
</a>
          </div>
        </div>
        {img && <div style={{ fontSize: 10, color: "#555", marginBottom: 10 }}>📷 Se enviará con imagen</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#222", color: "#aaa", border: "none", padding: 14, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            CANCELAR
          </button>
          <button
            onClick={onSend}
            disabled={sending || sent}
            style={{ flex: 2, background: sent ? "#2ecc71" : "#2AABEE", color: "#000", border: "none", padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: sending ? 0.6 : 1 }}
          >
            {sent ? "✓ ENVIADO" : sending ? "ENVIANDO…" : "✈ PUBLICAR EN CANAL"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetCard({ set, d, status, onCheck, onSend, onRemove, onEdit, onManualPrice, loadingId, tgSt, onCooldown }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ ...set });
  const [manualPrice, setManualPrice] = useState("");
  const [manualOriginal, setManualOriginal] = useState("");
  const [showManual, setShowManual] = useState(false);

  const discount = getDiscount(d);
  const hasAlert = isAlert(set, d);
  const externalEval = evaluateExternalDeal(set, d);
  const isLoading = loadingId === set.id;
  const statusColor = { idle: "#555", loading: "#f0a500", alert: "#2ecc71", ok: "#2ecc71" }[status] || "#555";

  const timeAgo = (iso) => {
    if (!iso) return "sin revisar";
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    return `hace ${Math.floor(diff / 3600)}h`;
  };

  const inp = {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #333",
    color: "#e0e0e0",
    padding: "8px 10px",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 12,
    outline: "none"
  };

  const saveManual = () => {
    const p = parseFloat(manualPrice);
    const o = parseFloat(manualOriginal) || set.originalPrice || null;
    if (!p) return;
    const disc = o ? Math.round((1 - p / o) * 100) : null;
    onManualPrice({
      found: true,
      price: p,
      originalPrice: o || null,
      discount: disc,
      url: canonicalUrl(set.asin),
      availability: "Manual",
      checkedAt: new Date().toISOString()
    });
    setShowManual(false);
    setManualPrice("");
    setManualOriginal("");
  };

  if (editing) {
    return (
      <div style={{ background: "#161616", border: "1px solid #333", borderRadius: 10, padding: 16, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#f0a500", letterSpacing: 2, marginBottom: 12 }}>EDITAR SET</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>NOMBRE</div>
            <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>SKU</div>
              <input value={editData.sku} onChange={e => setEditData({ ...editData, sku: e.target.value })} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>% CAÍDA FUERTE</div>
              <input value={editData.minDiscount} onChange={e => setEditData({ ...editData, minDiscount: e.target.value })} type="number" style={inp} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>ASIN</div>
            <input value={editData.asin || ""} onChange={e => setEditData({ ...editData, asin: e.target.value })} style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>URL IMAGEN</div>
            <input value={editData.img || ""} onChange={e => setEditData({ ...editData, img: e.target.value })} placeholder="https://..." style={inp} />
          </div>
          {editData.img && <img src={editData.img} alt="" style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6, background: "#111" }} onError={e => e.target.style.display = "none"} />}
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>PRECIO ORIGINAL $MXN</div>
            <input value={editData.originalPrice || ""} onChange={e => setEditData({ ...editData, originalPrice: e.target.value })} placeholder="1799" type="number" style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>PROM 90D</div>
              <input value={editData.avg90 || ""} onChange={e => setEditData({ ...editData, avg90: e.target.value })} type="number" style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>MÍN</div>
              <input value={editData.min90 || ""} onChange={e => setEditData({ ...editData, min90: e.target.value })} type="number" style={inp} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>NOTA</div>
            <input value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Rara vez baja de $4k" style={inp} />
          </div>
          <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #222" }}>
  <div style={{ fontSize: 9, color: "#666", marginBottom: 8 }}>RETIRED SOON</div>

  <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>AÑO</div>
      <input
        value={editData.retiringYear || ""}
        onChange={e => setEditData({ ...editData, retiringYear: e.target.value })}
        type="number"
        placeholder="2026"
        style={inp}
      />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>MES</div>
      <input
        value={editData.retiringMonth || ""}
        onChange={e => setEditData({ ...editData, retiringMonth: e.target.value })}
        type="number"
        min="1"
        max="12"
        placeholder="12"
        style={inp}
      />
    </div>
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>STATUS</div>
    <input
      value={editData.retiringStatus || ""}
      onChange={e => setEditData({ ...editData, retiringStatus: e.target.value })}
      placeholder="tracked o confirmed"
      style={inp}
    />
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>SOURCE</div>
    <input
      value={editData.retiringSource || ""}
      onChange={e => setEditData({ ...editData, retiringSource: e.target.value })}
      placeholder="brickset"
      style={inp}
    />
  </div>
</div>

<div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #222" }}>
  <div style={{ fontSize: 9, color: "#666", marginBottom: 8 }}>LAUNCHES</div>

  <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>AÑO</div>
      <input
        value={editData.releaseYear || ""}
        onChange={e => setEditData({ ...editData, releaseYear: e.target.value })}
        type="number"
        placeholder="2026"
        style={inp}
      />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>MES</div>
      <input
        value={editData.releaseMonth || ""}
        onChange={e => setEditData({ ...editData, releaseMonth: e.target.value })}
        type="number"
        min="1"
        max="12"
        placeholder="8"
        style={inp}
      />
    </div>
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>STATUS</div>
    <input
      value={editData.releaseStatus || ""}
      onChange={e => setEditData({ ...editData, releaseStatus: e.target.value })}
      placeholder="tracked o confirmed"
      style={inp}
    />
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>SOURCE</div>
    <input
      value={editData.releaseSource || ""}
      onChange={e => setEditData({ ...editData, releaseSource: e.target.value })}
      placeholder="lego o brickset"
      style={inp}
    />
  </div>
</div>

<div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #222" }}>
  <div style={{ fontSize: 9, color: "#666", marginBottom: 8 }}>OTRA TIENDA</div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>TIENDA</div>
    <input
      value={editData.externalStore || ""}
      onChange={e => setEditData({ ...editData, externalStore: e.target.value })}
      placeholder="walmart o lego"
      style={inp}
    />
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>PRECIO</div>
    <input
      value={editData.externalPrice || ""}
      onChange={e => setEditData({ ...editData, externalPrice: e.target.value })}
      type="number"
      placeholder="1799"
      style={inp}
    />
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>URL</div>
    <input
      value={editData.externalUrl || ""}
      onChange={e => setEditData({ ...editData, externalUrl: e.target.value })}
      placeholder="https://..."
      style={inp}
    />
  </div>

  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>NOTA</div>
    <input
      value={editData.externalNote || ""}
      onChange={e => setEditData({ ...editData, externalNote: e.target.value })}
      placeholder="Mejor que Amazon hoy"
      style={inp}
    />
  </div>
</div>
          
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setEditing(false)} style={{ flex: 1, background: "#1a1a1a", color: "#888", border: "1px solid #333", padding: 10, borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
              CANCELAR
            </button>
            <button
              onClick={() => {
  onEdit({
    ...editData,
    minDiscount: parseInt(editData.minDiscount) || 30,
    avg90: parseFloat(editData.avg90) || null,
    min90: parseFloat(editData.min90) || null,
    originalPrice: parseFloat(editData.originalPrice) || null,
    retiringYear: editData.retiringYear || "",
    retiringMonth: editData.retiringMonth || "",
    retiringStatus: editData.retiringStatus || "",
    retiringSource: editData.retiringSource || "",
    releaseYear: editData.releaseYear || "",
    releaseMonth: editData.releaseMonth || "",
    releaseStatus: editData.releaseStatus || "",
    releaseSource: editData.releaseSource || "",
    externalStore: editData.externalStore || "",
    externalPrice: editData.externalPrice || "",
    externalUrl: editData.externalUrl || "",
    externalCheckedAt: editData.externalPrice ? new Date().toISOString() : "",
    externalNote: editData.externalNote || ""
  });
  setEditing(false);
}}
              style={{ flex: 2, background: "#f0a500", color: "#000", border: "none", padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}
            >
              GUARDAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: hasAlert ? "rgba(46,204,113,0.06)" : "#111", border: `1px solid ${hasAlert ? "#2ecc7155" : "#1e1e1e"}`, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
     {set.img && (
  <img
    src={set.img}
    alt={set.name}
    style={{
      width: "100%",
      height: 220,
      objectFit: "contain",
      display: "block",
      background: "#0b0b0b",
      padding: 8
    }}
    onError={e => e.target.style.display = "none"}
  />
)}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div onClick={() => setEditing(true)} style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0, marginTop: 5, boxShadow: hasAlert ? "0 0 8px #2ecc71" : "none", display: "inline-block", animation: isLoading ? "pulse 1s infinite" : "none" }} />
            <div style={{ minWidth: 0 }}>
  <div style={{ fontSize: 14, fontWeight: 700, color: hasAlert ? "#2ecc71" : "#e0e0e0", lineHeight: 1.3 }}>
    {set.name}
  </div>

  {set.retiringYear && set.retiringMonth && (
    <div style={{ marginTop: 6 }}>
      <span
        style={{
          background: "#3a2a0a",
          color: "#f0c15a",
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: 999,
          letterSpacing: 1,
          fontWeight: 700
        }}
      >
        ⏳ RETIRA {set.retiringMonth}/{set.retiringYear}
      </span>
    </div>
  )}

  {set.releaseYear && set.releaseMonth && (
  <div style={{ marginTop: 6 }}>
    <span
      style={{
        background: "#0a2a3a",
        color: "#7fe7ff",
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 999,
        letterSpacing: 1,
        fontWeight: 700
      }}
    >
      🆕 SALE {set.releaseMonth}/{set.releaseYear}
    </span>
  </div>
)}

  <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
    #{set.sku} · caída fuerte ≥{set.minDiscount}% · {timeAgo(d?.checkedAt)} · <span style={{ color: "#444" }}>toca para editar</span>
  </div>
              {d?.error && <div style={{ fontSize: 11, color: "#ff5555", marginTop: 2 }}>⚠ Error al buscar precio</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onCheck} disabled={isLoading} style={{ background: "#1e1e1e", color: "#bbb", border: "1px solid #333", width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isLoading ? "…" : "↻"}
            </button>
            {d?.found && d.price && (
              <button
                onClick={onSend}
                disabled={tgSt === "sending" || onCooldown}
                style={{ background: tgSt === "sent" ? "#0a2a10" : tgSt === "error" ? "#2a0a0a" : onCooldown ? "#1a1a1a" : hasAlert ? "#0a1825" : "#1a1a1a", color: tgSt === "sent" ? "#2ecc71" : tgSt === "error" ? "#ff5555" : onCooldown ? "#444" : hasAlert ? "#2AABEE" : "#777", border: `1px solid ${tgSt === "sent" ? "#1a4a2a" : tgSt === "error" ? "#4a1a1a" : onCooldown ? "#2a2a2a" : hasAlert ? "#1a3a52" : "#333"}`, width: 36, height: 36, borderRadius: 8, fontSize: onCooldown ? 10 : 16, cursor: onCooldown ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {tgSt === "sent" ? "✓" : tgSt === "sending" ? "…" : tgSt === "error" ? "✗" : onCooldown ? "⏳" : "✈"}
              </button>
            )}
            <button onClick={onRemove} style={{ background: "#2a1010", color: "#cc4444", border: "1px solid #441a1a", width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e1e1e" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 2 }}>PRECIO HOY</div>
            {isLoading ? (
              <div style={{ fontSize: 12, color: "#f0a500" }}>buscando…</div>
            ) : d?.found && d.price ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: hasAlert ? "#2ecc71" : "#ccc", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
                {fmtPrice(d.price)}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#444" }}>—</div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 2 }}>DESCUENTO</div>
            {discount != null ? (
              <div style={{ fontSize: 20, fontWeight: 700, color: hasAlert ? "#2ecc71" : "#f0a500", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
                −{discount}%
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#444" }}>—</div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 2 }}>ORIG.</div>
            {d?.originalPrice ? (
              <div style={{ fontSize: 13, color: "#666", textDecoration: "line-through" }}>{fmtPrice(d.originalPrice)}</div>
            ) : (
              <div style={{ fontSize: 13, color: "#444" }}>—</div>
            )}
          </div>

          <div>
            {hasAlert ? (
              <span style={{ background: "#2ecc71", color: "#000", fontSize: 10, padding: "4px 8px", borderRadius: 4, letterSpacing: 1, fontWeight: 700 }}>
                ALERTA
              </span>
            ) : d?.found && discount != null ? (
              <span style={{ color: "#555", fontSize: 11 }}>min {set.minDiscount}%</span>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={() => setShowManual(!showManual)} style={{ background: "transparent", color: "#444", border: "none", fontSize: 11, cursor: "pointer", fontFamily: "monospace", padding: 0 }}>
            {showManual ? "▲ ocultar" : "✎ ingresar precio manual"}
          </button>
          {showManual && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#555", marginBottom: 3 }}>PRECIO ACTUAL</div>
                <input value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="1299" type="number" style={{ ...inp, fontSize: 13 }} />
              </div>
              {!set.originalPrice && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#555", marginBottom: 3 }}>PRECIO ORIGINAL</div>
                  <input value={manualOriginal} onChange={e => setManualOriginal(e.target.value)} placeholder="1999" type="number" style={{ ...inp, fontSize: 13 }} />
                </div>
              )}
              {set.originalPrice && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#555", marginBottom: 3 }}>PRECIO ORIGINAL</div>
                  <div style={{ fontSize: 13, color: "#666", padding: "8px 10px", background: "#111", borderRadius: 6, border: "1px solid #222" }}>
                    {fmtPrice(set.originalPrice)}
                  </div>
                </div>
              )}
              <button onClick={saveManual} style={{ background: "#f0a500", color: "#000", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
                OK
              </button>
            </div>
          )}
        </div>

        {externalEval && (
  <div
    style={{
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 8,
      background: externalEval.status === "reject" ? "#2a1010" : "#102416",
      border: externalEval.status === "reject" ? "1px solid #4a1a1a" : "1px solid #1f5a30",
      color: externalEval.status === "reject" ? "#ff7a7a" : "#7dff9b",
      fontSize: 11,
      lineHeight: 1.5
    }}
  >
    <div style={{ fontWeight: 700, marginBottom: 4 }}>
      {externalEval.status === "reject"
        ? "❌ OTRA TIENDA RECHAZADA"
        : externalEval.status === "new_low"
        ? "🔥 OTRA TIENDA APROBADA"
        : externalEval.status === "strong"
        ? "💥 OTRA TIENDA APROBADA"
        : "✅ OTRA TIENDA APROBADA"}
    </div>

    <div>{String(set.externalStore || "").toUpperCase()}: {fmtPrice(set.externalPrice)}</div>
    <div>{externalEval.reason}</div>
    {d?.price ? <div>Amazon hoy: {fmtPrice(d.price)}</div> : null}
  </div>
)}
        
        {d?.url && (
          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 8, fontSize: 11, color: "#f0a500", textDecoration: "none", opacity: 0.7 }}>
            Ver en Amazon ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function LEGOTracker() {
  const [sets, setSets] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showRetiringOnly, setShowRetiringOnly] = useState(false);
  const [showLaunchesOnly, setShowLaunchesOnly] = useState(false);
  const [showGwpForm, setShowGwpForm] = useState(false);
const [showSponsoredForm, setShowSponsoredForm] = useState(false);
const [showCodeForm, setShowCodeForm] = useState(false);
const [showPollForm, setShowPollForm] = useState(false);

const [codePreview, setCodePreview] = useState(null);
const [sponsoredPreview, setSponsoredPreview] = useState(null);
const [gwpPreview, setGwpPreview] = useState(null);
const [pollPreview, setPollPreview] = useState(null);

const [newCodePost, setNewCodePost] = useState({
  sponsorName: "",
  codeName: "",
  benefitDescription: "",
  endDate: "",
  url: "",
  note: "",
  img: ""
});

const [newSponsored, setNewSponsored] = useState({
  sponsorName: "",
  productName: "",
  img: "",
  productPrice: "",
  storeName: "",
  productUrl: "",
  editorialReason: "",
  disclaimer: "Contenido patrocinado. Seleccionado bajo criterio editorial Clink."
});

const [newPollPost, setNewPollPost] = useState({
  sponsorName: "",
  introCopy: "",
  pollQuestion: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  option5: ""
});
  
const [newGwp, setNewGwp] = useState({
  name: "",
  img: "",
  threshold: "",
  startDate: "",
  endDate: "",
  scope: "",
  url: "",
  note: ""
});
  const [loadingId, setLoadingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [showTgConfig, setShowTgConfig] = useState(false);
  const [tgConfig, setTgConfig] = useState({ botToken: "", chatId: "" });
  const [newSet, setNewSet] = useState({
  name: "",
  sku: "",
  minDiscount: "30",
  asin: "",
  img: "",
  avg90: "",
  min90: "",
  notes: "",
  originalPrice: "",
  retiringYear: "",
  retiringMonth: "",
  retiringStatus: "",
  retiringSource: "",
  releaseYear: "",
  releaseMonth: "",
  releaseStatus: "",
  releaseSource: "",
  externalStore: "",
  externalPrice: "",
  externalUrl: "",
  externalCheckedAt: "",
  externalNote: ""
});

  const [globalLoading, setGlobalLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [tgStatus, setTgStatus] = useState({});
  const [sentIds, setSentIds] = useState(new Set());
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    const savedTg = localStorage.getItem(TG_KEY);
    if (savedTg) setTgConfig(JSON.parse(savedTg));

    sbGetSets()
      .then(data => {
        setSets(data);
        const pd = {};
        data.forEach(s => {
          if (s.priceData) pd[s.id] = s.priceData;
        });
        setPriceData(pd);
        setDbLoading(false);
      })
      .catch(() => setDbLoading(false));
  }, []);

  const saveTgConfig = (c) => {
    setTgConfig(c);
    localStorage.setItem(TG_KEY, JSON.stringify(c));
    setShowTgConfig(false);
  };

  const checkPrice = useCallback(async (set) => {
    setLoadingId(set.id);
    try {
      const response = await fetch(ANTHROPIC_WORKER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `Eres un asistente que busca precios de sets LEGO en Amazon México (amazon.com.mx).
Responde ÚNICAMENTE con JSON válido sin markdown ni backticks:
{"found":true,"price":1234.56,"originalPrice":1234.56,"discount":10,"url":"https://www.amazon.com.mx/dp/ASIN","availability":"En stock","note":""}
discount es el porcentaje entero de descuento. Si no hay precio: found=false, price=null.`,
          messages: [{
            role: "user",
            content: `Busca precio actual del LEGO ${set.sku} "${set.name}" en Amazon México. ASIN: ${set.asin || "desconocido"}. Necesito precio actual Y precio original para calcular descuento.`
          }]
        })
      });

      const data = await response.json();

      if (data.error) {
        const pd = { error: true, errorMsg: data.error.message, checkedAt: new Date().toISOString() };
        setPriceData(prev => ({ ...prev, [set.id]: pd }));
        await sbUpdatePriceData(set.id, pd);
        setLoadingId(null);
        return;
      }

      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      let parsed = null;

      try {
        const m = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      } catch {}

      if (!parsed) {
        const pd = { error: true, errorMsg: "Sin respuesta", checkedAt: new Date().toISOString() };
        setPriceData(prev => ({ ...prev, [set.id]: pd }));
        await sbUpdatePriceData(set.id, pd);
        setLoadingId(null);
        return;
      }

      if (set.asin && (!parsed.url || !parsed.url.includes("amazon.com.mx"))) {
        parsed.url = canonicalUrl(set.asin);
      }

      const pd = { ...parsed, checkedAt: new Date().toISOString() };
      setPriceData(prev => ({ ...prev, [set.id]: pd }));
      await sbUpdatePriceData(set.id, pd);
      setLastCheck(new Date().toLocaleTimeString("es-MX"));
    } catch (err) {
      const pd = { error: true, errorMsg: err.message, checkedAt: new Date().toISOString() };
      setPriceData(prev => ({ ...prev, [set.id]: pd }));
      await sbUpdatePriceData(set.id, pd);
    }
    setLoadingId(null);
  }, []);

  const checkAll = async () => {
    setGlobalLoading(true);
    for (const set of sets) {
      await checkPrice(set);
      await new Promise(r => setTimeout(r, 3000));
    }
    setGlobalLoading(false);
  };

  const addSet = async () => {
    if (!newSet.name || !newSet.sku) return;

    const duplicate = findDuplicate(newSet, sets);

    if (duplicate?.type === "sku") {
      alert(`Ya tienes registrado este SKU: ${duplicate.match.name}`);
      return;
    }

    if (duplicate?.type === "asin") {
      alert(`Ya tienes registrado este ASIN: ${duplicate.match.name}`);
      return;
    }

    if (duplicate?.type === "name") {
      const ok = window.confirm(
        `Ya existe un set con el mismo nombre:\n\n${duplicate.match.name}\n\n¿Quieres guardarlo de todos modos?`
      );
      if (!ok) return;
    }

    const created = await sbAddSet({
      ...newSet,
      minDiscount: parseInt(newSet.minDiscount) || 30,
      avg90: parseFloat(newSet.avg90) || null,
      min90: parseFloat(newSet.min90) || null,
      originalPrice: parseFloat(newSet.originalPrice) || null
    });

    if (created) {
  setSets(prev => [
    ...prev,
    {
      ...created,
      minDiscount: created.min_discount,
      originalPrice: created.original_price,
      priceData: null,
      retiringYear: created.retiring_year || "",
      retiringMonth: created.retiring_month || "",
      retiringStatus: created.retiring_status || "",
      retiringSource: created.retiring_source || "",
      retiringSentAt: created.retiring_sent_at || null,
      releaseYear: created.release_year || "",
      releaseMonth: created.release_month || "",
      releaseStatus: created.release_status || "",
      releaseSource: created.release_source || "",
      releaseSentAt: created.release_sent_at || null,
      externalStore: created.external_store || "",
      externalPrice: created.external_price || "",
      externalUrl: created.external_url || "",
      externalCheckedAt: created.external_checked_at || null,
      externalNote: created.external_note || ""
    }
  ]);
}

    setNewSet({
  name: "",
  sku: "",
  minDiscount: "30",
  asin: "",
  img: "",
  avg90: "",
  min90: "",
  notes: "",
  originalPrice: "",
  retiringYear: "",
  retiringMonth: "",
  retiringStatus: "",
  retiringSource: "",
  releaseYear: "",
  releaseMonth: "",
  releaseStatus: "",
  releaseSource: "",
  externalStore: "",
  externalPrice: "",
  externalUrl: "",
  externalCheckedAt: "",
  externalNote: ""    
});
    setShowAdd(false);
    setShowExtra(false);
  };

  const editSet = async (updated) => {
    setSets(prev => prev.map(s => s.id === updated.id ? updated : s));
    await sbUpdateSet(updated);
  };

  const removeSet = async (id) => {
    setSets(prev => prev.filter(s => s.id !== id));
    setPriceData(prev => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    await sbDeleteSet(id);
  };

  const setManualPrice = async (id, priceObj) => {
    setPriceData(prev => ({ ...prev, [id]: priceObj }));
    await sbUpdatePriceData(id, priceObj);
  };

  const isOnCooldown = (set) => {
    if (!set.lastSent) return false;
    const daysSince = (Date.now() - new Date(set.lastSent)) / (1000 * 60 * 60 * 24);
    return daysSince < 4;
  };

  const handleSend = async (set, d) => {
    if (!tgConfig.botToken || !tgConfig.chatId) {
      setShowTgConfig(true);
      setPreview(null);
      return;
    }
    setSending(true);
    setTgStatus(s => ({ ...s, [set.id]: "sending" }));
    try {
      await sendToTelegram(tgConfig.botToken, tgConfig.chatId, set, d);
      await sbUpdateLastSent(set.id);
      setSets(prev => prev.map(s => s.id === set.id ? { ...s, lastSent: new Date().toISOString() } : s));
      setTgStatus(s => ({ ...s, [set.id]: "sent" }));
      setSentIds(prev => new Set([...prev, set.id]));
      setTimeout(() => setTgStatus(s => {
        const n = { ...s };
        delete n[set.id];
        return n;
      }), 4000);
    } catch {
      setTgStatus(s => ({ ...s, [set.id]: "error" }));
      setTimeout(() => setTgStatus(s => {
        const n = { ...s };
        delete n[set.id];
        return n;
      }), 4000);
    }
    setSending(false);
    setPreview(null);
  };

const handleSendSponsored = async () => {
  if (!tgConfig.botToken || !tgConfig.chatId || !sponsoredPreview) {
    setShowTgConfig(true);
    return;
  }

  setSending(true);

  try {
    const text = [
      "✨ HALLAZGO PATROCINADO",
      `Presentado por ${sponsoredPreview.sponsorName}`,
      "",
      `🧱 ${sponsoredPreview.productName}`,
      `💸 Precio: ${fmtPrice(sponsoredPreview.productPrice)}`,
      `🏪 Tienda: ${sponsoredPreview.storeName}`,
      `👀 ${sponsoredPreview.editorialReason}`,
      "",
      sponsoredPreview.disclaimer || "Contenido patrocinado. Seleccionado bajo criterio editorial Clink."
    ]
      .filter(Boolean)
      .join("\n");

    const reply_markup = {
      inline_keyboard: [[{ text: "Ver producto", url: sponsoredPreview.productUrl }]]
    };

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: tgConfig.botToken,
        chatId: tgConfig.chatId,
        text,
        photo: sponsoredPreview.img,
        reply_markup
      })
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.description || "Error Telegram");

    setSponsoredPreview(null);
    setShowSponsoredForm(false);
    setNewSponsored({
      sponsorName: "",
      productName: "",
      img: "",
      productPrice: "",
      storeName: "",
      productUrl: "",
      editorialReason: "",
      disclaimer: "Contenido patrocinado. Seleccionado bajo criterio editorial Clink."
    });
  } catch (e) {
    console.error(e);
  }

  setSending(false);
};

const handleSendCode = async () => {
  if (!tgConfig.botToken || !tgConfig.chatId || !codePreview) {
    setShowTgConfig(true);
    return;
  }

  setSending(true);

  try {
    const text = [
      "🏷️ CÓDIGO EXCLUSIVO CLINK",
      `Activado por ${codePreview.sponsorName}`,
      "",
      `Código: ${codePreview.codeName}`,
      `Beneficio: ${codePreview.benefitDescription}`,
      `Vigencia: ${codePreview.endDate}`,
      codePreview.note ? `👀 ${codePreview.note}` : null,
      "",
      "Contenido patrocinado. Beneficio disponible para la comunidad Clink."
    ]
      .filter(Boolean)
      .join("\n");

    const reply_markup = {
      inline_keyboard: [[{ text: "Ver beneficio", url: codePreview.url }]]
    };

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: tgConfig.botToken,
        chatId: tgConfig.chatId,
        text,
        photo: codePreview.img || null,
        reply_markup
      })
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.description || "Error Telegram");

    setCodePreview(null);
    setShowCodeForm(false);
    setNewCodePost({
      sponsorName: "",
      codeName: "",
      benefitDescription: "",
      endDate: "",
      url: "",
      note: "",
      img: ""
    });
  } catch (e) {
    console.error(e);
  }

  setSending(false);
};

const handleSendPoll = async () => {
  if (!tgConfig.botToken || !tgConfig.chatId || !pollPreview) {
    setShowTgConfig(true);
    return;
  }

  setSending(true);

  try {
    const introText = [
      "📊 ENCUESTA PATROCINADA",
      `Presentada por ${pollPreview.sponsorName}`,
      "",
      pollPreview.introCopy
    ]
      .filter(Boolean)
      .join("\n");

    const introRes = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: tgConfig.botToken,
        chatId: tgConfig.chatId,
        text: introText
      })
    });

    const introJson = await introRes.json();
    if (!introJson.ok) throw new Error(introJson.description || "Error Telegram intro");

    const options = [
      pollPreview.option1,
      pollPreview.option2,
      pollPreview.option3,
      pollPreview.option4,
      pollPreview.option5
    ].filter(Boolean);

    const pollRes = await fetch(`https://api.telegram.org/bot${tgConfig.botToken}/sendPoll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tgConfig.chatId,
        question: pollPreview.pollQuestion,
        options,
        is_anonymous: false,
        allows_multiple_answers: false
      })
    });

    const pollJson = await pollRes.json();
    if (!pollJson.ok) throw new Error(pollJson.description || "Error Telegram poll");

    setPollPreview(null);
    setShowPollForm(false);
    setNewPollPost({
      sponsorName: "",
      introCopy: "",
      pollQuestion: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      option5: ""
    });
  } catch (e) {
    console.error(e);
  }

  setSending(false);
};

const handleSendGwp = async () => {
  if (!tgConfig.botToken || !tgConfig.chatId || !gwpPreview) {
    setShowTgConfig(true);
    return;
  }

  setSending(true);

  try {
    const text = [
      "🎁 REGALO ACTIVO EN LEGO",
      `🧱 ${gwpPreview.name}`,
      `💸 Compras desde: ${fmtPrice(gwpPreview.threshold)}`,
      `📅 Vigencia: ${gwpPreview.startDate} al ${gwpPreview.endDate}`,
      `🏪 Aplica en: ${gwpPreview.scope}`,
      gwpPreview.note ? `👀 ${gwpPreview.note}` : null
    ]
      .filter(Boolean)
      .join("\n");

    const reply_markup = {
      inline_keyboard: [[{ text: "Ver promo en LEGO", url: gwpPreview.url }]]
    };

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: tgConfig.botToken,
        chatId: tgConfig.chatId,
        text,
        photo: gwpPreview.img,
        reply_markup
      })
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.description || "Error Telegram");

    setGwpPreview(null);
    setShowGwpForm(false);
    setNewGwp({
      name: "",
      img: "",
      threshold: "",
      startDate: "",
      endDate: "",
      scope: "",
      url: "",
      note: ""
    });
  } catch (e) {
    console.error(e);
  }

  setSending(false);
};
  
  const sendAllAlerts = async () => {
    if (!tgConfig.botToken || !tgConfig.chatId) {
      setShowTgConfig(true);
      return;
    }
    const alerts = sets.filter(s => isAlert(s, priceData[s.id]));
    for (const set of alerts) {
      await handleSend(set, priceData[set.id]);
      await new Promise(r => setTimeout(r, 700));
    }
  };

  const getStatus = (set) => {
    if (loadingId === set.id) return "loading";
    const d = priceData[set.id];
    if (!d || d.error || !d.found) return "idle";
    if (isAlert(set, d)) return "alert";
    return "ok";
  };

  const alertCount = sets.filter(s => isAlert(s, priceData[s.id])).length;
  const tgReady = !!(tgConfig.botToken && tgConfig.chatId);
  const filteredSets = sets.filter((set) => {
  const term = searchTerm.trim().toLowerCase();

  const matchesSearch =
    !term ||
    (set.name || "").toLowerCase().includes(term) ||
    (set.sku || "").toLowerCase().includes(term) ||
    (set.asin || "").toLowerCase().includes(term);

  const matchesRetiring =
    !showRetiringOnly || (set.retiringYear && set.retiringMonth);

  const matchesLaunches =
    !showLaunchesOnly || (set.releaseYear && set.releaseMonth);

  return matchesSearch && matchesRetiring && matchesLaunches;
});
  
  const inp = {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #333",
    color: "#e0e0e0",
    padding: "10px 12px",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 13,
    outline: "none"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Courier New', monospace", color: "#e0e0e0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cards-grid { display: grid; grid-template-columns: 1fr; gap: 0; padding: 16px; }
        @media (min-width: 768px) { .cards-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 24px; } }
        @media (min-width: 1200px) { .cards-grid { grid-template-columns: repeat(3, 1fr); } }
        .header-inner, .stats-inner, .cards-inner, .footer-inner { max-width: 1400px; margin: 0 auto; }
        .stats-inner { display: flex; }
      `}</style>

      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1e1e1e", padding: "14px 24px" }}>
        <div className="header-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 5, color: "#f0a500", lineHeight: 1 }}>
                CLINK
              </div>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: 3 }}>
                LEGO PRICE TRACKER · MX
              </div>
            </div>
            {lastCheck && <div style={{ fontSize: 10, color: "#555" }}>{lastCheck}</div>}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setShowTgConfig(!showTgConfig); setShowAdd(false); }}
              style={{ flex: 1, background: tgReady ? "#0a1e2e" : "#1a1a1a", color: tgReady ? "#2AABEE" : "#888", border: `1px solid ${tgReady ? "#1a3a52" : "#333"}`, padding: "10px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}
            >
              {tgReady ? "✈ TG ✓" : "✈ TELEGRAM"}
            </button>

            <button
              onClick={() => { setShowAdd(!showAdd); setShowTgConfig(false); }}
              style={{ flex: 1, background: "#1a1a1a", color: "#ccc", border: "1px solid #333", padding: "10px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}
            >
              {showAdd ? "✕ CANCELAR" : "+ SET"}
            </button>

          </div>

         {/* botón de envío masivo oculto por ahora */}
        </div>
      </div>

      {showTgConfig && <TelegramConfig config={tgConfig} onSave={saveTgConfig} onClose={() => setShowTgConfig(false)} />}

      {showAdd && (
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: 16 }}>
          <div style={{ fontSize: 11, color: "#f0a500", letterSpacing: 2, marginBottom: 12 }}>NUEVO SET</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOMBRE *</div>
              <input value={newSet.name} onChange={e => setNewSet({ ...newSet, name: e.target.value })} placeholder="LEGO Icons Colosseum" style={inp} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>SKU *</div>
                <input value={newSet.sku} onChange={e => setNewSet({ ...newSet, sku: e.target.value })} placeholder="10276" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>% CAÍDA FUERTE</div>
                <input value={newSet.minDiscount} onChange={e => setNewSet({ ...newSet, minDiscount: e.target.value })} placeholder="30" type="number" style={inp} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>ASIN</div>
              <input value={newSet.asin} onChange={e => setNewSet({ ...newSet, asin: e.target.value })} placeholder="B08HM3VTCZ" style={inp} />
            </div>

            <div>
              <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>URL IMAGEN</div>
              <input value={newSet.img} onChange={e => setNewSet({ ...newSet, img: e.target.value })} placeholder="https://m.media-amazon.com/images/..." style={inp} />
              {newSet.img && <img src={newSet.img} alt="" style={{ width: "100%", maxHeight: 100, objectFit: "contain", marginTop: 6, borderRadius: 4, background: "#0a0a0a" }} onError={e => e.target.style.display = "none"} />}
            </div>

            <button onClick={() => setShowExtra(!showExtra)} style={{ background: "#161616", color: "#666", border: "1px solid #222", padding: 8, borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
              {showExtra ? "▲ OCULTAR HISTÓRICOS" : "▼ + DATOS 90D / PRECIO ORIGINAL"}
            </button>

            {showExtra && (
  <>
    <div>
      <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>PRECIO ORIGINAL $MXN</div>
      <input value={newSet.originalPrice} onChange={e => setNewSet({ ...newSet, originalPrice: e.target.value })} placeholder="1799" type="number" style={inp} />
    </div>

    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>PROM 90D</div>
        <input value={newSet.avg90} onChange={e => setNewSet({ ...newSet, avg90: e.target.value })} type="number" style={inp} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MÍN</div>
        <input value={newSet.min90} onChange={e => setNewSet({ ...newSet, min90: e.target.value })} type="number" style={inp} />
      </div>
    </div>

    <div>
      <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOTA</div>
      <input value={newSet.notes} onChange={e => setNewSet({ ...newSet, notes: e.target.value })} placeholder="Rara vez baja de $4k" style={inp} />
    </div>

    <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #222" }}>
      <div style={{ fontSize: 10, color: "#777", marginBottom: 8 }}>RETIRED SOON</div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>AÑO</div>
          <input
            value={newSet.retiringYear}
            onChange={e => setNewSet({ ...newSet, retiringYear: e.target.value })}
            placeholder="2026"
            type="number"
            style={inp}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MES</div>
          <input
            value={newSet.retiringMonth}
            onChange={e => setNewSet({ ...newSet, retiringMonth: e.target.value })}
            placeholder="12"
            type="number"
            min="1"
            max="12"
            style={inp}
          />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>STATUS</div>
        <input
          value={newSet.retiringStatus}
          onChange={e => setNewSet({ ...newSet, retiringStatus: e.target.value })}
          placeholder="tracked o confirmed"
          style={inp}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>SOURCE</div>
        <input
          value={newSet.retiringSource}
          onChange={e => setNewSet({ ...newSet, retiringSource: e.target.value })}
          placeholder="brickset"
          style={inp}
        />
      </div>
    </div>

    <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #222" }}>
      <div style={{ fontSize: 10, color: "#777", marginBottom: 8 }}>LAUNCHES</div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>AÑO</div>
          <input
            value={newSet.releaseYear}
            onChange={e => setNewSet({ ...newSet, releaseYear: e.target.value })}
            placeholder="2026"
            type="number"
            style={inp}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MES</div>
          <input
            value={newSet.releaseMonth}
            onChange={e => setNewSet({ ...newSet, releaseMonth: e.target.value })}
            placeholder="8"
            type="number"
            min="1"
            max="12"
            style={inp}
          />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>STATUS</div>
        <input
          value={newSet.releaseStatus}
          onChange={e => setNewSet({ ...newSet, releaseStatus: e.target.value })}
          placeholder="tracked o confirmed"
          style={inp}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>SOURCE</div>
        <input
          value={newSet.releaseSource}
          onChange={e => setNewSet({ ...newSet, releaseSource: e.target.value })}
          placeholder="lego o brickset"
          style={inp}
        />
      </div>
    </div>
  </>
)}

            <button onClick={addSet} style={{ background: "#f0a500", color: "#000", border: "none", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
              GUARDAR SET
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "12px 24px", borderBottom: "1px solid #141414", background: "#080808" }}>
        <div className="stats-inner">
          {[
            { label: "SETS", val: sets.length },
            { label: "ALERTAS", val: alertCount, accent: true },
            { label: "HOY", val: Object.values(priceData).filter(d => d.checkedAt && new Date(d.checkedAt).toDateString() === new Date().toDateString()).length },
            { label: "ENVIADOS", val: sentIds.size, blue: true },
          ].map(({ label, val, accent, blue }) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: 2 }}>{label}</div>
              <div style={{ fontSize: 26, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, color: accent && val > 0 ? "#2ecc71" : blue && val > 0 ? "#2AABEE" : "#ccc" }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

<div style={{ padding: "16px 24px 0 24px" }}>
  <div className="cards-inner">
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar por nombre, SKU o ASIN..."
      style={{
        width: "100%",
        background: "#111",
        border: "1px solid #222",
        color: "#e0e0e0",
        padding: "12px 14px",
        borderRadius: 10,
        fontFamily: "monospace",
        fontSize: 13,
        outline: "none"
      }}
    />
  </div>
</div>

<div style={{ padding: "16px 24px 0 24px" }}>
  <div
    className="cards-inner"
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 16,
      alignItems: "start"
    }}
  >
    <div
      style={{
        background: "#0b0b0b",
        border: "1px solid #171717",
        borderRadius: 12,
        padding: 14
      }}
    >
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 4 }}>
        CONTENIDO EDITORIAL
      </div>
      <div style={{ fontSize: 11, color: "#444", marginBottom: 12 }}>
        Formatos propios del canal
      </div>

     <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
  <button
    onClick={() => setShowRetiringOnly(v => !v)}
    style={{
      background: showRetiringOnly ? "#3a2a0a" : "#111",
      color: showRetiringOnly ? "#f0c15a" : "#888",
      border: `1px solid ${showRetiringOnly ? "#5a4310" : "#222"}`,
      padding: "10px 14px",
      borderRadius: 10,
      fontFamily: "monospace",
      fontSize: 12,
      cursor: "pointer",
      textAlign: "left"
    }}
  >
    {showRetiringOnly ? "⏳ MOSTRANDO SOLO RETIRED SOON" : "⏳ FILTRAR SOLO RETIRED SOON"}
  </button>

  <button
    onClick={() => setShowLaunchesOnly(v => !v)}
    style={{
      background: showLaunchesOnly ? "#0f223a" : "#111",
      color: showLaunchesOnly ? "#7dc3ff" : "#888",
      border: `1px solid ${showLaunchesOnly ? "#1f4d7a" : "#222"}`,
      padding: "10px 14px",
      borderRadius: 10,
      fontFamily: "monospace",
      fontSize: 12,
      cursor: "pointer",
      textAlign: "left"
    }}
  >
    {showLaunchesOnly ? "🆕 MOSTRANDO SOLO LAUNCHES" : "🆕 FILTRAR SOLO LAUNCHES"}
  </button>

  <button
    onClick={() => setShowGwpForm(v => !v)}
    style={{
      background: showGwpForm ? "#2a1f0a" : "#111",
      color: showGwpForm ? "#ffd36b" : "#888",
      border: `1px solid ${showGwpForm ? "#5a4310" : "#222"}`,
      padding: "10px 14px",
      borderRadius: 10,
      fontFamily: "monospace",
      fontSize: 12,
      cursor: "pointer",
      textAlign: "left"
    }}
  >
    {showGwpForm ? "🎁 OCULTAR POST GWP" : "🎁 NUEVO POST GWP"}
  </button>
</div>
    </div>

    <div
      style={{
        background: "#0b0b0b",
        border: "1px solid #171717",
        borderRadius: 12,
        padding: 14
      }}
    >
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 2, marginBottom: 4 }}>
        FORMATOS PATROCINADOS
      </div>
      <div style={{ fontSize: 11, color: "#444", marginBottom: 12 }}>
        Activaciones de marca y formatos comerciales
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => setShowSponsoredForm(v => !v)}
          style={{
            background: showSponsoredForm ? "#241118" : "#111",
            color: showSponsoredForm ? "#ff8db2" : "#888",
            border: `1px solid ${showSponsoredForm ? "#5a1f33" : "#222"}`,
            padding: "10px 14px",
            borderRadius: 10,
            fontFamily: "monospace",
            fontSize: 12,
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          {showSponsoredForm ? "✨ OCULTAR HALLAZGO PATROCINADO" : "✨ NUEVO HALLAZGO PATROCINADO"}
        </button>

        <button
          onClick={() => setShowCodeForm(v => !v)}
          style={{
            background: showCodeForm ? "#1f1a2a" : "#111",
            color: showCodeForm ? "#c6a8ff" : "#888",
            border: `1px solid ${showCodeForm ? "#4b3a6a" : "#222"}`,
            padding: "10px 14px",
            borderRadius: 10,
            fontFamily: "monospace",
            fontSize: 12,
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          {showCodeForm ? "🏷️ OCULTAR CÓDIGO EXCLUSIVO" : "🏷️ NUEVO CÓDIGO EXCLUSIVO"}
        </button>

        <button
          onClick={() => setShowPollForm(v => !v)}
          style={{
            background: showPollForm ? "#13221f" : "#111",
            color: showPollForm ? "#7ee7c3" : "#888",
            border: `1px solid ${showPollForm ? "#245447" : "#222"}`,
            padding: "10px 14px",
            borderRadius: 10,
            fontFamily: "monospace",
            fontSize: 12,
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          {showPollForm ? "📊 OCULTAR ENCUESTA PATROCINADA" : "📊 NUEVA ENCUESTA PATROCINADA"}
        </button>
      </div>
    </div>
  </div>
</div>

{showGwpForm && (
  <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: 16, marginTop: 8 }}>
    <div style={{ fontSize: 11, color: "#ffd36b", letterSpacing: 2, marginBottom: 12 }}>
      🎁 NUEVO POST GWP
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOMBRE DEL REGALO *</div>
        <input
          value={newGwp.name}
          onChange={e => setNewGwp({ ...newGwp, name: e.target.value })}
          placeholder="Homenaje a Leonardo da Vinci"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>IMAGEN DEL REGALO *</div>
        <input
          value={newGwp.img}
          onChange={e => setNewGwp({ ...newGwp, img: e.target.value })}
          placeholder="https://..."
          style={inp}
        />
        {newGwp.img && (
          <img
            src={newGwp.img}
            alt=""
            style={{ width: "100%", maxHeight: 140, objectFit: "contain", marginTop: 6, borderRadius: 6, background: "#0a0a0a" }}
            onError={e => e.target.style.display = "none"}
          />
        )}
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>COMPRA MÍNIMA *</div>
        <input
          value={newGwp.threshold}
          onChange={e => setNewGwp({ ...newGwp, threshold: e.target.value })}
          placeholder="3265"
          type="number"
          style={inp}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>VIGENCIA INICIO *</div>
          <input
            value={newGwp.startDate}
            onChange={e => setNewGwp({ ...newGwp, startDate: e.target.value })}
            type="date"
            style={inp}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>VIGENCIA FIN *</div>
          <input
            value={newGwp.endDate}
            onChange={e => setNewGwp({ ...newGwp, endDate: e.target.value })}
            type="date"
            style={inp}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>APLICA EN *</div>
        <input
          value={newGwp.scope}
          onChange={e => setNewGwp({ ...newGwp, scope: e.target.value })}
          placeholder="novedades y exclusivos"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>URL DE LA PROMO *</div>
        <input
          value={newGwp.url}
          onChange={e => setNewGwp({ ...newGwp, url: e.target.value })}
          placeholder="https://www.lego.com/..."
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOTA EDITORIAL</div>
        <input
          value={newGwp.note}
          onChange={e => setNewGwp({ ...newGwp, note: e.target.value })}
          placeholder="Vale la pena si ya ibas por un set grande."
          style={inp}
        />
      </div>

      <button
        onClick={() => setGwpPreview({ ...newGwp })}
        disabled={!newGwp.name || !newGwp.img || !newGwp.threshold || !newGwp.startDate || !newGwp.endDate || !newGwp.scope || !newGwp.url}
        style={{
          background: "#ffd36b",
          color: "#000",
          border: "none",
          padding: 12,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "monospace",
          opacity: (!newGwp.name || !newGwp.img || !newGwp.threshold || !newGwp.startDate || !newGwp.endDate || !newGwp.scope || !newGwp.url) ? 0.5 : 1
        }}
      >
        PREVISUALIZAR POST GWP
      </button>
    </div>
  </div>
)}

{showSponsoredForm && (
  <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: 16, marginTop: 8 }}>
    <div style={{ fontSize: 11, color: "#ff8db2", letterSpacing: 2, marginBottom: 12 }}>
      ✨ NUEVO HALLAZGO PATROCINADO
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MARCA / SPONSOR *</div>
        <input
          value={newSponsored.sponsorName}
          onChange={e => setNewSponsored({ ...newSponsored, sponsorName: e.target.value })}
          placeholder="LEGO Store México"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOMBRE DEL PRODUCTO *</div>
        <input
          value={newSponsored.productName}
          onChange={e => setNewSponsored({ ...newSponsored, productName: e.target.value })}
          placeholder="Set, accesorio o promoción"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>IMAGEN *</div>
        <input
          value={newSponsored.img}
          onChange={e => setNewSponsored({ ...newSponsored, img: e.target.value })}
          placeholder="https://..."
          style={inp}
        />
        {newSponsored.img && (
          <img
            src={newSponsored.img}
            alt=""
            style={{ width: "100%", maxHeight: 140, objectFit: "contain", marginTop: 6, borderRadius: 6, background: "#0a0a0a" }}
            onError={e => e.target.style.display = "none"}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>PRECIO *</div>
          <input
            value={newSponsored.productPrice}
            onChange={e => setNewSponsored({ ...newSponsored, productPrice: e.target.value })}
            placeholder="1299"
            type="number"
            style={inp}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>TIENDA *</div>
          <input
            value={newSponsored.storeName}
            onChange={e => setNewSponsored({ ...newSponsored, storeName: e.target.value })}
            placeholder="LEGO / Amazon / Walmart"
            style={inp}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>URL DEL PRODUCTO *</div>
        <input
          value={newSponsored.productUrl}
          onChange={e => setNewSponsored({ ...newSponsored, productUrl: e.target.value })}
          placeholder="https://..."
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>POR QUÉ VALE LA PENA *</div>
        <input
          value={newSponsored.editorialReason}
          onChange={e => setNewSponsored({ ...newSponsored, editorialReason: e.target.value })}
          placeholder="Beneficio, promoción o valor para coleccionistas"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>DISCLAIMER</div>
        <input
          value={newSponsored.disclaimer}
          onChange={e => setNewSponsored({ ...newSponsored, disclaimer: e.target.value })}
          style={inp}
        />
      </div>

      <button
        onClick={() => setSponsoredPreview({ ...newSponsored })}
        disabled={
          !newSponsored.sponsorName ||
          !newSponsored.productName ||
          !newSponsored.img ||
          !newSponsored.productPrice ||
          !newSponsored.storeName ||
          !newSponsored.productUrl ||
          !newSponsored.editorialReason
        }
        style={{
          background: "#ff8db2",
          color: "#000",
          border: "none",
          padding: 12,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "monospace",
          opacity:
            (!newSponsored.sponsorName ||
              !newSponsored.productName ||
              !newSponsored.img ||
              !newSponsored.productPrice ||
              !newSponsored.storeName ||
              !newSponsored.productUrl ||
              !newSponsored.editorialReason)
              ? 0.5
              : 1
        }}
      >
        PREVISUALIZAR HALLAZGO
      </button>
    </div>
  </div>
)}

{showPollForm && (
  <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: 16, marginTop: 8 }}>
    <div style={{ fontSize: 11, color: "#7ee7c3", letterSpacing: 2, marginBottom: 12 }}>
      📊 NUEVA ENCUESTA PATROCINADA
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MARCA / SPONSOR *</div>
        <input
          value={newPollPost.sponsorName}
          onChange={e => setNewPollPost({ ...newPollPost, sponsorName: e.target.value })}
          placeholder="LEGO Store México"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>COPY INTRODUCTORIO *</div>
        <input
          value={newPollPost.introCopy}
          onChange={e => setNewPollPost({ ...newPollPost, introCopy: e.target.value })}
          placeholder="Una pregunta para la comunidad de coleccionistas."
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>PREGUNTA DE LA ENCUESTA *</div>
        <input
          value={newPollPost.pollQuestion}
          onChange={e => setNewPollPost({ ...newPollPost, pollQuestion: e.target.value })}
          placeholder="¿Qué tipo de set estás cazando este mes?"
          style={inp}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>OPCIÓN 1 *</div>
          <input
            value={newPollPost.option1}
            onChange={e => setNewPollPost({ ...newPollPost, option1: e.target.value })}
            placeholder="Star Wars"
            style={inp}
          />
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>OPCIÓN 2 *</div>
          <input
            value={newPollPost.option2}
            onChange={e => setNewPollPost({ ...newPollPost, option2: e.target.value })}
            placeholder="Icons"
            style={inp}
          />
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>OPCIÓN 3 *</div>
          <input
            value={newPollPost.option3}
            onChange={e => setNewPollPost({ ...newPollPost, option3: e.target.value })}
            placeholder="Technic"
            style={inp}
          />
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>OPCIÓN 4 *</div>
          <input
            value={newPollPost.option4}
            onChange={e => setNewPollPost({ ...newPollPost, option4: e.target.value })}
            placeholder="Marvel"
            style={inp}
          />
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>OPCIÓN 5</div>
          <input
            value={newPollPost.option5}
            onChange={e => setNewPollPost({ ...newPollPost, option5: e.target.value })}
            placeholder="Otro"
            style={inp}
          />
        </div>
      </div>

      <button
        onClick={() => setPollPreview({ ...newPollPost })}
        disabled={
          !newPollPost.sponsorName ||
          !newPollPost.introCopy ||
          !newPollPost.pollQuestion ||
          !newPollPost.option1 ||
          !newPollPost.option2 ||
          !newPollPost.option3 ||
          !newPollPost.option4
        }
        style={{
          background: "#7ee7c3",
          color: "#000",
          border: "none",
          padding: 12,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "monospace",
          opacity:
            (!newPollPost.sponsorName ||
              !newPollPost.introCopy ||
              !newPollPost.pollQuestion ||
              !newPollPost.option1 ||
              !newPollPost.option2 ||
              !newPollPost.option3 ||
              !newPollPost.option4)
              ? 0.5
              : 1
        }}
      >
        PREVISUALIZAR ENCUESTA
      </button>
    </div>
  </div>
)}

{showCodeForm && (
  <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: 16, marginTop: 8 }}>
    <div style={{ fontSize: 11, color: "#c6a8ff", letterSpacing: 2, marginBottom: 12 }}>
      🏷️ NUEVO CÓDIGO EXCLUSIVO
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MARCA / SPONSOR *</div>
        <input
          value={newCodePost.sponsorName}
          onChange={e => setNewCodePost({ ...newCodePost, sponsorName: e.target.value })}
          placeholder="LEGO Store México"
          style={inp}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>CÓDIGO *</div>
          <input
            value={newCodePost.codeName}
            onChange={e => setNewCodePost({ ...newCodePost, codeName: e.target.value })}
            placeholder="CLINK10"
            style={inp}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>VIGENCIA HASTA *</div>
          <input
            value={newCodePost.endDate}
            onChange={e => setNewCodePost({ ...newCodePost, endDate: e.target.value })}
            type="date"
            style={inp}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>BENEFICIO *</div>
        <input
          value={newCodePost.benefitDescription}
          onChange={e => setNewCodePost({ ...newCodePost, benefitDescription: e.target.value })}
          placeholder="10% de descuento / envío gratis / preventa / regalo"
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>URL *</div>
        <input
          value={newCodePost.url}
          onChange={e => setNewCodePost({ ...newCodePost, url: e.target.value })}
          placeholder="https://..."
          style={inp}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>IMAGEN</div>
        <input
          value={newCodePost.img}
          onChange={e => setNewCodePost({ ...newCodePost, img: e.target.value })}
          placeholder="https://..."
          style={inp}
        />
        {newCodePost.img && (
          <img
            src={newCodePost.img}
            alt=""
            style={{ width: "100%", maxHeight: 140, objectFit: "contain", marginTop: 6, borderRadius: 6, background: "#0a0a0a" }}
            onError={e => e.target.style.display = "none"}
          />
        )}
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOTA</div>
        <input
          value={newCodePost.note}
          onChange={e => setNewCodePost({ ...newCodePost, note: e.target.value })}
          placeholder="Beneficio activo para la comunidad Clink."
          style={inp}
        />
      </div>

      <button
        onClick={() => setCodePreview({ ...newCodePost })}
        disabled={
          !newCodePost.sponsorName ||
          !newCodePost.codeName ||
          !newCodePost.benefitDescription ||
          !newCodePost.endDate ||
          !newCodePost.url
        }
        style={{
          background: "#c6a8ff",
          color: "#000",
          border: "none",
          padding: 12,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "monospace",
          opacity:
            (!newCodePost.sponsorName ||
              !newCodePost.codeName ||
              !newCodePost.benefitDescription ||
              !newCodePost.endDate ||
              !newCodePost.url)
              ? 0.5
              : 1
        }}
      >
        PREVISUALIZAR CÓDIGO
      </button>
    </div>
  </div>
)}
      
      <div className="cards-inner">
        {dbLoading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#555", fontSize: 12, letterSpacing: 2 }}>CARGANDO SETS…</div>
        ) : (
          <div className="cards-grid">
            {filteredSets.map(set => (
              <SetCard
                key={set.id}
                set={set}
                d={priceData[set.id]}
                status={getStatus(set)}
                loadingId={loadingId}
                tgSt={tgStatus[set.id]}
                onCheck={() => checkPrice(set)}
                onSend={() => setPreview({ set, d: priceData[set.id] })}
                onRemove={() => removeSet(set.id)}
                onEdit={editSet}
                onManualPrice={(priceObj) => setManualPrice(set.id, priceObj)}
                onCooldown={isOnCooldown(set)}
              />
            ))}
            {filteredSets.length === 0 && (
  <div style={{ padding: 40, textAlign: "center", color: "#333", fontSize: 12, letterSpacing: 2 }}>
    {sets.length === 0 ? "NO HAY SETS — AGREGA UNO ARRIBA" : "NO SE ENCONTRARON RESULTADOS"}
  </div>
)}
          </div>
        )}
      </div>

      <div style={{ padding: "12px 24px", borderTop: "1px solid #111" }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: 1 }}>
          CLINK @CLINK_MX · Amazon.com.mx · Sincronizado con Supabase
        </div>
      </div>

      {preview && (
        <PreviewModal
          set={preview.set}
          d={preview.d}
          sending={sending}
          sent={tgStatus[preview.set.id] === "sent"}
          onClose={() => setPreview(null)}
          onSend={() => handleSend(preview.set, preview.d)}
        />
      )}

{gwpPreview && (
  <GwpPreviewModal
    gwp={gwpPreview}
    sending={sending}
    sent={false}
    onClose={() => setGwpPreview(null)}
    onSend={handleSendGwp}
  />
)} 
      
{sponsoredPreview && (
  <SponsoredPreviewModal
    post={sponsoredPreview}
    sending={sending}
    sent={false}
    onClose={() => setSponsoredPreview(null)}
    onSend={handleSendSponsored}
  />
)}

{codePreview && (
  <CodePreviewModal
    post={codePreview}
    sending={sending}
    sent={false}
    onClose={() => setCodePreview(null)}
    onSend={handleSendCode}
  />
)}

{pollPreview && (
  <PollPreviewModal
    post={pollPreview}
    sending={sending}
    sent={false}
    onClose={() => setPollPreview(null)}
    onSend={handleSendPoll}
  />
)}
    </div>
  );
}


function GwpPreviewModal({ gwp, onSend, onClose, sending, sent }) {
  const text = [
    "🎁 REGALO ACTIVO EN LEGO",
    `🧱 ${gwp.name}`,
    `💸 Compras desde: ${fmtPrice(gwp.threshold)}`,
    `📅 Vigencia: ${gwp.startDate} al ${gwp.endDate}`,
    `🏪 Aplica en: ${gwp.scope}`,
    gwp.note ? `👀 ${gwp.note}` : null
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#141414", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 14 }}>PREVIEW GWP · @CLINK_MX</div>

        <div style={{ background: "#2a2414", border: "1px solid #5a4310", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {gwp.img && (
            <img
              src={gwp.img}
              alt=""
              style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", background: "#0b0b0b", padding: 8 }}
              onError={e => e.target.style.display = "none"}
            />
          )}

          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#e8e8e8", whiteSpace: "pre-line", lineHeight: 1.7, fontFamily: "system-ui" }}>
              {text}
            </div>

            <a
              href={gwp.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 12,
                background: "#5a4310",
                borderRadius: 6,
                padding: "8px 14px",
                display: "inline-block",
                fontSize: 13,
                color: "#ffd36b",
                textDecoration: "none"
              }}
            >
              Ver promo en LEGO ↗
            </a>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#222", color: "#aaa", border: "none", padding: 14, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            CANCELAR
          </button>

          <button
            onClick={onSend}
            disabled={sending || sent}
            style={{ flex: 2, background: sent ? "#2ecc71" : "#ffd36b", color: "#000", border: "none", padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: sending ? 0.6 : 1 }}
          >
            {sent ? "✓ ENVIADO" : sending ? "ENVIANDO…" : "✈ PUBLICAR GWP"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SponsoredPreviewModal({ post, onSend, onClose, sending, sent }) {
  const text = [
    "✨ HALLAZGO PATROCINADO",
    `Presentado por ${post.sponsorName}`,
    "",
    `🧱 ${post.productName}`,
    `💸 Precio: ${fmtPrice(post.productPrice)}`,
    `🏪 Tienda: ${post.storeName}`,
    `👀 ${post.editorialReason}`,
    "",
    post.disclaimer || "Contenido patrocinado. Seleccionado bajo criterio editorial Clink."
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#141414", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 14 }}>
          PREVIEW HALLAZGO · @CLINK_MX
        </div>

        <div style={{ background: "#241118", border: "1px solid #5a1f33", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {post.img && (
            <img
              src={post.img}
              alt=""
              style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", background: "#0b0b0b", padding: 8 }}
              onError={e => e.target.style.display = "none"}
            />
          )}

          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#e8e8e8", whiteSpace: "pre-line", lineHeight: 1.7, fontFamily: "system-ui" }}>
              {text}
            </div>

            <a
              href={post.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 12,
                background: "#5a1f33",
                borderRadius: 6,
                padding: "8px 14px",
                display: "inline-block",
                fontSize: 13,
                color: "#ff8db2",
                textDecoration: "none"
              }}
            >
              Ver producto ↗
            </a>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#222", color: "#aaa", border: "none", padding: 14, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            CANCELAR
          </button>

          <button
            onClick={onSend}
            disabled={sending || sent}
            style={{ flex: 2, background: sent ? "#2ecc71" : "#ff8db2", color: "#000", border: "none", padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: sending ? 0.6 : 1 }}
          >
            {sent ? "✓ ENVIADO" : sending ? "ENVIANDO…" : "✈ PUBLICAR HALLAZGO"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CodePreviewModal({ post, onSend, onClose, sending, sent }) {
  const text = [
    "🏷️ CÓDIGO EXCLUSIVO CLINK",
    `Activado por ${post.sponsorName}`,
    "",
    `Código: ${post.codeName}`,
    `Beneficio: ${post.benefitDescription}`,
    `Vigencia: ${post.endDate}`,
    post.note ? `👀 ${post.note}` : null,
    "",
    "Contenido patrocinado. Beneficio disponible para la comunidad Clink."
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#141414", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 14 }}>
          PREVIEW CÓDIGO · @CLINK_MX
        </div>

        <div style={{ background: "#1f1a2a", border: "1px solid #4b3a6a", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {post.img && (
            <img
              src={post.img}
              alt=""
              style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", background: "#0b0b0b", padding: 8 }}
              onError={e => e.target.style.display = "none"}
            />
          )}

          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#e8e8e8", whiteSpace: "pre-line", lineHeight: 1.7, fontFamily: "system-ui" }}>
              {text}
            </div>

            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 12,
                background: "#4b3a6a",
                borderRadius: 6,
                padding: "8px 14px",
                display: "inline-block",
                fontSize: 13,
                color: "#c6a8ff",
                textDecoration: "none"
              }}
            >
              Ver beneficio ↗
            </a>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#222", color: "#aaa", border: "none", padding: 14, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            CANCELAR
          </button>

          <button
            onClick={onSend}
            disabled={sending || sent}
            style={{ flex: 2, background: sent ? "#2ecc71" : "#c6a8ff", color: "#000", border: "none", padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: sending ? 0.6 : 1 }}
          >
            {sent ? "✓ ENVIADO" : sending ? "ENVIANDO…" : "✈ PUBLICAR CÓDIGO"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PollPreviewModal({ post, onSend, onClose, sending, sent }) {
  const pollOptions = [
    post.option1,
    post.option2,
    post.option3,
    post.option4,
    post.option5
  ].filter(Boolean);

  const introText = [
    "📊 ENCUESTA PATROCINADA",
    `Presentada por ${post.sponsorName}`,
    "",
    post.introCopy
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#141414", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 14 }}>
          PREVIEW ENCUESTA · @CLINK_MX
        </div>

        <div style={{ background: "#13221f", border: "1px solid #245447", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#e8e8e8", whiteSpace: "pre-line", lineHeight: 1.7, fontFamily: "system-ui", marginBottom: 14 }}>
              {introText}
            </div>

            <div style={{ background: "#0f1715", border: "1px solid #1e3b35", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, color: "#d8f7ee", fontWeight: 700, marginBottom: 10 }}>
                {post.pollQuestion}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pollOptions.map((option, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #245447",
                      color: "#b9e9db",
                      fontSize: 13,
                      background: "#13221f"
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#222", color: "#aaa", border: "none", padding: 14, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}
          >
            CANCELAR
          </button>

          <button
            onClick={onSend}
            disabled={sending || sent}
            style={{ flex: 2, background: sent ? "#2ecc71" : "#7ee7c3", color: "#000", border: "none", padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: sending ? 0.6 : 1 }}
          >
            {sent ? "✓ ENVIADO" : sending ? "ENVIANDO…" : "✈ PUBLICAR ENCUESTA"}
          </button>
        </div>
      </div>
    </div>
  );
}
