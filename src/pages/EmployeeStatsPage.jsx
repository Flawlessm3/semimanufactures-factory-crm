import { useState, useMemo, useContext } from "react";
import { AppContext } from "../context/AppContext.js";
import { CC, C } from "../theme/colors.js";
import { Badge, Modal, PageH, Card, Title, EmptyState, TH, TD } from "../components/ui/index.jsx";
import { GlassChartTooltip } from "../components/charts/GlassChartTooltip.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getPresenceDays } from "../utils/attendanceStats.js";
import { buildEmployeeProductionHistory } from "../utils/productionHistory.js";
import { fmtDate } from "../utils/dates.js";

const EmployeeStatsPage = () => {
  const { users, tasks, marks, taskEmployees, productionOutputs, employeeHistory, products } = useContext(AppContext);
  const [historyModal, setHistoryModal] = useState(null);
  const workers = users.filter(u => u.roleId === 3);

  const stats = useMemo(() => workers.map(w => {
    const wTasks = tasks.filter(t => (t.userIds || []).includes(w.id));
    const done = wTasks.filter(t => t.status === "завершено" || t.status === "просрочено");
    const onTime = done.filter(t => t.status === "завершено" && new Date(t.completedAt) <= new Date(t.deadline));

    const coveredPairs = new Set(
      (productionOutputs || []).filter(o => o.taskId).map(o => `${o.taskId}:${o.employeeId}`),
    );
    const fromOutputs = (productionOutputs || []).filter(o => o.employeeId === w.id).reduce((s, o) => s + o.quantity, 0);
    const legacyUnits = tasks.filter(t =>
      (t.status === "завершено" || t.status === "просрочено") &&
      (t.userIds || []).includes(w.id) &&
      !coveredPairs.has(`${t.id}:${w.id}`),
    ).reduce((s, t) => {
      const te = taskEmployees.find(x => x.taskId === t.id && x.employeeId === w.id);
      return s + (+(te?.producedQty || 0));
    }, 0);
    const produced = fromOutputs + legacyUnits;

    const avgTime = done.length ? done.reduce((s, t) => {
      const hrs = (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
      return s + hrs;
    }, 0) / done.length : 0;
    const activeDays = new Set(done.map(t => t.completedAt?.slice(0, 10)).filter(Boolean)).size || 1;
    const presenceDays = getPresenceDays(w.id, { marks, employeeHistory });

    return {
      id: w.id,
      name: w.name,
      shortName: w.name.split(" ").slice(0, 2).join(" "),
      total: wTasks.length,
      done: done.length,
      pending: wTasks.filter(t => t.status === "назначено" || t.status === "в работе").length,
      onTime: onTime.length,
      onTimePct: done.length ? (onTime.length / done.length * 100).toFixed(0) : 0,
      produced,
      avgTime: avgTime.toFixed(1),
      completionPct: wTasks.length ? (done.length / wTasks.length * 100).toFixed(0) : 0,
      perDay: (produced / activeDays).toFixed(0),
      rating: done.length ? (onTime.length / done.length * 50 + produced / Math.max(1, wTasks.length) * 50).toFixed(0) : 0,
      presenceDays,
    };
  }).sort((a, b) => b.rating - a.rating), [workers, tasks, marks, taskEmployees, productionOutputs, employeeHistory]);

  const chartData = stats.map(s => ({ name: s.shortName, План: s.total, Факт: s.done, Произведено: s.produced }));

  const historyItems = useMemo(() => {
    if (!historyModal) return [];
    return buildEmployeeProductionHistory({
      employeeId: historyModal.id,
      productionOutputs,
      tasks,
      taskEmployees,
      products,
    });
  }, [historyModal, productionOutputs, tasks, taskEmployees, products]);

  return (
    <div>
      <PageH title="Статистика сотрудников" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14, marginBottom: 18 }}>
        <Card><Title>План vs Факт</Title>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fill: C.dim, fontSize: 10 }} /><YAxis tick={{ fill: C.dim, fontSize: 10 }} />
              <Tooltip content={<GlassChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="План" fill={C.info} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Факт" fill={C.success} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card><Title>Рейтинг сотрудников</Title>
          {stats.map((s, i) => {
            const pct = Math.min(100, +s.rating);
            return (
              <div key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${CC[i]}15`, color: CC[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{s.shortName}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{s.rating}</span>
                </div>
                <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: CC[i], borderRadius: 3, transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
      <Card s={{ padding: 0, overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
        <table className="worker-history-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}><thead><tr>
          <TH>Сотрудник</TH><TH>Заданий</TH><TH>Выполнено</TH><TH>% вып.</TH><TH>В срок</TH><TH>Произведено</TH><TH>Ср. время</TH><TH>В день</TH><TH>Присутствие</TH><TH>Рейтинг</TH>
        </tr></thead>
          <tbody>{stats.map((s, i) => (
            <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <TD s={{ fontWeight: 500 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${CC[i]}15`, color: CC[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                {s.shortName}
              </div></TD>
              <TD s={{ textAlign: "center" }}>{s.total}</TD>
              <TD s={{ fontWeight: 600, textAlign: "center" }}>{s.done}</TD>
              <TD s={{ textAlign: "center" }}><Badge color={+s.completionPct >= 80 ? "success" : +s.completionPct >= 50 ? "primary" : "danger"}>{s.completionPct}%</Badge></TD>
              <TD s={{ textAlign: "center" }}><Badge color={+s.onTimePct >= 80 ? "success" : +s.onTimePct >= 50 ? "primary" : "danger"}>{s.onTimePct}%</Badge></TD>
              <TD s={{ textAlign: "center" }}>
                <button type="button" className="production-history-pill" onClick={() => setHistoryModal(stats.find(x => x.id === s.id) || { id: s.id, shortName: s.shortName })} style={{ margin: "0 auto" }}>
                  <span className="production-history-pill-value">{s.produced}</span>
                  <span className="production-history-pill-label">история</span>
                </button>
              </TD>
              <TD s={{ color: C.muted, textAlign: "center" }}>{s.avgTime}ч</TD>
              <TD s={{ fontWeight: 600, textAlign: "center" }}>{s.perDay}</TD>
              <TD s={{ textAlign: "center" }}><Badge color="purple">{s.presenceDays} дн.</Badge></TD>
              <TD s={{ textAlign: "center" }}><span style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{s.rating}</span></TD>
            </tr>
          ))}</tbody>
        </table></div></Card>

      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={historyModal ? `История выработки: ${historyModal.shortName || historyModal.name}` : ""} width={520}>
        {historyModal && (
          historyItems.length === 0 ? (
            <EmptyState title="Выработки пока нет" />
          ) : (
            <div style={{ maxHeight: "min(50vh, 360px)", overflowY: "auto", display: "grid", gap: 8 }}>
              {historyItems.slice(0, 50).map(item => (
                <div key={item.id} style={{ padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(item.date)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>{item.quantity} ед.</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.productName}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>{item.source}</div>
                </div>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export { EmployeeStatsPage };
