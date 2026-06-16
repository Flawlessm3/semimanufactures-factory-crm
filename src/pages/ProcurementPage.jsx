import { useMemo, useState, useContext } from "react";
import { AppContext } from "../context/AppContext.js";
import { RAW_CATEGORIES } from "../constants/index.js";
import { fmtShort } from "../utils/dates.js";
import { formatMoney } from "../utils/formatters.js";
import { C } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { Badge, Stat, TH, TD, Card, Title, PageH, SearchBox, EmptyState, StatusPill } from "../components/ui/index.jsx";

const ProcurementPage = () => {
  const { productionPlans, products, rawMaterials, recipes } = useContext(AppContext);
  const [search, setSearch] = useState("");
  const [fScope, setFScope] = useState("all");
  const [fCategory, setFCategory] = useState("all");

  const activePlans = productionPlans.filter(p => p.status === "запланирован" || p.status === "в процессе");

  const procurement = useMemo(() => {
    const needs = {};
    activePlans.forEach(plan => {
      const recipe = recipes.find(r => r.productId === plan.productId);
      if (!recipe) return;
      const remaining = plan.plannedQty - plan.completedQty;
      if (remaining <= 0) return;
      recipe.items.forEach(it => {
        if (!needs[it.rawId]) needs[it.rawId] = { needed: 0, rawId: it.rawId };
        needs[it.rawId].needed += it.qty * remaining;
      });
    });
    return Object.values(needs).map(n => {
      const raw = rawMaterials.find(r => r.id === n.rawId);
      const needed = +n.needed.toFixed(2);
      const available = raw?.stock || 0;
      const toOrder = Math.max(0, +(needed - available).toFixed(2));
      const estCost = toOrder * (raw?.costPerUnit || 0);
      return {
        rawId: n.rawId,
        name: raw?.name || "?",
        category: raw?.category || "",
        unit: raw?.unit || "",
        needed,
        available,
        toOrder,
        estCost,
        shortage: toOrder > 0,
      };
    }).sort((a, b) => b.toOrder - a.toOrder);
  }, [activePlans, recipes, rawMaterials]);

  const totalCost = procurement.reduce((s, p) => s + p.estCost, 0);
  const shortages = procurement.filter(p => p.shortage);

  const applyFilters = (list) => {
    let l = [...list];
    if (fScope === "shortage") l = l.filter(p => p.shortage);
    if (fCategory !== "all") l = l.filter(p => p.category === fCategory);
    if (search) {
      const q = search.toLowerCase();
      l = l.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return l;
  };

  const filteredShortages = useMemo(() => applyFilters(shortages), [shortages, fScope, fCategory, search]);
  const filteredAll = useMemo(() => applyFilters(procurement), [procurement, fScope, fCategory, search]);

  const planBreakdown = useMemo(() => activePlans.map(plan => {
    const prod = products.find(p => p.id === plan.productId);
    const recipe = recipes.find(r => r.productId === plan.productId);
    const remaining = plan.plannedQty - plan.completedQty;
    const pct = plan.plannedQty > 0 ? Math.round((plan.completedQty / plan.plannedQty) * 100) : 0;
    const items = recipe
      ? recipe.items.map(it => {
          const raw = rawMaterials.find(r => r.id === it.rawId);
          return { name: raw?.name || "?", qty: +(it.qty * remaining).toFixed(2), unit: raw?.unit || "" };
        })
      : [];
    return {
      id: plan.id,
      product: prod?.name || "?",
      date: plan.productionDate,
      status: plan.status,
      remaining,
      plannedQty: plan.plannedQty,
      completedQty: plan.completedQty,
      pct,
      items,
      unit: prod?.unit || "",
    };
  }).sort((a, b) => a.date.localeCompare(b.date)), [activePlans, products, recipes, rawMaterials]);

  const planStatusTone = (s) => (s === "в процессе" ? "primary" : "info");

  const filterSelectStyle = {
    padding: "7px 10px",
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontSize: 12,
    fontFamily: "inherit",
  };

  return (
    <div className="procurement-page">
      <PageH
        title="Закупки"
        sub="Автоматический расчёт потребности в сырье по активным планам производства"
      >
        <SearchBox value={search} onChange={e => setSearch(e.target.value)} ph="Поиск сырья..." />
        <select
          className="procurement-filter-select"
          value={fCategory}
          onChange={e => setFCategory(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="all">Все категории</option>
          {RAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="procurement-filter-pills">
          {[["all", "Все"], ["shortage", "Только нехватка"]].map(([id, lb]) => (
            <button
              key={id}
              type="button"
              className={`procurement-filter-pill${fScope === id ? " is-active" : ""}`}
              onClick={() => setFScope(id)}
            >
              {lb}
            </button>
          ))}
        </div>
      </PageH>

      <div className="procurement-summary">
        <Stat icon={<I.tasks size={18} />} label="Активных планов" value={activePlans.length} color={C.info} />
        <Stat icon={<I.raw size={18} />} label="Позиций в расчёте" value={procurement.length} color={C.primary} />
        <Stat
          icon={<I.alert size={18} />}
          label="Нужно докупить"
          value={shortages.length}
          color={shortages.length > 0 ? C.danger : C.success}
        />
        <Stat icon={<I.star size={18} />} label="Ориент. сумма" value={formatMoney(totalCost, { compact: true })} color={C.primary} />
      </div>

      <Card s={{ marginBottom: 16 }}>
        <div className="procurement-section-head">
          <Title>Купить сейчас</Title>
          {filteredShortages.length > 0 && (
            <Badge color="danger">{filteredShortages.length} поз.</Badge>
          )}
        </div>

        {filteredShortages.length > 0 ? (
          <div className="procurement-buy-grid">
            {filteredShortages.map(p => (
              <div key={p.rawId} className="procurement-buy-card">
                <div className="procurement-buy-card-head">
                  <div className="procurement-buy-card-title">{p.name}</div>
                  {p.category && <Badge color="purple">{p.category}</Badge>}
                </div>
                <div className="procurement-buy-metrics">
                  <div className="procurement-buy-metric">
                    <span className="procurement-buy-metric-label">Нужно</span>
                    <span className="procurement-buy-metric-value">{p.needed} {p.unit}</span>
                  </div>
                  <div className="procurement-buy-metric">
                    <span className="procurement-buy-metric-label">На складе</span>
                    <span className="procurement-buy-metric-value">{p.available} {p.unit}</span>
                  </div>
                  <div className="procurement-buy-metric procurement-buy-metric--shortage">
                    <span className="procurement-buy-metric-label">Нехватка</span>
                    <span className="procurement-buy-metric-value">{p.toOrder} {p.unit}</span>
                  </div>
                  <div className="procurement-buy-metric">
                    <span className="procurement-buy-metric-label">Ориент. цена</span>
                    <span className="procurement-buy-metric-value">
                      {p.estCost > 0 ? formatMoney(p.estCost) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<I.check size={34} />}
            title={shortages.length === 0 ? "Сырья хватает" : "Нет позиций по фильтрам"}
            sub={
              shortages.length === 0
                ? "По активным планам производства закупки не требуются"
                : "Измените фильтры или поиск, чтобы увидеть позиции"
            }
          />
        )}
      </Card>

      <Card s={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div className="procurement-section-head" style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Все позиции расчёта</span>
          <span style={{ fontSize: 11, color: C.dim }}>{filteredAll.length} из {procurement.length}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <TH>Сырьё</TH>
                <TH>Категория</TH>
                <TH>Нужно</TH>
                <TH>На складе</TH>
                <TH>Заказать</TH>
                <TH>Ориент. цена</TH>
                <TH>Статус</TH>
              </tr>
            </thead>
            <tbody>
              {filteredAll.map(p => (
                <tr
                  key={p.rawId}
                  className={`procurement-table-row${p.shortage ? " procurement-table-row--shortage" : ""}`}
                >
                  <TD s={{ fontWeight: 500 }}>{p.name}</TD>
                  <TD>{p.category ? <Badge color="purple">{p.category}</Badge> : "—"}</TD>
                  <TD s={{ fontWeight: 600 }}>{p.needed} {p.unit}</TD>
                  <TD s={{ color: p.shortage ? C.danger : C.text }}>{p.available} {p.unit}</TD>
                  <TD s={{ fontWeight: 700, color: p.shortage ? C.danger : C.success }}>
                    {p.toOrder > 0 ? `${p.toOrder} ${p.unit}` : "✓"}
                  </TD>
                  <TD s={{ color: C.muted }}>{p.estCost > 0 ? formatMoney(p.estCost) : "—"}</TD>
                  <TD>
                    <StatusPill tone={p.shortage ? "danger" : "success"}>
                      {p.shortage ? "докупить" : "хватает"}
                    </StatusPill>
                  </TD>
                </tr>
              ))}
              {filteredAll.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: "center", color: C.dim, fontSize: 13 }}>
                    Нет позиций по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <Title>Расход по планам</Title>
        {planBreakdown.length > 0 ? (
          <div className="procurement-plan-grid">
            {planBreakdown.map(pb => (
              <div key={pb.id} className="procurement-plan-card" data-status={pb.status === "в процессе" ? "active" : "planned"}>
                <div className="procurement-plan-card-head">
                  <div className="procurement-plan-card-main">
                    <div className="procurement-plan-product">{pb.product}</div>
                    <div className="procurement-plan-meta">
                      <span>{fmtShort(pb.date)}</span>
                      <span>·</span>
                      <span>{pb.remaining} {pb.unit} к выпуску</span>
                    </div>
                  </div>
                  <StatusPill tone={planStatusTone(pb.status)}>{pb.status}</StatusPill>
                </div>
                <div className="procurement-plan-progress">
                  <div className="procurement-plan-progress-labels">
                    <span>Выполнено {pb.completedQty} / {pb.plannedQty} {pb.unit}</span>
                    <span>{pb.pct}%</span>
                  </div>
                  <div className="procurement-plan-progress-track">
                    <div
                      className="procurement-plan-progress-fill"
                      style={{
                        width: `${Math.min(100, pb.pct)}%`,
                        background: pb.pct >= 100 ? C.success : pb.pct >= 50 ? C.primary : C.orange,
                      }}
                    />
                  </div>
                </div>
                {pb.items.length > 0 ? (
                  <div className="procurement-plan-items">
                    {pb.items.map((it, i) => (
                      <Badge key={i} color="info" s={{ fontSize: 11 }}>
                        {it.name}: {it.qty} {it.unit}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="procurement-plan-empty">Рецептура не задана</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<I.tasks size={32} />}
            title="Нет активных планов"
            sub="Добавьте план производства — расчёт закупок появится автоматически"
          />
        )}
      </Card>
    </div>
  );
};

export { ProcurementPage };
