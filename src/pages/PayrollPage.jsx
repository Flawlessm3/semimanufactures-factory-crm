import { useState, useMemo, useContext } from "react";
import { AppContext } from "../context/AppContext.js";
import { ROLES, PAYROLL_STATUSES, PAY_TYPES } from "../constants/index.js";
import { fmtDate, fmtShort } from "../utils/dates.js";
import { formatMoney } from "../utils/formatters.js";
import { getPresenceDaySet } from "../utils/attendanceStats.js";
import { buildEmployeeProductionHistory } from "../utils/productionHistory.js";
import { C } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { Badge, Btn, Inp, Sel, Txa, Modal, MetricCard, Toast, PageH, EmptyState, Card } from "../components/ui/index.jsx";
import { apiFetch } from "../api/client.js";

const PayrollPage = () => {
  const {
    users, productionOutputs, employeeHistory, baseSalaries, payrollRecords, setPayrollRecords,
    currentUser, addLog, tasks, taskEmployees, products, marks, applyServerState,
  } = useContext(AppContext);

  const role = ROLES.find(r => r.id === currentUser.roleId);
  const canManagePayroll = ["admin", "owner", "manager"].includes(role?.name);

  const getMonday = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [week, setWeek] = useState(() => getMonday(new Date()));
  const [statusModal, setStatusModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [settingsModal, setSettingsModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [settingsFrm, setSettingsFrm] = useState({
    payType: "фиксированная",
    baseSalary: "",
    pieceRate: "",
    fixedDayRate: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const weekStart = new Date(`${week}T00:00:00`);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const prevWeek = () => { const d = new Date(week); d.setDate(d.getDate() - 7); setWeek(d.toISOString().slice(0, 10)); };
  const nextWeek = () => { const d = new Date(week); d.setDate(d.getDate() + 7); setWeek(d.toISOString().slice(0, 10)); };

  const workers = users.filter(u => u.status === "active" && u.roleId !== 4);

  const workerStats = useMemo(() => workers.map(w => {
    const coveredPairs = new Set(
      (productionOutputs || []).filter(o => o.taskId).map(o => `${o.taskId}:${o.employeeId}`),
    );
    const outputs = (productionOutputs || []).filter(
      o => o.employeeId === w.id && o.date.slice(0, 10) >= week && o.date.slice(0, 10) <= weekEndStr,
    );
    const legacyUnits = tasks.filter(t =>
      (t.status === "завершено" || t.status === "просрочено") &&
      t.completedAt &&
      t.completedAt.slice(0, 10) >= week &&
      t.completedAt.slice(0, 10) <= weekEndStr &&
      (t.userIds || []).includes(w.id) &&
      !coveredPairs.has(`${t.id}:${w.id}`),
    ).reduce((s, t) => {
      const te = taskEmployees.find(x => x.taskId === t.id && x.employeeId === w.id);
      return s + (+(te?.producedQty || 0));
    }, 0);

    const daysWorked = getPresenceDaySet(w.id, {
      marks,
      employeeHistory,
      from: week,
      to: weekEndStr,
    }).size;

    const totalUnits = outputs.reduce((s, o) => s + o.quantity, 0) + legacyUnits;
    const baseMonthly = baseSalaries[w.id] || 0;
    const pieceRate = w.pieceRate || 0;
    const fixedDayRate = w.fixedDayRate || 0;

    let piecePay = 0;
    let basePay = 0;
    if (w.payType === "сдельная") {
      piecePay = pieceRate * totalUnits;
    } else if (w.payType === "фиксированная") {
      basePay = baseMonthly > 0 ? Math.round(baseMonthly / 4.33) : fixedDayRate * daysWorked;
    } else {
      basePay = fixedDayRate * daysWorked;
      piecePay = pieceRate * totalUnits;
    }
    const total = +(basePay + piecePay).toFixed(2);

    const rec = (payrollRecords || []).find(r => r.employeeId === w.id && r.weekStart === week) || {
      id: null, employeeId: w.id, weekStart: week, basePay, piecePay, total,
      status: total > 0 ? "начислено" : "—", comment: "",
    };

    return { w, daysWorked, totalUnits, basePay, piecePay, total, rec };
  }), [workers, productionOutputs, employeeHistory, baseSalaries, payrollRecords, week, weekEndStr, marks, tasks, taskEmployees]);

  const payStatusColor = s => {
    if (s === "подтверждено к выплате") return "primary";
    if (s === "причина подтверждена") return "success";
    if (s === "удержано") return "danger";
    if (s === "перенесено") return "orange";
    return "info";
  };

  const setStatus = (emp, rec, status, comment) => {
    const now = new Date().toISOString();
    if (rec.id) {
      setPayrollRecords(p => p.map(r => r.id === rec.id ? { ...r, status, comment, updatedBy: currentUser.id, updatedAt: now } : r));
    } else {
      setPayrollRecords(p => [...(p || []), {
        id: Date.now(), employeeId: emp.id, weekStart: week, basePay: rec.basePay, piecePay: rec.piecePay,
        total: rec.total, status, comment, createdBy: currentUser.id, createdAt: now,
      }]);
    }
    addLog(`Расчёт: ${emp.name.split(" ")[0]} — ${status}`);
    setToast({ message: "Статус обновлён", type: "success" });
    setStatusModal(null);
  };

  const openSettings = (w) => {
    setSettingsModal(w);
    setSettingsFrm({
      payType: w.payType || "фиксированная",
      baseSalary: baseSalaries[w.id] || "",
      pieceRate: w.pieceRate || "",
      fixedDayRate: w.fixedDayRate || "",
    });
  };

  const saveSettings = async () => {
    if (!settingsModal || savingSettings) return;
    setSavingSettings(true);
    try {
      const r = await apiFetch("/api/actions/payroll-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: settingsModal.id,
          payType: settingsFrm.payType,
          baseSalary: +settingsFrm.baseSalary || 0,
          pieceRate: +settingsFrm.pieceRate || 0,
          fixedDayRate: +settingsFrm.fixedDayRate || 0,
        }),
      });
      if (!r) {
        setToast({ message: "Нет соединения с сервером", type: "error" });
        return;
      }
      const data = await r.json();
      if (!r.ok) {
        setToast({ message: data.error || "Ошибка сохранения", type: "error" });
        return;
      }
      applyServerState(data.state);
      setToast({ message: "Настройки оплаты сохранены", type: "success" });
      setSettingsModal(null);
    } catch {
      setToast({ message: "Ошибка сохранения", type: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  const openHistory = (w) => setHistoryModal(w);

  const historyItems = useMemo(() => {
    if (!historyModal) return [];
    return buildEmployeeProductionHistory({
      employeeId: historyModal.id,
      from: week,
      to: weekEndStr,
      productionOutputs,
      tasks,
      taskEmployees,
      products,
    });
  }, [historyModal, week, weekEndStr, productionOutputs, tasks, taskEmployees, products]);

  const totalAll = workerStats.reduce((s, ws) => s + ws.total, 0);
  const weekLabel = `${fmtShort(week)} — ${fmtShort(weekEndStr)}`;
  const pieceTotal = workerStats.reduce((s, ws) => s + ws.piecePay, 0);
  const baseTotal = workerStats.reduce((s, ws) => s + ws.basePay, 0);
  const producedTotal = workerStats.reduce((s, ws) => s + ws.totalUnits, 0);

  return (
    <div>
      <PageH title="Расчёт оплаты">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevWeek} style={{ padding: "6px 10px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 15, lineHeight: 1 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, minWidth: 170, textAlign: "center" }}>{weekLabel}</span>
          <button onClick={nextWeek} style={{ padding: "6px 10px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 15, lineHeight: 1 }}>›</button>
        </div>
        <button onClick={() => setWeek(getMonday(new Date()))} style={{ padding: "6px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Тек. неделя</button>
      </PageH>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        <MetricCard label="Всего начислено" value={formatMoney(totalAll)} tone="primary" />
        <MetricCard label="Сдельная оплата" value={formatMoney(pieceTotal)} tone="success" />
        <MetricCard label="Фиксированная" value={formatMoney(baseTotal)} tone="neutral" />
        <MetricCard label="Произведено" value={`${producedTotal} ед.`} tone="info" />
        <MetricCard label="Сотрудников" value={workers.length} tone="info" />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {workerStats.map(({ w, daysWorked, totalUnits, basePay, piecePay, total, rec }) => {
          const clr = payStatusColor(rec.status);
          return (
            <Card key={w.id} variant="data" s={{ borderLeft: "none" }}>
              <div className="payroll-row" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "grid", placeItems: "center", fontWeight: 700, color: C.primary, flexShrink: 0 }}>{w.name.charAt(0)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{w.jobTitle || "—"} · {w.payType || "—"}</div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{daysWorked}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>дней</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <button type="button" className="production-history-pill" onClick={() => openHistory(w)} title="История выработки">
                    <span className="production-history-pill-value">{totalUnits}</span>
                    <span className="production-history-pill-label">единиц · история</span>
                  </button>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: basePay > 0 ? C.muted : C.dim }}>{formatMoney(basePay)}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>фикс</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: piecePay > 0 ? C.muted : C.dim }}>{formatMoney(piecePay)}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>сдельно</div>
                </div>
                <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    {total > 0
                      ? <div style={{ fontSize: 19, fontWeight: 800, color: C.success }}>{formatMoney(total)}</div>
                      : <div style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>Нет начисления</div>}
                    <div style={{ fontSize: 10, color: C.dim }}>итого</div>
                  </div>
                  <Badge color={clr} s={{ fontSize: 10 }}>{rec.status}</Badge>
                </div>
                {canManagePayroll ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    <Btn v="ghost" onClick={() => setStatusModal({ rec, emp: w })} icon={<I.clip size={14} />} style={{ width: 32, height: 32, padding: 0, justifyContent: "center" }} />
                    <Btn v="ghost" onClick={() => openSettings(w)} icon={<I.edit size={14} />} style={{ width: 32, height: 32, padding: 0, justifyContent: "center" }} />
                  </div>
                ) : <div />}
              </div>
              {rec.comment && <div style={{ marginTop: 6, fontSize: 11, color: C.dim, fontStyle: "italic", paddingTop: 6, borderTop: `1px solid ${C.border}` }}>{rec.comment}</div>}
            </Card>
          );
        })}
        {workerStats.length === 0 && <div style={{ textAlign: "center", padding: 50, color: C.dim }}>Нет активных сотрудников</div>}
      </div>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Статус выплаты" width={380}>
        {statusModal && (
          <div>
            <div style={{ marginBottom: 12, padding: "10px 14px", background: C.surface2, borderRadius: 8 }}>
              <div style={{ fontWeight: 700, color: C.text }}>{statusModal.emp.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Итого: <strong style={{ color: C.success }}>{formatMoney(statusModal.rec.total)}</strong> · неделя {week}</div>
            </div>
            <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              {PAYROLL_STATUSES.map(s => {
                const active = statusModal.rec.status === s;
                const c = payStatusColor(s);
                return (
                  <button key={s} onClick={() => setStatus(statusModal.emp, statusModal.rec, s, statusModal.rec.comment || "")} style={{ padding: "10px 14px", background: active ? `${C[c]}20` : C.bg, border: `1px solid ${active ? C[c] : C.border}`, borderRadius: 8, color: active ? C[c] : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 400, textAlign: "left" }}>
                    {s}
                  </button>
                );
              })}
            </div>
            <Txa label="Комментарий" value={statusModal.rec.comment || ""} onChange={e => setStatusModal(m => ({ ...m, rec: { ...m.rec, comment: e.target.value } }))} placeholder="Примечание..." />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn v="secondary" onClick={() => setStatusModal(null)}>Закрыть</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!settingsModal} onClose={() => setSettingsModal(null)} title="Настройки оплаты" width={420}>
        {settingsModal && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13, color: C.muted }}>Сотрудник: <strong style={{ color: C.text }}>{settingsModal.name}</strong></div>
            <Sel label="Тип оплаты" value={settingsFrm.payType} onChange={e => setSettingsFrm(f => ({ ...f, payType: e.target.value }))} options={PAY_TYPES.map(t => ({ value: t, label: t }))} />
            {(settingsFrm.payType === "фиксированная" || settingsFrm.payType === "смешанная") && (
              <>
                <Inp label="Фиксированная сумма, ₽/мес" type="number" min="0" value={settingsFrm.baseSalary} onChange={e => setSettingsFrm(f => ({ ...f, baseSalary: e.target.value }))} placeholder="0 = не задана" />
                <div style={{ fontSize: 11, color: C.dim, marginTop: -6, marginBottom: 10 }}>Неделя считается как месячная сумма / 4.33</div>
              </>
            )}
            {(settingsFrm.payType === "сдельная" || settingsFrm.payType === "смешанная") && (
              <>
                <Inp label="Ставка за единицу, ₽" type="number" min="0" value={settingsFrm.pieceRate} onChange={e => setSettingsFrm(f => ({ ...f, pieceRate: e.target.value }))} />
                <div style={{ fontSize: 11, color: C.dim, marginTop: -6, marginBottom: 10 }}>Начисление = произведено × ставка за единицу</div>
              </>
            )}
            <Inp label="Фиксированная ставка за день, ₽ (fallback)" type="number" min="0" value={settingsFrm.fixedDayRate} onChange={e => setSettingsFrm(f => ({ ...f, fixedDayRate: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <Btn v="secondary" onClick={() => setSettingsModal(null)}>Отмена</Btn>
              <Btn onClick={saveSettings} disabled={savingSettings}>{savingSettings ? "Сохранение…" : "Сохранить"}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={historyModal ? `История выработки: ${historyModal.name.split(" ").slice(0, 2).join(" ")}` : ""} width={520}>
        {historyModal && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              <div style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{historyItems.reduce((s, i) => s + i.quantity, 0)}</div>
                <div style={{ fontSize: 10, color: C.dim }}>всего за неделю</div>
              </div>
              <div style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{historyItems.length}</div>
                <div style={{ fontSize: 10, color: C.dim }}>записей</div>
              </div>
              <div style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{historyItems[0] ? fmtShort(historyItems[0].date) : "—"}</div>
                <div style={{ fontSize: 10, color: C.dim }}>последняя</div>
              </div>
            </div>
            {historyItems.length === 0 ? (
              <EmptyState title="За выбранную неделю выработки нет" sub={`${weekLabel}`} />
            ) : (
              <div style={{ maxHeight: "min(50vh, 360px)", overflowY: "auto", display: "grid", gap: 8 }}>
                {historyItems.map(item => (
                  <div key={item.id} style={{ padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(item.date)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>{item.quantity} ед.</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.productName}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{item.source}</div>
                    {item.note && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: "italic" }}>{item.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export { PayrollPage };
