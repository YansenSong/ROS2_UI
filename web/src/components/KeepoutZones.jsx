import { T } from "../shared/i18n/i18n";
import React, { useState } from "react";

import useKeepoutZones from "../shared/hooks/useKeepoutZones";

const EMPTY = { name: "", cx: "", cy: "", w: "", h: "" };

const numField = (v) => v !== "" && !Number.isNaN(Number(v));

/**
 * 管理绘制在地图上的矩形禁入区域（地图坐标系中的中心点和尺寸，单位为米）。该区域仅用于可视化和规划辅助；
 * 关于约束是否实际生效的说明，参见 useKeepoutZones。通过 "Zones" 图层开关切换显示。
 */
const KeepoutZones = () => {
  const { zones, addZone, removeZone } = useKeepoutZones();
  const [form, setForm] = useState(EMPTY);

  const valid =
    numField(form.cx) &&
    numField(form.cy) &&
    numField(form.w) &&
    numField(form.h) &&
    Number(form.w) > 0 &&
    Number(form.h) > 0;

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const add = () => {
    if (!valid) return;
    addZone(form);
    setForm(EMPTY);
  };

  const input = (k, ph, title) => (
    <input
      value={form[k]}
      onChange={set(k)}
      placeholder={ph}
      title={title}
      inputMode="decimal"
      className="w-full rounded-lg border border-borderSubtle bg-bgCard px-2 py-1 text-xs text-textWhiteHover placeholder:text-themeTextGray"
    />
  );

  return (
    <div className="flex w-full flex-col gap-2 font-[RobotoMono]">
      {zones.length > 0 && (
        <div className="flex flex-col gap-1">
          {zones.map((z) => (
            <div
              key={z.id}
              className="flex items-center justify-between rounded-lg border border-statusRed/30 bg-statusRed/5 px-2 py-1 text-xs"
            >
              <span className="truncate text-textWhiteHover">{z.name}</span>
              <span className="text-themeTextGray">
                ({z.cx.toFixed(1)}, {z.cy.toFixed(1)}) ·{" "}
                {Math.abs(z.w).toFixed(1)}×{Math.abs(z.h).toFixed(1)}m
              </span>
              <button
                onClick={() => removeZone(z.id)}
                aria-label={`Delete ${z.name}`}
                className="ml-2 text-themeTextGray hover:text-statusRed"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {input("name", "name")}
        {input("cx", "center X (m)", "Center X, in map meters")}
        {input("cy", "center Y (m)", "Center Y, in map meters")}
        {input("w", "width (m)", "Width, in meters")}
        {input("h", "height (m)", "Height, in meters")}
      </div>
      <button
        onClick={add}
        disabled={!valid}
        className="rounded-lg border border-themeBlue px-2 py-1 text-xs text-themeBlue transition-colors hover:bg-themeBlue hover:text-white disabled:opacity-40"
      >
        <T>{"Add zone"}</T>{" "}
      </button>
    </div>
  );
};

export default KeepoutZones;
