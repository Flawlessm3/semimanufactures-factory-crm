function markDayKey(m) {
  return (m.time || m.createdAt || "").slice(0, 10);
}

/** Mark counts as presence (not уход/отсутствие alone). */
function isPresenceMark(m) {
  const type = m.type || m.markType;
  if (type === "отсутствие" || type === "уход") return false;
  if (type === "приход" || type === "опоздание") return true;
  if (m.markType === "присутствие" || m.markType === "приход") return true;
  return false;
}

/** Unique presence days for an employee (optional date range). */
export function getPresenceDaySet(employeeId, { marks = [], employeeHistory = [], from, to } = {}) {
  const days = new Set();

  marks
    .filter(m => m.employeeId === employeeId)
    .forEach(m => {
      if (!isPresenceMark(m)) return;
      const day = markDayKey(m);
      if (!day) return;
      if (from && day < from) return;
      if (to && day > to) return;
      days.add(day);
    });

  employeeHistory
    .filter(h => h.employeeId === employeeId)
    .forEach(h => {
      if (h.attendance === "absent") return;
      if (h.attendance === "present" || h.attendance === "late" || (+h.producedQty || 0) > 0) {
        const day = h.date;
        if (!day) return;
        if (from && day < from) return;
        if (to && day > to) return;
        days.add(day);
      }
    });

  return days;
}

export function getPresenceDays(employeeId, opts = {}) {
  return getPresenceDaySet(employeeId, opts).size;
}
