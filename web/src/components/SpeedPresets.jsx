import React, { useState } from "react";

import useSpeedPresets from "../shared/hooks/useSpeedPresets";
import { useT } from "../shared/i18n/i18n";

/**
 * Map 页面的命名速度上限配置。点击预设会通过 onApply 将其限制应用到手动驾驶速度上限；操作员也可以将当前上限保存为新的命名预设。
 */
const SpeedPresets = ({ value, onApply }) => {
  const { t } = useT();
  const { presets, addPreset, removePreset } = useSpeedPresets();
  const [name, setName] = useState("");

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addPreset(trimmed, value);
    setName("");
  };

  return (
    <div className="dashboard-card flex w-full shrink-0 flex-col gap-2 p-3 font-[RobotoMono] sm:w-[220px]">
      <p className="text-xs uppercase tracking-wider text-themeTextGray">
        {t("Speed Presets")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = Math.abs(p.linear - value) < 0.001;
          return (
            <span
              key={p.id}
              className={`group inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
                active
                  ? "border-themeBlue bg-themeBlue/10 text-themeBlue"
                  : "border-borderSubtle text-themeTextGray hover:border-themeBlue"
              }`}
            >
              <button onClick={() => onApply(p.linear)} title={`${p.linear} m/s`}>
                {p.name} · {p.linear.toFixed(2)}
              </button>
              <button
                onClick={() => removePreset(p.id)}
                aria-label={`Delete ${p.name}`}
                className="opacity-40 hover:text-statusRed hover:opacity-100"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={`${t("Save speed preset")} ${value.toFixed(2)}…`}
          className="min-w-0 flex-1 rounded-lg border border-borderSubtle bg-bgCard px-2 py-1 text-xs text-textWhiteHover placeholder:text-themeTextGray"
        />
        <button
          onClick={save}
          className="shrink-0 rounded-lg border border-themeBlue px-2 py-1 text-xs text-themeBlue transition-colors hover:bg-themeBlue hover:text-white"
        >
          {t("Save")}
        </button>
      </div>
    </div>
  );
};

export default SpeedPresets;
