import { useState, useMemo, useContext } from "react";
import { AppContext } from "../context/AppContext.js";
import { CATEGORIES, MOVEMENT_TYPES } from "../constants/index.js";
import { fmtDate } from "../utils/dates.js";
import { C } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { Badge, Stat, TH, TD, Card, PageH, SearchBox } from "../components/ui/index.jsx";

const selStyle = { padding: "7px 9px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: "inherit" };
const inpStyle = { ...selStyle, minWidth: 130 };

const movementLabel = (type) => MOVEMENT_TYPES[type] || type;

const isOutflowType = (type) => type === "sale" || type === "order_shipment" || type === "списание-брак";

// INVENTORY MOVEMENTS JOURNAL
const InventoryJournalPage = () => {
  const { inventoryMovements, products, users } = useContext(AppContext);
  const [fProduct, setFProduct] = useState("all");
  const [fCat, setFCat] = useState("all");
  const [fType, setFType] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [search, setSearch] = useState("");
  const ap = products.filter(p => !p.deleted);

  const filtered = useMemo(() => {
    let list = [...(inventoryMovements || [])];
    if (fProduct !== "all") list = list.filter(m => m.productId === +fProduct);
    if (fCat !== "all") list = list.filter(m => {
      const p = ap.find(x => x.id === m.productId);
      return p?.category === fCat;
    });
    if (fType !== "all") list = list.filter(m => m.type === fType);
    if (fFrom) list = list.filter(m => (m.createdAt || m.date || "").slice(0, 10) >= fFrom);
    if (fTo) list = list.filter(m => (m.createdAt || m.date || "").slice(0, 10) <= fTo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => {
        const p = ap.find(x => x.id === m.productId);
        return (p?.name || "").toLowerCase().includes(q) || String(m.refId || "").toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }, [inventoryMovements, fProduct, fCat, fType, fFrom, fTo, search, ap]);

  const summary = useMemo(() => {
    let inCount = 0, inQty = 0, outCount = 0, outQty = 0;
    filtered.forEach(m => {
      const qty = Math.abs(m.quantity || 0);
      const out = m.quantity < 0 || isOutflowType(m.type);
      if (out) { outCount++; outQty += qty; }
      else { inCount++; inQty += qty; }
    });
    return { total: filtered.length, inCount, inQty, outCount, outQty, net: inQty - outQty };
  }, [filtered]);

  const typeOptions = useMemo(() => {
    const keys = new Set((inventoryMovements || []).map(m => m.type).filter(Boolean));
    Object.keys(MOVEMENT_TYPES).forEach(k => keys.add(k));
    return [...keys];
  }, [inventoryMovements]);

  return (
    <div className="inventory-journal-page">
      <PageH title="Движение товаров">
        <SearchBox value={search} onChange={e => setSearch(e.target.value)} ph="Товар или ссылка…" />
      </PageH>

      <div className="page-filter-bar">
        <select value={fProduct} onChange={e => setFProduct(e.target.value)} style={selStyle}>
          <option value="all">Все товары</option>
          {ap.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={selStyle}>
          <option value="all">Все категории</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fType} onChange={e => setFType(e.target.value)} style={selStyle}>
          <option value="all">Все операции</option>
          {typeOptions.map(k => <option key={k} value={k}>{movementLabel(k)}</option>)}
        </select>
        <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={inpStyle} title="Дата с" />
        <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={inpStyle} title="Дата по" />
      </div>

      <div className="page-summary-row">
        <Stat icon={<I.file size={18} />} label="Операций" value={summary.total} color={C.info} />
        <Stat icon={<I.plus size={18} />} label={`Приход (${summary.inCount})`} value={`+${summary.inQty}`} color={C.success} />
        <Stat icon={<I.down size={18} />} label={`Расход (${summary.outCount})`} value={`-${summary.outQty}`} color={C.danger} />
        <Stat icon={<I.chart size={18} />} label="Нетто" value={summary.net >= 0 ? `+${summary.net}` : String(summary.net)} color={summary.net >= 0 ? C.primary : C.orange} />
      </div>

      <Card s={{ padding: 0, overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
        <table className="inventory-journal-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead><tr>
            <TH>Дата</TH><TH>Товар</TH><TH>Категория</TH><TH>Операция</TH><TH>Кол-во</TH><TH>Остаток</TH><TH>Источник</TH><TH>Кто</TH>
          </tr></thead>
          <tbody>{filtered.map(m => {
            const p = ap.find(x => x.id === m.productId);
            const isPlus = m.quantity > 0 && !isOutflowType(m.type);
            const creator = m.createdBy ? users.find(u => u.id === m.createdBy) : null;
            const source = m.refId || m.source || "—";
            return (
              <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <TD s={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(m.createdAt || m.date)}</TD>
                <TD s={{ fontWeight: 500 }}>{p?.name || "—"}</TD>
                <TD>{p ? <Badge color="purple">{p.category}</Badge> : "—"}</TD>
                <TD><Badge color={isPlus ? "success" : "danger"}>{movementLabel(m.type)}</Badge></TD>
                <TD s={{ fontWeight: 700, color: isPlus ? C.success : C.danger, whiteSpace: "nowrap" }}>{isPlus ? "+" : "-"}{Math.abs(m.quantity)} {p?.unit || ""}</TD>
                <TD s={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m.balance ?? "—"} {p?.unit || ""}</TD>
                <TD s={{ color: C.dim, fontSize: 11, maxWidth: 140 }} className="single-line">{source}</TD>
                <TD s={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{creator?.name || m.createdByName || "—"}</TD>
              </tr>
            );
          })}</tbody>
        </table>
      </div></Card>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.dim }}><I.file size={36} /><p style={{ marginTop: 10 }}>Нет записей</p></div>}
    </div>
  );
};

export { InventoryJournalPage };
