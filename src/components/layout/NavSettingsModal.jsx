import { useMemo, useState, useEffect } from "react";
import { motion, LayoutGroup } from "motion/react";
import { C } from "../../theme/colors.js";
import { I } from "../../icons/Icons.jsx";
import { Btn, Modal } from "../ui/index.jsx";
import { buildBaseNavGroups } from "../../navigation/modules.js";
import { applyNavLayout, buildDefaultNavLayout, moveInList } from "../../utils/navigation.js";
import { useAppMotion } from "../../motion/MotionProvider.jsx";
import { spring } from "../../motion/presets.js";

export function NavSettingsModal({ open, onClose, navCtx, navLayout, setNavLayout }) {
  const { reduceMotion } = useAppMotion();
  const [movedKey, setMovedKey] = useState(null);

  const baseGroups = useMemo(() => buildBaseNavGroups(navCtx), [navCtx]);
  const defaultLayout = useMemo(() => buildDefaultNavLayout(baseGroups), [baseGroups]);
  const layout = navLayout || defaultLayout;

  const editableGroups = useMemo(() => {
    const visible = baseGroups
      .map(g => ({ ...g, items: (g.items || []).filter(i => i.ok) }))
      .filter(g => g.items.length > 0);
    return applyNavLayout(visible, layout);
  }, [baseGroups, layout]);

  useEffect(() => {
    if (!movedKey) return undefined;
    const t = setTimeout(() => setMovedKey(null), 700);
    return () => clearTimeout(t);
  }, [movedKey]);

  const persistLayout = (next) => setNavLayout({ ...defaultLayout, ...layout, ...next });

  const moveGroup = (index, direction) => {
    const ids = editableGroups.map(g => g.id);
    persistLayout({ groupOrder: moveInList(ids, index, direction) });
    setMovedKey(`g:${editableGroups[index]?.id}`);
  };

  const moveItem = (groupId, index, direction) => {
    const group = editableGroups.find(g => g.id === groupId);
    if (!group) return;
    const ids = group.items.map(i => i.id);
    const nextIds = moveInList(ids, index, direction);
    persistLayout({
      groupOrder: layout.groupOrder?.length ? layout.groupOrder : editableGroups.map(g => g.id),
      itemOrder: {
        ...(layout.itemOrder || {}),
        [groupId]: Object.fromEntries(nextIds.map((id, i) => [id, (i + 1) * 10])),
      },
    });
    setMovedKey(`i:${groupId}:${group.items[index]?.id}`);
  };

  const resetLayout = () => setNavLayout(buildDefaultNavLayout(baseGroups));

  const layoutTransition = reduceMotion ? { duration: 0 } : spring.soft;

  return (
    <Modal open={open} onClose={onClose} title="Настройка меню" width={520}>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Порядок групп и пунктов сохраняется для всех устройств. Доступ по ролям не меняется.
      </p>
      <LayoutGroup id="nav-settings">
        <div style={{ display: "grid", gap: 12, maxHeight: "min(60vh, 480px)", overflowY: "auto", paddingRight: 4 }}>
          {editableGroups.map((group, gi) => (
            <motion.div
              key={group.id}
              layout={!reduceMotion}
              transition={layoutTransition}
              className={`nav-layout-row${movedKey === `g:${group.id}` ? " is-moved" : ""}`}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: group.items.length ? 8 : 0 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{group.label}</span>
                <div className="nav-layout-actions">
                  <Btn sz="sm" v="secondary" onClick={() => moveGroup(gi, -1)} disabled={gi === 0} aria-label="Выше">
                    <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><I.chevDown size={14} /></span>
                  </Btn>
                  <Btn sz="sm" v="secondary" onClick={() => moveGroup(gi, 1)} disabled={gi === editableGroups.length - 1} aria-label="Ниже">
                    <I.chevDown size={14} />
                  </Btn>
                </div>
              </div>
              <div className="nav-layout-sub-list">
                {group.items.map((item, ii) => (
                  <motion.div
                    key={item.id}
                    layout={!reduceMotion}
                    transition={layoutTransition}
                    className={`nav-layout-row${movedKey === `i:${group.id}:${item.id}` ? " is-moved" : ""}`}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: ii > 0 ? `1px solid ${C.border}` : "none" }}
                  >
                    <span style={{ flex: 1, fontSize: 12, color: C.muted }}>{item.label}</span>
                    <div className="nav-layout-actions">
                      <Btn sz="sm" v="secondary" onClick={() => moveItem(group.id, ii, -1)} disabled={ii === 0} aria-label="Выше">
                        <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><I.chevDown size={13} /></span>
                      </Btn>
                      <Btn sz="sm" v="secondary" onClick={() => moveItem(group.id, ii, 1)} disabled={ii === group.items.length - 1} aria-label="Ниже">
                        <I.chevDown size={13} />
                      </Btn>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </LayoutGroup>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16, flexWrap: "wrap" }}>
        <Btn v="secondary" onClick={resetLayout}>Сбросить по умолчанию</Btn>
        <Btn onClick={onClose}>Готово</Btn>
      </div>
    </Modal>
  );
}
