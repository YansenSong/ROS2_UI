import { useEffect, useState } from "react";

// Lightweight i18n. Keys ARE the English strings, so any untranslated string
// falls back to readable English — this lets translation be adopted
// incrementally (wrap a string in t() and add a German entry when ready)
// without a big-bang migration. German (de) is seeded for the app shell
// (nav, status bar, common actions); page bodies can be translated over time.

// New key makes Chinese the default even for browsers that stored the old
// English default; choices made after this change remain persistent.
const STORAGE_KEY = "openamrLangV2";

const DE = {
  // Navigation
  Map: "Karte",
  Routes: "Routen",
  Programs: "Programme",
  Status: "Status",
  Robot: "Roboter",
  Devices: "Geräte",
  Health: "Zustand",
  Metrics: "Kennzahlen",
  Recordings: "Aufnahmen",
  Events: "Ereignisse",
  Console: "Konsole",
  Parameters: "Parameter",
  Fleet: "Flotte",
  Maps: "Karten",
  Scheduler: "Zeitplan",
  Config: "Einstellungen",
  // Status bar / common
  Connected: "Verbunden",
  Offline: "Offline",
  Error: "Fehler",
  Batt: "Akku",
  "E-STOP": "NOT-AUS",
  Language: "Sprache",
};

const ZH = {
  Map: "地图", Routes: "路线", Programs: "程序", Status: "状态",
  Robot: "机器人", Devices: "设备", Health: "健康", Metrics: "指标",
  Recordings: "录制", Events: "事件", Console: "控制台",
  Parameters: "参数", Fleet: "车队", Maps: "地图管理",
  Scheduler: "计划", Missions: "任务", Inspection: "巡检任务",
  Config: "配置", Connected: "已连接", Offline: "离线", Error: "错误",
  Batt: "电池", "E-STOP": "急停", Language: "语言",
  "Robot connected": "机器人已连接", "Robot offline": "机器人离线",
  "Connection error": "连接错误", "Software Stop (not physical E-STOP)": "软件停车（非物理急停）",
  "Manual": "手动控制", "Max Speed": "最高速度", "Software Stop": "软件停车",
  "Manual control interface not configured": "手动控制接口未配置",
  "Project navigation and localization interfaces are unconfigured. Status: UNKNOWN.": "项目导航与定位接口尚未配置。状态：未知。",
  "Demo mode": "演示模式", "Exit demo mode": "退出演示模式",
  "— every value on screen is simulated. No robot is connected.": "— 屏幕数据均为模拟数据，未连接机器人。",
  "Demo mode — every value on screen is simulated. No robot is connected.": "演示模式：屏幕上的数据均为模拟数据，未连接机器人。",
  "Autonomy": "自主任务", "New mission": "新建任务", "Create": "创建",
  "steps": "个步骤", "Run (moves robot)": "运行（机器人将移动）",
  "Chain waypoints, waits, and dock/undock into one sequence. Runs while a browser tab is open — not robot-side autonomy — and can be triggered from the Scheduler page too.": "将航点、等待和停靠动作排成任务。此旧版任务仅在浏览器页面打开时运行，不属于机器人端自主执行。",
  "Create one below, then add steps — e.g. go to the loading bay, wait 10s, then dock.": "在下方新建任务并添加步骤。",
  "Go to waypoint": "前往巡检点", "Go home": "返回原点", "Wait": "等待", "Dock": "停靠", "Undock": "离开充电座",
  "No saved waypoints yet — add one from the Map page first.": "暂无巡检点，请先在地图页面添加。",
  "e.g. Evening patrol": "例如：夜间巡检",
  "No missions yet": "暂无任务", "Run unavailable": "暂不可运行",
  "No steps yet — add one below.": "暂无步骤，请在下方添加。",
  "Choose a waypoint…": "选择巡检点…", "+ Add step": "+ 添加步骤",
  "Saved Waypoints": "已保存的巡检点", "Save here": "保存当前位置",
  "e.g. Dock, Loading bay": "例如：充电座、装卸区",
  "Waiting for pose…": "等待位置数据…", "No saved waypoints yet — drive somewhere and save it, or right-click the map.": "暂无巡检点。可在地图上右键保存位置。",
  "Robot-side mission interface not configured. Existing mission drafts cannot be executed in this profile.": "机器人端任务接口尚未配置。当前任务草稿无法在此模式下执行。",
  "Settings": "设置", "Configuration": "配置", "Audit": "审计",
  "System overview": "系统概览", "Health Centre": "系统健康",
  "Robot status": "机器人状态", "Environments": "环境",
  "Route authoring": "路线编辑", "Plan reusable robot routes": "规划可复用的机器人路线",
  "Connection and safety defaults for this browser, saved locally — nothing here is shared with other operators or persisted on the robot.": "本浏览器的连接和控制默认设置保存在本地，不会同步给其他操作员或机器人。",
  "A persisted timeline of navigation, docking, battery and safety events — reviewable after the fact. Kept locally in the browser.": "导航、停靠、电池与安全相关事件的时间线，保存在本地浏览器中。",
  "Combines connection status, sensor data, navigation health, hardware, battery, and robot model into one ready/not-ready check.": "汇总连接、传感器、导航、硬件、电池和机器人模型状态。",
  "Live camera, telemetry, power, and ROS health in one operational view.": "集中查看实时画面、遥测、电源和 ROS 状态。",
  "Save, switch, rename and organise the robot's maps. Switching a map reloads it on the robot immediately.": "保存、切换、重命名和整理地图。切换地图会立即在机器人端重新加载。",
  "Place, edit, and manage waypoint sequences for the active map.": "为当前地图添加、编辑和管理航点序列。",
  "No events recorded yet": "暂无事件", "No events match the filters": "没有符合筛选条件的事件",
  "No devices registered": "尚未注册设备", "Register hardware on the Devices page to see it here.": "请在设备页面注册硬件。",
  "No battery telemetry": "暂无电池数据", "Waiting for the configured battery topic to publish.": "等待已配置的电池 topic 发布数据。",
  "No maps yet": "暂无地图", "Build and save a map above to see it here.": "请先在上方创建并保存地图。",
  "Explore the whole interface with simulated telemetry — no robot or robot connection required. Every page shows a permanent Demo mode badge while this is on. Turning it off returns to the connection settings below.": "使用模拟遥测浏览界面，无需连接机器人。开启时页面会持续显示演示模式标识；关闭后恢复下方连接设置。",
  "Demo mode is on": "演示模式已开启", "Demo mode is off": "演示模式已关闭",
  "Connection": "连接", "Manual-drive safety limits": "手动驾驶速度限制",
  "Notifications": "通知", "Keep-out zones": "禁行区域",
  "Save settings": "保存设置", "Reset to defaults": "恢复默认设置",
  "Robot address override": "机器人地址", "Robot connection port": "机器人连接端口",
  "Camera stream port": "相机流端口", "Max linear speed": "最大线速度",
  "Max angular speed": "最大角速度", "Low battery threshold": "低电量阈值",
  "This is the network address the app uses to talk to the robot. Leave blank to auto-use this page’s own host (the normal case once deployed on the robot).": "用于连接机器人的网络地址。留空时自动使用当前网页的主机地址。",
  "Port used to stream the camera feed.": "相机视频流使用的端口。",
  "Notify once battery drops to or below this level, %": "电量降至此百分比或以下时通知。",
  "Export": "导出", "Clear all events": "清空所有事件",
  "Type": "类型", "Severity": "严重程度",
  "all": "全部", "navigation": "导航", "docking": "停靠",
  "battery": "电池", "safety": "安全", "system": "系统",
  "info": "信息", "success": "成功", "warning": "警告", "error": "错误",
  "This permanently deletes all recorded events, even if you're currently viewing a filtered list. This can't be undone. Continue?": "这将永久删除全部事件记录，包括当前筛选未显示的记录，且无法撤销。继续吗？",
  "Navigation, docking and battery events will appear here as they happen.": "导航、停靠和电池事件发生后会显示在这里。",
  "Try widening the type or severity filter.": "请放宽类型或严重程度筛选条件。",
  "Refresh": "刷新", "Build a new map": "创建新地图",
  "Launches mapping mode and stops navigation. Drive the robot around the space, then save below.": "启动建图模式并停止导航。完成建图后在下方保存。",
  "Start mapping": "开始建图", "Save current map": "保存当前地图",
  "Group": "分组", "Map name": "地图名称", "Save": "保存",
  "Saved maps": "已保存的地图", "New group": "新建分组",
  "Add group": "添加分组", "delete group": "删除分组",
  "No maps in this group.": "此分组暂无地图。", "active": "当前使用",
  "route(s)": "条路线", "Cancel": "取消", "Loaded": "已加载",
  "Switch": "切换", "Rename": "重命名", "live": "实时",
  "offline": "离线",
  "Project localization interface is unconfigured. Status: UNKNOWN.": "项目定位接口尚未配置。状态：未知。",
  "Battery level": "电池电量", "Recent trend": "近期趋势",
  "(last ~10 min)": "（近约 10 分钟）", "Charging station": "充电座",
  "Robot is connected to external power.": "机器人已连接外部电源。",
  "Robot is not connected to the dock.": "机器人未连接充电座。",
  "Not connected": "未连接", "Low": "偏低", "Critical": "严重",
  "Every checked signal is nominal.": "所有已检查信号均正常。",
  "Online": "在线", "No status topic": "无状态 topic",
  "OpenAMR map dashboard": "OpenAMR 地图控制台", "Robot workspace": "机器人工作台",
  "Connection diagnostics": "连接诊断", "Open full Health Centre →": "打开系统健康页面 →",
  "Saved robots": "已保存的机器人", "e.g. Warehouse Robot 3": "例如：仓库机器人 3",
  "Save as profile": "保存为配置", "No saved robots yet.": "暂无已保存的机器人。",
  "Currently resolving to": "当前连接地址为", ". Changing these fields reconnects to the robot.": "。修改这些字段会重新连接机器人。",
  "The same health summary as the Health Centre; connection problems appear here too.": "这里显示与系统健康页面相同的汇总状态，也会显示连接问题。",
  "Name and save a robot connection, then switch without retyping its address and port.": "命名并保存机器人连接，之后切换时无需重新输入地址和端口。",
  "Maximum joystick and map speed settings. Changes apply to new manual commands.": "摇杆和地图页面的最高速度设置，修改后应用于新的手动命令。",
  "Browser notifications for navigation, docking, and low battery require browser permission.": "导航、停靠和低电量的浏览器通知需要通知权限。",
  "Enabled": "已启用", "Disabled": "已禁用",
  "Permission granted": "权限已授予", "Permission blocked — check browser settings": "权限被阻止，请检查浏览器设置",
  "Request permission": "请求权限",
  "These zones are visual markers only. They do not stop the robot. Confirm obstacle avoidance with the integrator.": "这些区域只是视觉标记，不能自行阻止机器人运动。请向集成方确认避障能力。",
  "Rectangular no-go areas are drawn on the map. Toggle them with the Zones layer.": "矩形禁行区域绘制在地图上，可通过“禁行区域”图层切换显示。",
  "Browser notifications enabled": "浏览器通知已启用", "Notification permission was not granted": "未获得浏览器通知权限",
  "Settings saved": "设置已保存", "Settings reset to defaults": "设置已恢复默认值",
  "Enter a name for this robot": "请输入机器人名称",
  "Reset connection address/port, camera port, speed limits, and the low-battery alert back to defaults? If you're currently connected to a robot at a custom address, this will disconnect you.": "要将连接地址、端口、相机端口、速度限制和低电量提醒恢复默认值吗？如果当前连接了自定义地址的机器人，连接将中断。",
  "Set a specific host above first — “auto” always resolves to whichever page you're on, so it can't be saved as a switchable profile.": "请先设置具体主机地址。自动地址会随当前网页变化，无法保存为可切换配置。",
  "Alerts": "警报", "Notice": "提示", "Map not received": "尚未收到地图",
  "Localization pose missing": "缺少定位位置数据", "No planned path yet": "暂无规划路径",
  "Robot connection lost": "机器人连接已断开",
  "Speed Presets": "速度预设", "Save speed preset": "保存速度预设",
  "Layers": "图层", "Obstacles (wide)": "全局障碍物",
  "Obstacles (near)": "近处障碍物", "Laser": "激光",
  "Path": "路径", "Goal": "目标", "Waypoints": "航点",
  "Zones": "禁行区域", "Trail": "轨迹", "Reset": "重置",
  "Camera": "相机", "Color": "彩色", "RGB Sim": "RGB 仿真",
  "Low": "低", "Balanced": "均衡", "High": "高",
  "Start": "启动", "Stop": "停止", "Full": "全屏",
  "Camera is paused": "相机已暂停", "Start the video feed to see what the robot sees.": "启动视频流以查看机器人视野。",
  "Start camera": "启动相机", "Camera unavailable": "相机不可用",
  "Current route": "当前路线", "Route operations": "路线操作",
  "Editing route": "正在编辑路线", "View mode": "查看模式",
  "Click the map to add or adjust waypoints, then save your changes.": "点击地图添加或调整航点，然后保存更改。",
  "Choose an operation to begin editing the current route or create a new one.": "选择操作以编辑当前路线或创建新路线。",
  "Cancel edit": "取消编辑", "Edit route": "编辑路线",
  "Switch route": "切换路线", "Switch map": "切换地图",
  "Auto-plan": "自动规划", "Clear waypoints": "清空航点",
  "Delete": "删除",
};

const DICTS = { en: {}, de: DE, "zh-CN": ZH };

let lang = load();
const listeners = new Set();
if (typeof document !== "undefined") document.documentElement.lang = lang;

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "de" || stored === "en" || stored === "zh-CN" ? stored : "zh-CN";
  } catch {
    return "zh-CN";
  }
}

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (next !== "en" && next !== "de" && next !== "zh-CN") return;
  lang = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn(lang));
}

export function translate(key) {
  return DICTS[lang]?.[key] ?? key;
}

// React binding: re-renders subscribers when the language changes.
export function useT() {
  const [current, setCurrent] = useState(lang);
  useEffect(() => {
    const fn = (l) => setCurrent(l);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return { t: translate, lang: current, setLang };
}
