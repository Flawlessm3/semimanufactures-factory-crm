/** Pipeline stages for packing/delivery board (not production order.status) */
export const PACKING_BOARD_COLUMNS = [
  { id: "new", label: "Новые" },
  { id: "packing", label: "Фасовка" },
  { id: "delivery", label: "Доставка" },
];

export function getOrderBoardStage(order = {}) {
  const status = order.status || "";
  if (status === "отгружен" || status === "отменён") return null;

  const packing = order.packingStatus || "не начата";
  const delivery = order.deliveryStatus || "ожидает";

  if (
    delivery === "в доставке" ||
    delivery === "доставлен" ||
    packing === "готов к доставке" ||
    status === "готов"
  ) {
    return "delivery";
  }

  if (packing === "фасуется" || status === "сборка") {
    return "packing";
  }

  return "new";
}

export const BOARD_STAGE_COLORS = {
  new: { bg: "rgba(30,25,18,0.9)", border: "rgba(91,141,181,0.25)", dot: "#5B8DB5", title: "#5B8DB5" },
  packing: { bg: "rgba(30,25,18,0.9)", border: "rgba(212,130,58,0.25)", dot: "#D4823A", title: "#D4823A" },
  delivery: { bg: "rgba(18,35,22,0.9)", border: "rgba(90,158,95,0.3)", dot: "#5A9E5F", title: "#5A9E5F" },
};
