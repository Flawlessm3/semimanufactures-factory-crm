/** Build production history for an employee (outputs + legacy task fallback). */
export function buildEmployeeProductionHistory({
  employeeId,
  from,
  to,
  productionOutputs = [],
  tasks = [],
  taskEmployees = [],
  products = [],
}) {
  const coveredPairs = new Set(
    productionOutputs.filter(o => o.taskId).map(o => `${o.taskId}:${o.employeeId}`),
  );

  const inRange = (dateStr) => {
    const d = (dateStr || "").slice(0, 10);
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const items = [];

  productionOutputs
    .filter(o => o.employeeId === employeeId && inRange(o.date || o.createdAt))
    .forEach(o => {
      const p = products.find(x => x.id === o.productId);
      items.push({
        id: `out-${o.id}`,
        date: o.date || o.createdAt,
        productName: p?.name || "?",
        quantity: +o.quantity || 0,
        source: o.source === "manual"
          ? "Ручной выпуск"
          : o.taskId
            ? `Задание #${o.taskId}`
            : "Выпуск",
        taskId: o.taskId,
        note: o.comment || "",
      });
    });

  tasks
    .filter(t =>
      (t.userIds || []).includes(employeeId) &&
      (t.status === "завершено" || t.status === "просрочено") &&
      inRange(t.completedAt) &&
      !coveredPairs.has(`${t.id}:${employeeId}`),
    )
    .forEach(t => {
      const te = taskEmployees.find(x => x.taskId === t.id && x.employeeId === employeeId);
      const qty = +(te?.producedQty || 0);
      if (qty <= 0) return;
      const p = products.find(x => x.id === t.productId);
      items.push({
        id: `legacy-${t.id}`,
        date: t.completedAt,
        productName: p?.name || "?",
        quantity: qty,
        source: `Legacy task #${t.id}`,
        taskId: t.id,
        note: t.note || "",
      });
    });

  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}
