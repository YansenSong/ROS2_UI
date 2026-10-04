import React, { useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useRos, useRosStatus } from "../app/App";
import { AppConfig } from "../shared/constants";
import { DashboardCard, EmptyState, SectionHeader, StatusBadge } from "../shared/ui/Dashboard";
import { useT } from "../shared/i18n/i18n";

// 传输时用下划线代替空格；UI 中显示为空格。
const toWire = (s) => String(s || "").trim().replace(/\s+/g, "_");
const toDisplay = (s) => String(s || "").replace(/_/g, " ");
const stripCsv = (s) => String(s || "").replace(".csv", "");

// 数据结构：[ { group: [ { map: [route,...] }, ... ] }, ... ]。
const parseStructure = (structure) =>
  (structure || []).map((groupObj) => {
    const group = Object.keys(groupObj)[0];
    const maps = (groupObj[group] || []).map((mapObj) => {
      const map = Object.keys(mapObj)[0];
      return { name: toDisplay(map), routes: (mapObj[map] || []).map((r) => toDisplay(stripCsv(r))) };
    });
    return { name: toDisplay(group), maps };
  });

const inputClass =
  "rounded-lg border border-borderSubtle bg-bgCard px-3 py-2 text-sm text-textWhiteHover outline-none focus:border-themeBlue";

/**
 * 地图管理：保存当前地图、切换已保存地图、重命名和删除地图，并将地图整理到分组中。通过 /ui_operation 与现有
 * folders_handler 后端通信（使用与 Routes 页面相同的命令协议），并从 /nav_data_resp 读取目录。
 */
const MapsPage = () => {
  const { t } = useT();
  const ros = useRos();
  const rosStatus = useRosStatus();
  const connected = rosStatus === "connected";

  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState({ group: "", map: "" });
  const [saveForm, setSaveForm] = useState({ group: "", name: "" });
  const [newGroup, setNewGroup] = useState("");
  const [renaming, setRenaming] = useState(null); // {group, map, value}

  const reqRef = useRef(null);
  const respRef = useRef(null);
  const opRef = useRef(null);

  useEffect(() => {
    if (!ros || !window.ROSLIB) return undefined;

    reqRef.current = new window.ROSLIB.Topic({
      ros,
      name: AppConfig.NAV_DATA_REQ_TOPIC,
      messageType: "std_msgs/Empty",
    });
    respRef.current = new window.ROSLIB.Topic({
      ros,
      name: AppConfig.NAV_DATA_RESP_TOPIC,
      messageType: "std_msgs/String",
    });
    opRef.current = new window.ROSLIB.Topic({
      ros,
      name: AppConfig.UI_OPERATION_TOPIC,
      messageType: "std_msgs/String",
    });

    respRef.current.subscribe((data) => {
      try {
        const obj = JSON.parse(data.data);
        setGroups(parseStructure(obj.structure));
        setActive({
          group: toDisplay(obj.active_files?.group),
          map: toDisplay(obj.active_files?.map),
        });
      } catch {
        // nav_data 格式错误，忽略此消息。
      }
    });

    reqRef.current.publish();
    return () => respRef.current?.unsubscribe();
  }, [ros]);

  const refresh = () => reqRef.current?.publish();

  const sendCmd = (path, data) => {
    if (!opRef.current) return;
    const wired = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toWire(v)]))
      : null;
    const msg = wired ? `${path}/${JSON.stringify(wired)}` : path;
    opRef.current.publish(new window.ROSLIB.Message({ data: msg }));
    // 后端完成文件操作后会重新发布 nav_data；此处也主动触发一次刷新。
    setTimeout(refresh, 900);
  };

  const switchMap = (group, map) => {
    window.NAV2D?.ClearMap?.();
    sendCmd("change_map", { group, map });
    toast.info(`Loading "${map}" — set the initial pose after it loads; old localization won't match.`);
  };

  const saveMap = () => {
    const group = saveForm.group.trim();
    const name = saveForm.name.trim();
    if (!group || !name) {
      toast.warn("Pick a group and a name for the map");
      return;
    }
    sendCmd("save_map", { group, map: name });
    toast.success(`Saving current map as "${name}"…`);
    setSaveForm({ group, name: "" });
  };

  const startMapping = () => {
    if (!window.confirm(
      "Start a new mapping session? This shuts down localization/navigation and launches mapping mode — the robot must be driven around to build the map. Save it here when done.",
    )) return;
    sendCmd("build_map");
    toast.info("Mapping started — drive the robot around the space, then save the map.");
  };

  const deleteMap = (group, map) => {
    if (!window.confirm(`Delete map "${map}" and its routes? This cannot be undone.`)) return;
    sendCmd("delete_map", { group, map });
    toast.success(`Deleted "${map}"`);
  };

  const commitRename = () => {
    if (!renaming) return;
    const next = renaming.value.trim();
    if (next && next !== renaming.map) {
      sendCmd("rename_map", { group: renaming.group, map_old: renaming.map, map_new: next });
      toast.success(`Renamed to "${next}"`);
    }
    setRenaming(null);
  };

  const createGroup = () => {
    const g = newGroup.trim();
    if (!g) return;
    sendCmd("create_group", { group: g });
    toast.success(`Created group "${g}"`);
    setNewGroup("");
  };

  const deleteGroup = (group) => {
    if (!window.confirm(`Delete group "${group}" and everything in it?`)) return;
    sendCmd("delete_group", { group });
    toast.success(`Deleted group "${group}"`);
  };

  const groupNames = groups.map((g) => g.name);

  return (
    <div className="sectionHeight space-y-5 py-4 sm:py-6">
      <ToastContainer position="bottom-right" theme="dark" />
      <SectionHeader
        eyebrow="Environments"
        title="Maps"
        description="Save, switch, rename and organise the robot's maps. Switching a map reloads it on the robot immediately."
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={connected ? "connected" : "disconnected"} pulse={connected} label={connected ? "live" : "offline"} />
            <button onClick={refresh} disabled={!connected} className="rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-themeTextGray hover:border-themeBlue hover:text-themeBlue disabled:opacity-40">
              {t("Refresh")}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardCard className="p-4 font-[RobotoMono]">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-themeBlue">{t("Build a new map")}</p>
          <p className="mb-3 text-xs text-themeTextGray">
            {t("Launches mapping mode and stops navigation. Drive the robot around the space, then save below.")}
          </p>
          <button onClick={startMapping} disabled={!connected} className="rounded-lg border border-statusYellow px-3 py-1.5 text-sm font-semibold text-statusYellow transition-colors hover:bg-statusYellow hover:text-black disabled:opacity-40">
            {t("Start mapping")}
          </button>
        </DashboardCard>

        <DashboardCard className="p-4 font-[RobotoMono]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-themeBlue">{t("Save current map")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input list="map-groups" className={inputClass} value={saveForm.group} onChange={(e) => setSaveForm((p) => ({ ...p, group: e.target.value }))} placeholder={t("Group")} />
            <datalist id="map-groups">
              {groupNames.map((g) => <option key={g} value={g} />)}
            </datalist>
            <input className={inputClass} value={saveForm.name} onChange={(e) => setSaveForm((p) => ({ ...p, name: e.target.value }))} placeholder={t("Map name")} />
            <button onClick={saveMap} disabled={!connected} className="rounded-lg border border-themeBlue bg-themeBlue/10 px-4 py-2 text-sm font-semibold text-themeBlue transition-colors hover:bg-themeBlue hover:text-white disabled:opacity-40">
              {t("Save")}
            </button>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-themeBlue">{t("Saved maps")}</p>
          <div className="flex gap-2">
            <input className={`${inputClass} py-1`} value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder={t("New group")} />
            <button onClick={createGroup} disabled={!connected} className="rounded-lg border border-borderSubtle px-3 py-1 text-xs text-themeTextGray hover:border-themeBlue hover:text-themeBlue disabled:opacity-40">
              {t("Add group")}
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <EmptyState title="No maps yet" description="Build and save a map above to see it here." />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.name}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="font-[RobotoMono] text-xs uppercase tracking-wider text-themeTextGray">{group.name}</p>
                  <button onClick={() => deleteGroup(group.name)} className="text-[10px] text-themeTextGray hover:text-statusRed">{t("delete group")}</button>
                </div>
                {group.maps.length === 0 ? (
                  <p className="px-2 text-xs text-themeTextGray/60">{t("No maps in this group.")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {group.maps.map((m) => {
                      const isActive = active.group === group.name && active.map === m.name;
                      const isRenaming = renaming?.group === group.name && renaming?.map === m.name;
                      return (
                        <div key={m.name} className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 ${isActive ? "border-themeBlue/50 bg-themeBlue/5" : "border-borderSubtle bg-bgSurface"}`}>
                          {isRenaming ? (
                            <input
                              autoFocus
                              className={`${inputClass} flex-1 py-1`}
                              value={renaming.value}
                              onChange={(e) => setRenaming((p) => ({ ...p, value: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }}
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-textWhiteHover">
                              {m.name}
                              {isActive && <span className="ml-2 rounded border border-themeBlue/40 px-1.5 py-0.5 text-[10px] text-themeBlue">{t("active")}</span>}
                              <span className="ml-2 font-[RobotoMono] text-[11px] text-themeTextGray">{m.routes.length} {t("route(s)")}</span>
                            </span>
                          )}
                          <div className="flex shrink-0 items-center gap-1.5 font-[RobotoMono] text-xs">
                            {isRenaming ? (
                              <>
                                <button onClick={commitRename} className="rounded-lg border border-themeBlue px-2 py-1 text-themeBlue hover:bg-themeBlue hover:text-white">{t("Save")}</button>
                                <button onClick={() => setRenaming(null)} className="rounded-lg border border-borderSubtle px-2 py-1 text-themeTextGray">{t("Cancel")}</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => switchMap(group.name, m.name)} disabled={!connected || isActive} className="rounded-lg border border-themeBlue px-2 py-1 text-themeBlue hover:bg-themeBlue hover:text-white disabled:opacity-40">
                                  {t(isActive ? "Loaded" : "Switch")}
                                </button>
                                <button onClick={() => setRenaming({ group: group.name, map: m.name, value: m.name })} className="rounded-lg border border-borderSubtle px-2 py-1 text-themeTextGray hover:border-themeBlue hover:text-themeBlue">{t("Rename")}</button>
                                <button onClick={() => deleteMap(group.name, m.name)} aria-label={`Delete ${m.name}`} className="px-1 text-themeTextGray hover:text-statusRed">×</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
};

export default MapsPage;
