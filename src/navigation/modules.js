import { I } from "../icons/Icons.jsx";

/** Base sidebar modules — permission gates via `ok`, ordering via `order` */
export function buildBaseNavGroups(ctx) {
  const {
    isPacker, isCourier, isLepstitsa, isWorker,
    isManagerLikeRole, isSuperAdmin,
  } = ctx;

  if (isPacker) {
    return [
      { id: "main", label: "Главная", icon: I.home, order: 10, items: [
        { id: "dashboard", label: "Главная", order: 10, ok: true },
      ]},
      { id: "sales", label: "Фасовка", icon: I.box, order: 20, items: [
        { id: "packing", label: "Фасовка", order: 10, ok: true },
      ]},
      { id: "system", label: "Система", icon: I.gear, order: 30, items: [
        { id: "marks", label: "Посещаемость", order: 10, ok: true },
        { id: "notifications", label: "Уведомления", order: 20, ok: true },
      ]},
    ];
  }

  if (isCourier) {
    return [
      { id: "main", label: "Главная", icon: I.home, order: 10, items: [
        { id: "dashboard", label: "Главная", order: 10, ok: true },
      ]},
      { id: "sales", label: "Доставка", icon: I.truck, order: 20, items: [
        { id: "delivery", label: "Доставка", order: 10, ok: true },
      ]},
      { id: "system", label: "Система", icon: I.gear, order: 30, items: [
        { id: "marks", label: "Посещаемость", order: 10, ok: true },
        { id: "notifications", label: "Уведомления", order: 20, ok: true },
      ]},
    ];
  }

  if (isLepstitsa || isWorker) {
    return [
      { id: "main", label: "Главная", icon: I.home, order: 10, items: [
        { id: "dashboard", label: "Главная", order: 10, ok: true },
      ]},
      { id: "production", label: "Производство", icon: I.factory, order: 20, items: [
        { id: "tasks", label: "Задания", order: 10, ok: true },
        { id: "workerHistory", label: "История", order: 20, ok: true },
      ]},
      { id: "system", label: "Система", icon: I.gear, order: 30, items: [
        { id: "marks", label: "Посещаемость", order: 10, ok: true },
        { id: "notifications", label: "Уведомления", order: 20, ok: true },
      ]},
    ];
  }

  return [
    { id: "main", label: "Главная", icon: I.home, order: 10, items: [
      { id: "dashboard", label: "Главная", order: 10, ok: true },
    ]},
    { id: "production", label: "Производство", icon: I.factory, order: 20, items: [
      { id: "tasks", label: "Задания", order: 10, ok: true },
      { id: "products", label: "Товары", order: 20, ok: true },
      { id: "prodOutput", label: "Выпуск", order: 30, ok: true },
      { id: "planning", label: "Планирование", order: 40, ok: isManagerLikeRole },
      { id: "batches", label: "Партии", order: 50, ok: isManagerLikeRole },
      { id: "defects", label: "Брак", order: 60, ok: isManagerLikeRole },
    ]},
    { id: "warehouse", label: "Склад", icon: I.warehouse, order: 30, items: [
      { id: "raw", label: "Сырьё", order: 10, ok: isManagerLikeRole },
      { id: "deliveries", label: "Поставки", order: 20, ok: isManagerLikeRole },
      { id: "procurement", label: "Закупки", order: 30, ok: isManagerLikeRole },
    ]},
    { id: "sales", label: "Торговля", icon: I.truck, order: 40, items: [
      { id: "clients", label: "Магазины", order: 10, ok: isManagerLikeRole },
      { id: "sales", label: "Продажи", order: 20, ok: isManagerLikeRole },
      { id: "inventory", label: "Движение", order: 30, ok: isManagerLikeRole },
      { id: "ordersBoard", label: "Доска заказов", order: 40, ok: isManagerLikeRole },
      { id: "packing", label: "Фасовка", order: 50, ok: isManagerLikeRole },
      { id: "delivery", label: "Доставка", order: 60, ok: isManagerLikeRole },
      { id: "debts", label: "Долги магазинов", order: 70, ok: isManagerLikeRole },
    ]},
    { id: "staff", label: "Персонал", icon: I.people, order: 50, items: [
      { id: "empstats", label: "KPI", order: 10, ok: isManagerLikeRole },
      { id: "salary", label: "Расчёт оплаты", order: 20, ok: isManagerLikeRole },
      { id: "workerHistory", label: "История", order: 30, ok: true },
      { id: "marks", label: "Посещаемость", order: 40, ok: true },
      { id: "users", label: "Пользователи", order: 50, ok: isSuperAdmin },
    ]},
    { id: "analytics", label: "Аналитика", icon: I.analytics, order: 60, items: [
      { id: "reports", label: "Отчёты", order: 10, ok: isManagerLikeRole },
      { id: "profitAnalytics", label: "Прибыль", order: 20, ok: isManagerLikeRole },
      { id: "logs", label: "Журнал", order: 30, ok: isSuperAdmin },
    ]},
    { id: "system", label: "Система", icon: I.gear, order: 70, items: [
      { id: "notifications", label: "Уведомления", order: 10, ok: true },
      { id: "cameras", label: "Камеры", order: 20, ok: isManagerLikeRole },
      { id: "trash", label: "Корзина", order: 30, ok: isSuperAdmin },
    ]},
  ];
}
