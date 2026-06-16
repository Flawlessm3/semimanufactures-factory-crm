/** Apply saved layout order to filtered nav groups. Role gates (`ok`) stay authoritative. */
export function applyNavLayout(groups = [], layout = null) {
  if (!layout || typeof layout !== "object") {
    return sortNavGroups(groups);
  }

  const groupOrder = Array.isArray(layout.groupOrder) ? layout.groupOrder : [];
  const itemOrder = layout.itemOrder && typeof layout.itemOrder === "object" ? layout.itemOrder : {};

  const orderedGroups = [...groups]
    .map(g => ({
      ...g,
      items: [...(g.items || [])]
        .filter(i => i.ok)
        .sort((a, b) => {
          const orderA = itemOrder[g.id]?.[a.id] ?? a.order ?? 0;
          const orderB = itemOrder[g.id]?.[b.id] ?? b.order ?? 0;
          return orderA - orderB;
        }),
    }))
    .filter(g => g.items.length > 0)
    .sort((a, b) => {
      const ia = groupOrder.indexOf(a.id);
      const ib = groupOrder.indexOf(b.id);
      const orderA = ia >= 0 ? ia : (a.order ?? 999);
      const orderB = ib >= 0 ? ib : (b.order ?? 999);
      return orderA - orderB;
    });

  return orderedGroups;
}

export function sortNavGroups(groups = []) {
  return groups
    .map(g => ({
      ...g,
      items: [...(g.items || [])].filter(i => i.ok).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter(g => g.items.length > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function buildDefaultNavLayout(groups = []) {
  return {
    groupOrder: groups.map(g => g.id),
    itemOrder: Object.fromEntries(
      groups.map(g => [g.id, Object.fromEntries((g.items || []).map(it => [it.id, it.order ?? 0]))]),
    ),
  };
}

export function moveInList(list, index, direction) {
  const next = [...list];
  const target = index + direction;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
