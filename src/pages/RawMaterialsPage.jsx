import { useState, useMemo, useContext } from "react";
import { AppContext } from "../context/AppContext.js";
import { RAW_CATEGORIES, RAW_UNITS } from "../constants/index.js";
import { fmtDate } from "../utils/dates.js";
import { C } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { Badge, Btn, Inp, Sel, Modal, Stat, Toast, TH, TD, Card, PageH, SearchBox } from "../components/ui/index.jsx";

const selStyle = { padding: "7px 9px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: "inherit" };

// RAW MATERIALS
const RawMaterialsPage = () => {
  const { rawMaterials, setRawMaterials, rawMovements, addLog } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [histModal, setHistModal] = useState(null);
  const [edit, setEdit] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("all");
  const [fUnit, setFUnit] = useState("all");
  const [fStock, setFStock] = useState("all");
  const [fSort, setFSort] = useState("name");
  const [errs, setErrs] = useState({});
  const empty = { name: "", category: RAW_CATEGORIES[0], unit: "кг", stock: "", minStock: "", costPerUnit: "" };
  const [form, setForm] = useState(empty);

  const filtered = useMemo(() => {
    let list = [...rawMaterials];
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (fCat !== "all") list = list.filter(r => r.category === fCat);
    if (fUnit !== "all") list = list.filter(r => r.unit === fUnit);
    if (fStock === "below") list = list.filter(r => r.stock <= r.minStock && r.stock > 0);
    else if (fStock === "zero") list = list.filter(r => r.stock === 0);
    else if (fStock === "normal") list = list.filter(r => r.stock > r.minStock);
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name, "ru"),
      stock: (a, b) => b.stock - a.stock,
      cost: (a, b) => (b.stock * b.costPerUnit) - (a.stock * a.costPerUnit),
      category: (a, b) => a.category.localeCompare(b.category, "ru") || a.name.localeCompare(b.name, "ru"),
    };
    return list.sort(cmp[fSort] || cmp.name);
  }, [rawMaterials, search, fCat, fUnit, fStock, fSort]);

  const summary = useMemo(() => ({
    total: filtered.length,
    belowMin: filtered.filter(r => r.stock <= r.minStock && r.stock > 0).length,
    totalValue: filtered.reduce((s, r) => s + r.stock * r.costPerUnit, 0),
    zeroStock: filtered.filter(r => r.stock === 0).length,
  }), [filtered]);

  const openNew = () => { setEdit(null); setForm(empty); setErrs({}); setModal(true); };
  const openEdit = r => { setEdit(r); setForm({ name: r.name, category: r.category, unit: r.unit, stock: r.stock, minStock: r.minStock, costPerUnit: r.costPerUnit }); setErrs({}); setModal(true); };
  const validate = () => { const e = {}; if (!form.name.trim()) e.name = "!"; if (form.stock === "" || +form.stock < 0) e.stock = "!"; if (!form.costPerUnit || +form.costPerUnit <= 0) e.costPerUnit = "!"; setErrs(e); return !Object.keys(e).length; };
  const save = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    if (edit) {
      setRawMaterials(p => p.map(r => r.id === edit.id ? { ...r, ...form, stock: +form.stock, minStock: +form.minStock, costPerUnit: +form.costPerUnit, updatedAt: now } : r));
      addLog(`Сырьё обновлено: ${form.name}`);
      setToast({ message: "Обновлено", type: "success" });
    } else {
      setRawMaterials(p => [...p, { id: Date.now(), ...form, stock: +form.stock, minStock: +form.minStock, costPerUnit: +form.costPerUnit, updatedAt: now }]);
      addLog(`Сырьё добавлено: ${form.name}`);
      setToast({ message: "Добавлено", type: "success" });
    }
    setModal(false);
  };

  return (
    <div className="raw-materials-page">
      <PageH title="Склад сырья">
        <SearchBox value={search} onChange={e => setSearch(e.target.value)} />
        <Btn onClick={openNew} icon={<I.plus size={15} />}>Добавить</Btn>
      </PageH>

      <div className="page-filter-bar">
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={selStyle}>
          <option value="all">Все категории</option>
          {RAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fUnit} onChange={e => setFUnit(e.target.value)} style={selStyle}>
          <option value="all">Все ед. изм.</option>
          {RAW_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={fStock} onChange={e => setFStock(e.target.value)} style={selStyle}>
          <option value="all">Все остатки</option>
          <option value="below">Ниже минимума</option>
          <option value="zero">Нулевой остаток</option>
          <option value="normal">В норме</option>
        </select>
        <select value={fSort} onChange={e => setFSort(e.target.value)} style={selStyle}>
          <option value="name">Сорт: название</option>
          <option value="stock">Сорт: остаток</option>
          <option value="cost">Сорт: стоимость</option>
          <option value="category">Сорт: категория</option>
        </select>
      </div>

      <div className="page-summary-row">
        <Stat icon={<I.raw size={18} />} label="Позиций" value={summary.total} color={C.primary} />
        <Stat icon={<I.alert size={18} />} label="Ниже минимума" value={summary.belowMin} color={summary.belowMin > 0 ? C.danger : C.success} />
        <Stat icon={<I.star size={18} />} label="Стоимость склада" value={`${summary.totalValue.toLocaleString("ru")}₽`} color={C.success} />
        <Stat icon={<I.box size={18} />} label="Нулевой остаток" value={summary.zeroStock} color={summary.zeroStock > 0 ? C.orange : C.dim} />
      </div>

      <Card s={{ padding: 0, overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><TH>Название</TH><TH>Категория</TH><TH>Остаток</TH><TH>Мин.</TH><TH>Цена/ед</TH><TH>Стоимость</TH><TH></TH></tr></thead>
          <tbody>{filtered.map(r => {
            const low = r.stock <= r.minStock;
            return (
              <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: low ? C.dangerBg : "transparent" }}>
                <TD s={{ fontWeight: 500 }}>{r.name} {low && <Badge color="danger" s={{ marginLeft: 6 }}>!</Badge>}</TD>
                <TD><Badge color="purple">{r.category}</Badge></TD>
                <TD s={{ fontWeight: 600, color: low ? C.danger : C.text }}>{r.stock} {r.unit}</TD>
                <TD s={{ color: C.dim }}>{r.minStock}</TD>
                <TD s={{ color: C.muted }}>{r.costPerUnit}₽</TD>
                <TD s={{ fontWeight: 600, color: C.success }}>{(r.stock * r.costPerUnit).toLocaleString("ru")}₽</TD>
                <TD><div style={{ display: "flex", gap: 4 }}>
                  <Btn v="ghost" sz="sm" onClick={() => setHistModal(r.id)} icon={<I.clock size={14} />} />
                  <Btn v="ghost" sz="sm" onClick={() => openEdit(r)} icon={<I.edit size={14} />} />
                </div></TD>
              </tr>);
          })}</tbody>
        </table></div></Card>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.dim }}><I.raw size={36} /><p style={{ marginTop: 10 }}>Не найдено</p></div>}

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? "Редактировать" : "Новое сырьё"}>
        <Inp label="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} error={errs.name} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Sel label="Категория" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} options={RAW_CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Sel label="Ед. изм." value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} options={RAW_UNITS.map(u => ({ value: u, label: u }))} />
          <Inp label="Остаток" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} error={errs.stock} />
          <Inp label="Мин. остаток" type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
          <Inp label="Цена за ед." type="number" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: e.target.value })} error={errs.costPerUnit} cStyle={{ gridColumn: "1/3" }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}><Btn v="secondary" onClick={() => setModal(false)}>Отмена</Btn><Btn onClick={save}>{edit ? "Сохранить" : "Добавить"}</Btn></div>
      </Modal>

      <Modal open={!!histModal} onClose={() => setHistModal(null)} title="История движения" width={480}>
        {histModal && (() => {
          const moves = rawMovements.filter(m => m.rawId === histModal).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
          const raw = rawMaterials.find(r => r.id === histModal);
          return (<div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>{raw?.name}</p>
            {moves.length === 0 ? <p style={{ color: C.dim }}>Нет записей</p> : moves.map((m, i) => {
              const isIn = m.type === "in" || m.type === "приход";
              const label = m.reason || m.note || m.refId || "—";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <Badge color={isIn ? "success" : "danger"}>{isIn ? "+" : "-"}{m.quantity}</Badge>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.text }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{fmtDate(m.date || m.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>);
        })()}
      </Modal>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export { RawMaterialsPage };
