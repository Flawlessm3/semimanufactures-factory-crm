import { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext.js";
import { C } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { Btn, Stat, PageH, EmptyState, StatusPill } from "../components/ui/index.jsx";
import { INIT_PRODUCTS } from "../data/initState.js";
import { PACKING_BOARD_COLUMNS, getOrderBoardStage, BOARD_STAGE_COLORS } from "../utils/orderBoard.js";

function fmtElapsed(refTime, now) {
  const min = Math.floor((now - new Date(refTime).getTime()) / 60000);
  if (min < 60) return `${min}м`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
}

function elapsedColor(refTime, now) {
  const min = (now - new Date(refTime).getTime()) / 60000;
  if (min < 30) return C.success;
  if (min < 90) return C.orange;
  return C.danger;
}

function deliveryPillLabel(deliveryStatus) {
  if (deliveryStatus === "в доставке") return "В пути";
  if (deliveryStatus === "доставлен") return "Доставлен";
  return "Ожидает курьера";
}

const BoardOrderCard = ({ order, products, now, stage }) => {
  const storeName = order.storeName || order.clientName || "Магазин не указан";
  const deliveryStatus = order.deliveryStatus || "ожидает";
  const refTime = order.statusChangedAt || order.orderDate;
  const elapsed = fmtElapsed(refTime, now);
  const eColor = elapsedColor(refTime, now);
  const isDelayed = (now - new Date(refTime).getTime()) > 90 * 60000;
  const isCrit = order.priority === "срочный";
  const isImp = order.priority === "важный";

  return (
    <div
      className="board-order-card"
      style={{
        background: isDelayed ? "rgba(196,78,61,0.06)" : C.surface2,
        border: `1px solid ${isCrit ? `${C.danger}55` : isDelayed ? `${C.danger}33` : C.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 8,
        position: "relative",
        animation: isCrit ? "pulseBorder 2s infinite" : "none",
        boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
      }}
    >
      {(isCrit || isImp) && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            borderRadius: "12px 0 0 12px",
            background: isCrit ? C.danger : C.orange,
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, paddingLeft: isCrit || isImp ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.primary, letterSpacing: -0.3 }}>#{order.id}</span>
          {isCrit && <span style={{ fontSize: 10, fontWeight: 700, background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}44`, borderRadius: 4, padding: "2px 6px" }}>СРОЧНО</span>}
          {isImp && !isCrit && <span style={{ fontSize: 10, fontWeight: 700, background: `${C.orange}18`, color: C.orange, border: `1px solid ${C.orange}33`, borderRadius: 4, padding: "2px 6px" }}>ВАЖНЫЙ</span>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: eColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{elapsed}</div>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 0.3 }}>ожидание</div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8, paddingLeft: isCrit || isImp ? 6 : 0 }}>{storeName}</div>

      <div style={{ paddingLeft: isCrit || isImp ? 6 : 0 }}>
        {order.items.map((it, i) => {
          const p = products.find(x => x.id === it.productId);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: C.muted,
                padding: "3px 0",
                borderTop: i > 0 ? `1px solid ${C.border}` : "none",
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p?.name || "?"}</span>
              <span style={{ fontWeight: 700, color: C.text, flexShrink: 0 }}>{it.qty} {p?.unit || ""}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
          paddingTop: 8,
          borderTop: `1px solid ${C.border}`,
          paddingLeft: isCrit || isImp ? 6 : 0,
        }}
      >
        <div style={{ fontSize: 11, color: C.dim }}>
          {order.orderDate
            ? `${new Date(order.orderDate).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · ${new Date(order.orderDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`
            : "—"}
        </div>
        {(order.total || 0) > 0 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{(order.total || 0).toLocaleString("ru")} ₽</div>
        )}
      </div>

      {stage === "delivery" && (
        <div style={{ marginTop: 8, paddingLeft: isCrit || isImp ? 6 : 0 }}>
          <StatusPill color={deliveryStatus === "доставлен" ? "success" : deliveryStatus === "в доставке" ? "purple" : "info"}>
            {deliveryPillLabel(deliveryStatus)}
          </StatusPill>
        </div>
      )}

      {order.note && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: C.muted,
            background: C.bg,
            borderRadius: 6,
            padding: "6px 8px",
            lineHeight: 1.4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {order.note}
        </div>
      )}
    </div>
  );
};

const BoardColumns = ({ orders, products, now }) => (
  <div className="board-columns-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, height: "100%", overflow: "hidden" }}>
    {PACKING_BOARD_COLUMNS.map(col => {
      const colOrders = [...orders]
        .filter(o => getOrderBoardStage(o) === col.id)
        .sort((a, b) => {
          const pa = a.priority === "срочный" ? 0 : a.priority === "важный" ? 1 : 2;
          const pb = b.priority === "срочный" ? 0 : b.priority === "важный" ? 1 : 2;
          if (pa !== pb) return pa - pb;
          return new Date(a.orderDate) - new Date(b.orderDate);
        });
      const cc = BOARD_STAGE_COLORS[col.id] || { bg: C.surface, border: C.border, dot: C.muted, title: C.muted };
      const totalVal = colOrders.reduce((s, o) => s + (o.total || 0), 0);
      const hasDelayed = colOrders.some(o => (now - new Date(o.statusChangedAt || o.orderDate).getTime()) > 90 * 60000);

      return (
        <div key={col.id} style={{ background: cc.bg, borderRadius: 12, border: `1px solid ${cc.border}`, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${cc.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: cc.dot, boxShadow: `0 0 8px ${cc.dot}90` }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 0.4 }}>{col.label.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {hasDelayed && <span style={{ color: C.danger, display: "inline-flex" }} title="Есть задержанные"><I.alert size={13} /></span>}
                <span style={{ fontSize: 22, fontWeight: 800, color: cc.dot, lineHeight: 1 }}>{colOrders.length}</span>
              </div>
            </div>
            {colOrders.length > 0 && totalVal > 0 && (
              <div style={{ fontSize: 11, color: cc.title, marginTop: 3 }}>{totalVal.toLocaleString("ru")} ₽</div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {colOrders.length === 0
              ? <div style={{ textAlign: "center", color: C.dim, fontSize: 12, paddingTop: 24 }}>нет заказов</div>
              : colOrders.map(o => <BoardOrderCard key={o.id} order={o} products={products} now={now} stage={col.id} />)
            }
          </div>
        </div>
      );
    })}
  </div>
);

const OrdersBoardStandalone = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState(INIT_PRODUCTS);
  const [now, setNow] = useState(Date.now());
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const poll = async () => {
      setSyncing(true);
      try {
        const [o, p] = await Promise.all([
          fetch("/api/board/orders").then(r => r.ok ? r.json() : null),
          fetch("/api/board/products").then(r => r.ok ? r.json() : null),
        ]);
        if (Array.isArray(o)) setOrders(o);
        if (Array.isArray(p)) setProducts(p);
        setLastSync(Date.now());
      } catch (e) { /* offline */ }
      setSyncing(false);
    };
    poll();
    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const activeOrders = orders.filter(o => getOrderBoardStage(o));
  const urgentCount = activeOrders.filter(o => o.priority === "срочный").length;
  const timeStr = new Date(now).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = new Date(now).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden", color: C.text }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:${C.bg};overflow:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        @keyframes pulseBorder{0%,100%{box-shadow:0 0 0 1px rgba(196,78,61,0.3)}50%{box-shadow:0 0 0 3px rgba(196,78,61,0.55)}}
        @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.3}}
        @media(max-width:900px){.board-columns-grid{grid-template-columns:1fr !important;height:auto !important;overflow:visible !important}}
      `}</style>
      <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.35)", flexShrink: 0, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${C.primary}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.primary}44`, color: C.primary, fontSize: 18 }}>⬡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: 1 }}>ПАНЕЛЬ ЗАКАЗОВ</div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 0.5 }}>ФАСОВКА · ДОСТАВКА</div>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center", minWidth: 180 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: C.text, fontVariantNumeric: "tabular-nums", letterSpacing: 2, lineHeight: 1 }}>{timeStr}</div>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "capitalize", marginTop: 2 }}>{dateStr}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {urgentCount > 0 && (
            <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "6px 14px", textAlign: "center", animation: "pulseBorder 2s infinite" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.danger, lineHeight: 1 }}>{urgentCount}</div>
              <div style={{ fontSize: 9, color: C.danger, letterSpacing: 0.5 }}>СРОЧНЫХ</div>
            </div>
          )}
          <div style={{ background: `${C.primary}12`, border: `1px solid ${C.primary}33`, borderRadius: 8, padding: "6px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{activeOrders.length}</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5 }}>АКТИВНЫХ</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: syncing ? C.orange : C.success, animation: syncing ? "pulseGlow 1s infinite" : "none" }} />
              <span style={{ fontSize: 9, color: C.dim }}>{syncing ? "синхр..." : lastSync ? "синхр." : ""}</span>
            </div>
            <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 5, color: C.dim, cursor: "pointer", fontSize: 10, padding: "3px 9px", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <I.eye size={11} /> полный экран
            </button>
            <a href="/" style={{ fontSize: 9, color: C.dim, textDecoration: "none" }}>← система</a>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 14, minHeight: 0, overflow: "auto" }}>
        <BoardColumns orders={activeOrders} products={products} now={now} />
      </div>
      <div style={{ padding: "3px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 9, color: C.dim }}>Синхронизация каждые 6с · колонки: новые → фасовка → доставка</span>
        <span style={{ fontSize: 9, color: C.dim, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: C.success }} /> {"<30мин"}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: C.orange }} /> {"30–90мин"}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><I.alert size={10} /> {">90мин"}</span>
        </span>
      </div>
    </div>
  );
};

const OrdersBoardPage = () => {
  const { clientOrders, products } = useContext(AppContext);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const openBoard = () => window.open(`${window.location.href.split("?")[0]}?board=1`, "_blank");
  const activeOrders = clientOrders.filter(o => getOrderBoardStage(o));
  const urgentCount = activeOrders.filter(o => o.priority === "срочный").length;
  const deliveryCount = activeOrders.filter(o => getOrderBoardStage(o) === "delivery").length;

  return (
    <div>
      <PageH title="Доска заказов">
        <Btn onClick={openBoard} icon={<I.eye size={15} />}>Открыть полный экран</Btn>
      </PageH>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat icon={<I.tasks size={18} />} label="Активных заказов" value={activeOrders.length} color={C.primary} />
        {urgentCount > 0 && <Stat icon={<I.alert size={18} />} label="Срочных" value={urgentCount} color={C.danger} />}
        <Stat icon={<I.truck size={18} />} label="В доставке" value={deliveryCount} color={C.success} />
      </div>
      {activeOrders.length === 0 ? (
        <EmptyState icon={<I.clipboard size={34} />} title="Нет активных заказов" sub="Когда появятся новые, они сразу отобразятся на доске" />
      ) : (
        <div style={{ height: "calc(100vh - 260px)", minHeight: 420, overflow: "hidden" }}>
          <BoardColumns orders={activeOrders} products={products} now={now} />
        </div>
      )}
    </div>
  );
};

export { OrdersBoardStandalone, OrdersBoardPage };
