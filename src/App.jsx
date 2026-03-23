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
    id: s.id, name: s.name, sku: s.sku, asin: s.asin || "", img: s.img || "",
    minDiscount: s.min_discount || 30, avg90: s.avg90, min90: s.min90, notes: s.notes || "",
    originalPrice: s.original_price || null,
    priceData: s.price_data || null
  }));
}

async function sbAddSet(set) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sets`, {
    method: "POST", headers: sbHeaders,
    body: JSON.stringify({ name: set.name, sku: set.sku, asin: set.asin, img: set.img, min_discount: set.minDiscount, avg90: set.avg90, min90: set.min90, notes: set.notes, original_price: set.originalPrice || null })
  });
  const data = await r.json();
  return data[0];
}

async function sbUpdateSet(set) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${set.id}`, {
    method: "PATCH", headers: sbHeaders,
    body: JSON.stringify({ name: set.name, sku: set.sku, asin: set.asin, img: set.img, min_discount: set.minDiscount, avg90: set.avg90, min90: set.min90, notes: set.notes, original_price: set.originalPrice || null })
  });
}

async function sbUpdatePriceData(id, priceData) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${id}`, {
    method: "PATCH", headers: sbHeaders,
    body: JSON.stringify({ price_data: priceData })
  });
}

async function sbDeleteSet(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${id}`, { method: "DELETE", headers: sbHeaders });
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
  return "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function canonicalUrl(asin) {
  return asin ? `https://www.amazon.com.mx/dp/${asin}` : null;
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
  // Si tiene datos de 90 días, usar esos como referencia
  if (set.avg90 || set.min90) {
    const isNewLow = set.min90 ? Math.abs(price - set.min90) <= 1 : false;
    const diffVsAvg = set.avg90 ? Math.round(((set.avg90 - price) / set.avg90) * 100) : null;
    return isNewLow || (diffVsAvg != null && diffVsAvg >= 12);
  }
  // Fallback: usar descuento de Amazon si no hay datos 90d
  const disc = getDiscount(d);
  return disc != null && disc >= set.minDiscount;
}

function buildCaption(set, d) {
  const price = d.price;
  const pct = getDiscount(d);
  const url = d.url || canonicalUrl(set.asin) || "";
  const line2 = [fmtPrice(price), pct != null ? `${discountBadge(pct)} -${pct}%` : null].filter(Boolean).join(" · ");
  const diffVsAvg = (set.avg90 && price) ? Math.round(((set.avg90 - price) / set.avg90) * 100) : null;
  const isNewLow = set.min90 && price ? Math.abs(price - set.min90) <= 1 : false;
  let tag = "";
  if (isNewLow) tag = "🔥 NUEVO MÍNIMO 90D";
  else if (diffVsAvg != null && diffVsAvg >= 20) tag = "💥 CAÍDA FUERTE";
  else if (diffVsAvg != null && diffVsAvg >= 12) tag = "✅ BUEN PRECIO";
  const extras = [
    tag || null,
    set.avg90 ? `📊 Prom 90d: ${fmtPrice(set.avg90)}${diffVsAvg != null ? ` (-${diffVsAvg}%)` : ""}` : null,
    set.min90 ? `📉 Mín 90d: ${fmtPrice(set.min90)}` : null,
    set.notes ? `🧠 ${set.notes}` : null,
  ].filter(Boolean);
  return { text: [`🧱 ${set.name}`, line2, ...extras].filter(Boolean).join("\n").slice(0, 900), url };
}

async function sendToTelegram(botToken, chatId, set, d) {
  const { text, url } = buildCaption(set, d);
  const img = set.img?.trim();
  const reply_markup = { inline_keyboard: [[{ text: "Ver en Amazon", url }]] };
  const res = await fetch(WORKER_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ botToken, chatId, text: img ? text : text + "\n" + url, photo: img || null, reply_markup })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || "Error Telegram");
  return json;
}

function TelegramConfig({ config, onSave, onClose }) {
  const [token, setToken] = useState(config.botToken || "");
  const [chatId, setChatId] = useState(config.chatId || "");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const inp = { width: "100%", background: "#1a1a1a", border: "1px solid #333", color: "#e0e0e0", padding: "10px 12px", borderRadius: 6, fontFamily: "monospace", fontSize: 13, outline: "none" };
  const test = async () => {
    setTesting(true); setResult(null);
    try {
      const r = await fetch(WORKER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botToken: token, chatId, text: "🧱 CLINK tracker conectado ✅" }) });
      const j = await r.json();
      setResult(j.ok ? "ok" : j.description || "error");
    } catch (e) { setResult(e.message); }
    setTesting(false);
  };
  return (
    <div style={{ background: "#111", borderBottom: "1px solid #222", padding: 16 }}>
      <div style={{ fontSize: 11, color: "#2AABEE", letterSpacing: 2, marginBottom: 12 }}>✈ CONFIGURACIÓN TELEGRAM</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>BOT TOKEN</div>
          <input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="123456:ABC..." style={inp} /></div>
        <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>CHAT ID / @canal</div>
          <input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="@CLINK_MX" style={inp} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={test} disabled={testing || !token || !chatId} style={{ flex: 1, background: "#1a1a1a", color: "#aaa", border: "1px solid #333", padding: 10, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>{testing ? "PROBANDO…" : "PROBAR"}</button>
          <button onClick={() => onSave({ botToken: token, chatId })} style={{ flex: 2, background: "#2AABEE", color: "#000", border: "none", padding: 10, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>GUARDAR</button>
          <button onClick={onClose} style={{ background: "#222", color: "#888", border: "none", padding: "10px 14px", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>
      </div>
      {result && <div style={{ marginTop: 10, fontSize: 12, color: result === "ok" ? "#2ecc71" : "#ff5555" }}>{result === "ok" ? "✓ Mensaje enviado" : `✗ ${result}`}</div>}
      <div style={{ marginTop: 8, fontSize: 10, color: "#555" }}>El bot debe ser admin del canal para publicar</div>
    </div>
  );
}

function PreviewModal({ set, d, onSend, onClose, sending, sent }) {
  const { text, url } = buildCaption(set, d);
  const img = set.img?.trim();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#141414", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 14 }}>PREVIEW · @CLINK_MX</div>
        <div style={{ background: "#1c2b1c", border: "1px solid #2a3a2a", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {img && <img src={img} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} onError={e => e.target.style.display = "none"} />}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#e8e8e8", whiteSpace: "pre-line", lineHeight: 1.7, fontFamily: "system-ui" }}>{text}</div>
            <div style={{ marginTop: 12, background: "#2a3a2a", borderRadius: 6, padding: "8px 14px", display: "inline-block", fontSize: 13, color: "#8bc89a" }}>Ver en Amazon ↗</div>
          </div>
        </div>
        {img && <div style={{ fontSize: 10, color: "#555", marginBottom: 10 }}>📷 Se enviará con imagen</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#222", color: "#aaa", border: "none", padding: 14, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}>CANCELAR</button>
          <button onClick={onSend} disabled={sending || sent} style={{ flex: 2, background: sent ? "#2ecc71" : "#2AABEE", color: "#000", border: "none", padding: 14, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: sending ? 0.6 : 1 }}>
            {sent ? "✓ ENVIADO" : sending ? "ENVIANDO…" : "✈ PUBLICAR EN CANAL"}</button>
        </div>
      </div>
    </div>
  );
}

function SetCard({ set, d, status, onCheck, onSend, onRemove, onEdit, onManualPrice, loadingId, tgSt }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ ...set });
  const [manualPrice, setManualPrice] = useState("");
  const [manualOriginal, setManualOriginal] = useState("");
  const [showManual, setShowManual] = useState(false);

  const discount = getDiscount(d);
  const hasAlert = isAlert(set, d);
  const isLoading = loadingId === set.id;
  const statusColor = { idle: "#555", loading: "#f0a500", alert: "#2ecc71", ok: "#2ecc71" }[status] || "#555";

  const timeAgo = (iso) => {
    if (!iso) return "sin revisar";
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    return `hace ${Math.floor(diff / 3600)}h`;
  };

  const inp = { width: "100%", background: "#1a1a1a", border: "1px solid #333", color: "#e0e0e0", padding: "8px 10px", borderRadius: 6, fontFamily: "monospace", fontSize: 12, outline: "none" };

  const saveManual = () => {
    const p = parseFloat(manualPrice);
    const o = parseFloat(manualOriginal) || set.originalPrice || null;
    if (!p) return;
    const disc = o ? Math.round((1 - p / o) * 100) : null;
    onManualPrice({ found: true, price: p, originalPrice: o || null, discount: disc, url: canonicalUrl(set.asin), availability: "Manual", checkedAt: new Date().toISOString() });
    setShowManual(false); setManualPrice(""); setManualOriginal("");
  };

  if (editing) {
    return (
      <div style={{ background: "#161616", border: "1px solid #333", borderRadius: 10, padding: 16, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#f0a500", letterSpacing: 2, marginBottom: 12 }}>EDITAR SET</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>NOMBRE</div>
            <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={inp} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>SKU</div>
              <input value={editData.sku} onChange={e => setEditData({ ...editData, sku: e.target.value })} style={inp} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>DCTO MÍN %</div>
              <input value={editData.minDiscount} onChange={e => setEditData({ ...editData, minDiscount: e.target.value })} type="number" style={inp} /></div>
          </div>
          <div><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>ASIN</div>
            <input value={editData.asin || ""} onChange={e => setEditData({ ...editData, asin: e.target.value })} style={inp} /></div>
          <div><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>URL IMAGEN</div>
            <input value={editData.img || ""} onChange={e => setEditData({ ...editData, img: e.target.value })} placeholder="https://..." style={inp} /></div>
          {editData.img && <img src={editData.img} alt="" style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6, background: "#111" }} onError={e => e.target.style.display = "none"} />}
          <div><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>PRECIO ORIGINAL $MXN</div>
            <input value={editData.originalPrice || ""} onChange={e => setEditData({ ...editData, originalPrice: e.target.value })} placeholder="1799" type="number" style={inp} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>PROM 90D</div>
              <input value={editData.avg90 || ""} onChange={e => setEditData({ ...editData, avg90: e.target.value })} type="number" style={inp} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>MÍN 90D</div>
              <input value={editData.min90 || ""} onChange={e => setEditData({ ...editData, min90: e.target.value })} type="number" style={inp} /></div>
          </div>
          <div><div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>NOTA</div>
            <input value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Rara vez baja de $4k" style={inp} /></div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setEditing(false)} style={{ flex: 1, background: "#1a1a1a", color: "#888", border: "1px solid #333", padding: 10, borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>CANCELAR</button>
            <button onClick={() => { onEdit({ ...editData, minDiscount: parseInt(editData.minDiscount) || 30, avg90: parseFloat(editData.avg90) || null, min90: parseFloat(editData.min90) || null, originalPrice: parseFloat(editData.originalPrice) || null }); setEditing(false); }}
              style={{ flex: 2, background: "#f0a500", color: "#000", border: "none", padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>GUARDAR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: hasAlert ? "rgba(46,204,113,0.06)" : "#111", border: `1px solid ${hasAlert ? "#2ecc7155" : "#1e1e1e"}`, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
      {set.img && <img src={set.img} alt={set.name} style={{ width: "100%", maxHeight: 140, objectFit: "cover", display: "block" }} onError={e => e.target.style.display = "none"} />}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div onClick={() => setEditing(true)} style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0, marginTop: 5, boxShadow: hasAlert ? "0 0 8px #2ecc71" : "none", display: "inline-block", animation: isLoading ? "pulse 1s infinite" : "none" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: hasAlert ? "#2ecc71" : "#e0e0e0", lineHeight: 1.3 }}>{set.name}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>#{set.sku} · ≥{set.minDiscount}% · {timeAgo(d?.checkedAt)} · <span style={{ color: "#444" }}>toca para editar</span></div>
              {d?.error && <div style={{ fontSize: 11, color: "#ff5555", marginTop: 2 }}>⚠ Error al buscar precio</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onCheck} disabled={isLoading} style={{ background: "#1e1e1e", color: "#bbb", border: "1px solid #333", width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isLoading ? "…" : "↻"}</button>
            {d?.found && d.price && (
              <button onClick={onSend} disabled={tgSt === "sending"}
                style={{ background: tgSt === "sent" ? "#0a2a10" : tgSt === "error" ? "#2a0a0a" : hasAlert ? "#0a1825" : "#1a1a1a", color: tgSt === "sent" ? "#2ecc71" : tgSt === "error" ? "#ff5555" : hasAlert ? "#2AABEE" : "#777", border: `1px solid ${tgSt === "sent" ? "#1a4a2a" : tgSt === "error" ? "#4a1a1a" : hasAlert ? "#1a3a52" : "#333"}`, width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tgSt === "sent" ? "✓" : tgSt === "sending" ? "…" : tgSt === "error" ? "✗" : "✈"}</button>
            )}
            <button onClick={onRemove} style={{ background: "#2a1010", color: "#cc4444", border: "1px solid #441a1a", width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e1e1e" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 2 }}>PRECIO HOY</div>
            {isLoading ? <div style={{ fontSize: 12, color: "#f0a500" }}>buscando…</div>
              : d?.found && d.price ? <div style={{ fontSize: 18, fontWeight: 700, color: hasAlert ? "#2ecc71" : "#ccc", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{fmtPrice(d.price)}</div>
              : <div style={{ fontSize: 13, color: "#444" }}>—</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 2 }}>DESCUENTO</div>
            {discount != null ? <div style={{ fontSize: 20, fontWeight: 700, color: hasAlert ? "#2ecc71" : "#f0a500", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>−{discount}%</div>
              : <div style={{ fontSize: 13, color: "#444" }}>—</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 2 }}>ORIG.</div>
            {d?.originalPrice ? <div style={{ fontSize: 13, color: "#666", textDecoration: "line-through" }}>{fmtPrice(d.originalPrice)}</div>
              : <div style={{ fontSize: 13, color: "#444" }}>—</div>}
          </div>
          <div>
            {hasAlert ? <span style={{ background: "#2ecc71", color: "#000", fontSize: 10, padding: "4px 8px", borderRadius: 4, letterSpacing: 1, fontWeight: 700 }}>ALERTA</span>
              : d?.found && discount != null ? <span style={{ color: "#555", fontSize: 11 }}>min {set.minDiscount}%</span> : null}
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
                  <div style={{ fontSize: 13, color: "#666", padding: "8px 10px", background: "#111", borderRadius: 6, border: "1px solid #222" }}>{fmtPrice(set.originalPrice)}</div>
                </div>
              )}
              <button onClick={saveManual} style={{ background: "#f0a500", color: "#000", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>OK</button>
            </div>
          )}
        </div>
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
  const [loadingId, setLoadingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [showTgConfig, setShowTgConfig] = useState(false);
  const [tgConfig, setTgConfig] = useState({ botToken: "", chatId: "" });
  const [newSet, setNewSet] = useState({ name: "", sku: "", minDiscount: "30", asin: "", img: "", avg90: "", min90: "", notes: "", originalPrice: "" });
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
    sbGetSets().then(data => {
      setSets(data);
      const pd = {};
      data.forEach(s => { if (s.priceData) pd[s.id] = s.priceData; });
      setPriceData(pd);
      setDbLoading(false);
    }).catch(() => setDbLoading(false));
  }, []);

  const saveTgConfig = (c) => { setTgConfig(c); localStorage.setItem(TG_KEY, JSON.stringify(c)); setShowTgConfig(false); };

  const checkPrice = useCallback(async (set) => {
    setLoadingId(set.id);
    try {
      const response = await fetch(ANTHROPIC_WORKER, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `Eres un asistente que busca precios de sets LEGO en Amazon México (amazon.com.mx).
Responde ÚNICAMENTE con JSON válido sin markdown ni backticks:
{"found":true,"price":1234.56,"originalPrice":1234.56,"discount":10,"url":"https://www.amazon.com.mx/dp/ASIN","availability":"En stock","note":""}
discount es el porcentaje entero de descuento. Si no hay precio: found=false, price=null.`,
          messages: [{ role: "user", content: `Busca precio actual del LEGO ${set.sku} "${set.name}" en Amazon México. ASIN: ${set.asin || "desconocido"}. Necesito precio actual Y precio original para calcular descuento.` }]
        })
      });
      const data = await response.json();
      if (data.error) {
        const pd = { error: true, errorMsg: data.error.message, checkedAt: new Date().toISOString() };
        setPriceData(prev => ({ ...prev, [set.id]: pd }));
        await sbUpdatePriceData(set.id, pd);
        setLoadingId(null); return;
      }
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      let parsed = null;
      try { const m = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}
      if (!parsed) {
        const pd = { error: true, errorMsg: "Sin respuesta", checkedAt: new Date().toISOString() };
        setPriceData(prev => ({ ...prev, [set.id]: pd }));
        await sbUpdatePriceData(set.id, pd);
        setLoadingId(null); return;
      }
      if (set.asin && (!parsed.url || !parsed.url.includes("amazon.com.mx"))) parsed.url = canonicalUrl(set.asin);
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
    for (const set of sets) { await checkPrice(set); await new Promise(r => setTimeout(r, 3000)); }
    setGlobalLoading(false);
  };

  const addSet = async () => {
    if (!newSet.name || !newSet.sku) return;
    const created = await sbAddSet({ ...newSet, minDiscount: parseInt(newSet.minDiscount) || 30, avg90: parseFloat(newSet.avg90) || null, min90: parseFloat(newSet.min90) || null, originalPrice: parseFloat(newSet.originalPrice) || null });
    if (created) setSets(prev => [...prev, { ...created, minDiscount: created.min_discount, originalPrice: created.original_price, priceData: null }]);
    setNewSet({ name: "", sku: "", minDiscount: "30", asin: "", img: "", avg90: "", min90: "", notes: "", originalPrice: "" });
    setShowAdd(false); setShowExtra(false);
  };

  const editSet = async (updated) => {
    setSets(prev => prev.map(s => s.id === updated.id ? updated : s));
    await sbUpdateSet(updated);
  };

  const removeSet = async (id) => {
    setSets(prev => prev.filter(s => s.id !== id));
    setPriceData(prev => { const n = { ...prev }; delete n[id]; return n; });
    await sbDeleteSet(id);
  };

  const setManualPrice = async (id, priceObj) => {
    setPriceData(prev => ({ ...prev, [id]: priceObj }));
    await sbUpdatePriceData(id, priceObj);
  };

  const handleSend = async (set, d) => {
    if (!tgConfig.botToken || !tgConfig.chatId) { setShowTgConfig(true); setPreview(null); return; }
    setSending(true);
    setTgStatus(s => ({ ...s, [set.id]: "sending" }));
    try {
      await sendToTelegram(tgConfig.botToken, tgConfig.chatId, set, d);
      setTgStatus(s => ({ ...s, [set.id]: "sent" }));
      setSentIds(prev => new Set([...prev, set.id]));
      setTimeout(() => setTgStatus(s => { const n = { ...s }; delete n[set.id]; return n; }), 4000);
    } catch {
      setTgStatus(s => ({ ...s, [set.id]: "error" }));
      setTimeout(() => setTgStatus(s => { const n = { ...s }; delete n[set.id]; return n; }), 4000);
    }
    setSending(false); setPreview(null);
  };

  const sendAllAlerts = async () => {
    if (!tgConfig.botToken || !tgConfig.chatId) { setShowTgConfig(true); return; }
    const alerts = sets.filter(s => isAlert(s, priceData[s.id]));
    for (const set of alerts) { await handleSend(set, priceData[set.id]); await new Promise(r => setTimeout(r, 700)); }
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
  const inp = { width: "100%", background: "#1a1a1a", border: "1px solid #333", color: "#e0e0e0", padding: "10px 12px", borderRadius: 6, fontFamily: "monospace", fontSize: 13, outline: "none" };

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
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 5, color: "#f0a500", lineHeight: 1 }}>CLINK</div>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: 3 }}>LEGO PRICE TRACKER · MX</div>
            </div>
            {lastCheck && <div style={{ fontSize: 10, color: "#555" }}>{lastCheck}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowTgConfig(!showTgConfig); setShowAdd(false); }}
              style={{ flex: 1, background: tgReady ? "#0a1e2e" : "#1a1a1a", color: tgReady ? "#2AABEE" : "#888", border: `1px solid ${tgReady ? "#1a3a52" : "#333"}`, padding: "10px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
              {tgReady ? "✈ TG ✓" : "✈ TELEGRAM"}</button>
            <button onClick={() => { setShowAdd(!showAdd); setShowTgConfig(false); }}
              style={{ flex: 1, background: "#1a1a1a", color: "#ccc", border: "1px solid #333", padding: "10px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
              {showAdd ? "✕ CANCELAR" : "+ SET"}</button>
            <button onClick={checkAll} disabled={globalLoading}
              style={{ flex: 2, background: "#f0a500", color: "#000", border: "none", padding: "10px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", opacity: globalLoading ? 0.5 : 1 }}>
              {globalLoading ? "BUSCANDO..." : "▶ REVISAR TODOS"}</button>
          </div>
          {alertCount > 0 && tgReady && (
            <button onClick={sendAllAlerts}
              style={{ width: "100%", marginTop: 8, background: "#0d1f2e", color: "#2AABEE", border: "1px solid #1a3a52", padding: 10, borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
              ✈ ENVIAR {alertCount} ALERTA{alertCount > 1 ? "S" : ""} A CLINK</button>
          )}
        </div>
      </div>

      {showTgConfig && <TelegramConfig config={tgConfig} onSave={saveTgConfig} onClose={() => setShowTgConfig(false)} />}

      {showAdd && (
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: 16 }}>
          <div style={{ fontSize: 11, color: "#f0a500", letterSpacing: 2, marginBottom: 12 }}>NUEVO SET</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOMBRE *</div>
              <input value={newSet.name} onChange={e => setNewSet({ ...newSet, name: e.target.value })} placeholder="LEGO Icons Colosseum" style={inp} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>SKU *</div>
                <input value={newSet.sku} onChange={e => setNewSet({ ...newSet, sku: e.target.value })} placeholder="10276" style={inp} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>DCTO MÍN %</div>
                <input value={newSet.minDiscount} onChange={e => setNewSet({ ...newSet, minDiscount: e.target.value })} placeholder="30" type="number" style={inp} /></div>
            </div>
            <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>ASIN</div>
              <input value={newSet.asin} onChange={e => setNewSet({ ...newSet, asin: e.target.value })} placeholder="B08HM3VTCZ" style={inp} /></div>
            <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>URL IMAGEN</div>
              <input value={newSet.img} onChange={e => setNewSet({ ...newSet, img: e.target.value })} placeholder="https://m.media-amazon.com/images/..." style={inp} />
              {newSet.img && <img src={newSet.img} alt="" style={{ width: "100%", maxHeight: 100, objectFit: "contain", marginTop: 6, borderRadius: 4, background: "#0a0a0a" }} onError={e => e.target.style.display = "none"} />}
            </div>
            <button onClick={() => setShowExtra(!showExtra)} style={{ background: "#161616", color: "#666", border: "1px solid #222", padding: 8, borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
              {showExtra ? "▲ OCULTAR HISTÓRICOS" : "▼ + DATOS 90D / PRECIO ORIGINAL"}</button>
            {showExtra && (
              <>
                <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>PRECIO ORIGINAL $MXN</div>
                  <input value={newSet.originalPrice} onChange={e => setNewSet({ ...newSet, originalPrice: e.target.value })} placeholder="1799" type="number" style={inp} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>PROM 90D</div>
                    <input value={newSet.avg90} onChange={e => setNewSet({ ...newSet, avg90: e.target.value })} type="number" style={inp} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>MÍN 90D</div>
                    <input value={newSet.min90} onChange={e => setNewSet({ ...newSet, min90: e.target.value })} type="number" style={inp} /></div>
                </div>
                <div><div style={{ fontSize: 10, color: "#777", marginBottom: 4 }}>NOTA</div>
                  <input value={newSet.notes} onChange={e => setNewSet({ ...newSet, notes: e.target.value })} placeholder="Rara vez baja de $4k" style={inp} /></div>
              </>
            )}
            <button onClick={addSet} style={{ background: "#f0a500", color: "#000", border: "none", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
              GUARDAR SET</button>
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
              <div style={{ fontSize: 26, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, color: accent && val > 0 ? "#2ecc71" : blue && val > 0 ? "#2AABEE" : "#ccc" }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cards-inner">
        {dbLoading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#555", fontSize: 12, letterSpacing: 2 }}>CARGANDO SETS…</div>
        ) : (
          <div className="cards-grid">
            {sets.map(set => (
              <SetCard
                key={set.id} set={set} d={priceData[set.id]} status={getStatus(set)}
                loadingId={loadingId} tgSt={tgStatus[set.id]}
                onCheck={() => checkPrice(set)} onSend={() => setPreview({ set, d: priceData[set.id] })}
                onRemove={() => removeSet(set.id)} onEdit={editSet}
                onManualPrice={(priceObj) => setManualPrice(set.id, priceObj)}
              />
            ))}
            {sets.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#333", fontSize: 12, letterSpacing: 2 }}>NO HAY SETS — AGREGA UNO ARRIBA</div>}
          </div>
        )}
      </div>

      <div style={{ padding: "12px 24px", borderTop: "1px solid #111" }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: 1 }}>CLINK @CLINK_MX · Amazon.com.mx · Sincronizado con Supabase</div>
      </div>

      {preview && (
        <PreviewModal set={preview.set} d={preview.d} sending={sending} sent={tgStatus[preview.set.id] === "sent"}
          onClose={() => setPreview(null)} onSend={() => handleSend(preview.set, preview.d)} />
      )}
    </div>
  );
}
