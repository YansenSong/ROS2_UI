import { T, useT } from "../shared/i18n/i18n";
import React, { useEffect, useRef, useState } from "react";
import { useRos } from "../app/App";
import { AppConfig } from "../shared/constants";

// AMCL 发布 6×6 位姿协方差矩阵（行优先，共 36 个浮点数）。平面机器人需要关注的三个对角元素对应 x、y 和 yaw：
const COV_X = 0; // [0][0]
const COV_Y = 7; // [1][1]
const COV_YAW = 35; // [5][5]

// /amcl_pose 多久未更新后，将定位状态视为“无数据”，而不再使用上一次（可能已过期）的置信度读数。
const STALE_AFTER_MS = 6000;

// 根据位置标准差（米）和 yaw 标准差（度）划分置信度区间。阈值针对正常工作的室内 AMCL 设置：收敛后的滤波器应明显低于 0.25 m / 8°；刚被移动或全局初始化的滤波器，其粒子可能分布在数米范围内。
const classify = (posStd, yawStdDeg) => {
  if (posStd <= 0.25 && yawStdDeg <= 8) {
    return {
      key: "good",
      label: "Localized",
      color: "text-statusGreen",
      dot: "bg-statusGreen",
      explain:
        "The robot is confident about its position — its location estimate has converged and is reliable.",
    };
  }
  if (posStd <= 0.6 && yawStdDeg <= 20) {
    return {
      key: "fair",
      label: "Uncertain",
      color: "text-statusYellow",
      dot: "bg-statusYellow",
      explain:
        "Localization is usable but the estimate is loose. Drive slowly past distinctive features, or set the pose manually to tighten it.",
    };
  }
  return {
    key: "lost",
    label: "Lost",
    color: "text-statusRed",
    dot: "bg-statusRed",
    explain:
      "The robot isn't sure exactly where it is yet. Tell it to figure out its position from scratch, then drive around to help it narrow down — or set its position manually on the map.",
  };
};

/**
 * AMCL 定位置信度显示组件。订阅中继后的
 * /ui/amcl_pose（PoseWithCovarianceStamped），根据位姿协方差推断“是否已丢失定位”，并提供两种恢复操作：
 *   - 重新定位：调用 /reinitialize_global_localization，让 AMCL 在整张地图上重新分布粒子，并在机器人移动时重新收敛。
 *   - 设置位姿：通过 onSetPoseMode 切换到 Map 页面现有的 Set-Pose 模式，由操作员在地图上点击真实位姿。
 */
const LocalizationStatus = ({ onSetPoseMode }) => {
  const { t } = useT();
  const ros = useRos();
  const [cov, setCov] = useState(null); // { posStd, yawStdDeg }
  const [lastUpdate, setLastUpdate] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [showExplain, setShowExplain] = useState(false);
  const [relocalizing, setRelocalizing] = useState(false);
  const globalLocSrvRef = useRef(null);

  useEffect(() => {
    if (!ros || !window.ROSLIB) return undefined;

    const amclTopic = new window.ROSLIB.Topic({
      ros,
      name: AppConfig.AMCL_POSE_TOPIC,
      messageType: "geometry_msgs/PoseWithCovarianceStamped",
    });

    const handler = (msg) => {
      const c = msg?.pose?.covariance;
      if (!c || c.length < 36) return;
      const posStd = Math.sqrt(Math.max(c[COV_X], c[COV_Y], 0));
      const yawStdDeg = (Math.sqrt(Math.max(c[COV_YAW], 0)) * 180) / Math.PI;
      setCov({ posStd, yawStdDeg });
      setLastUpdate(Date.now());
    };

    amclTopic.subscribe(handler);

    globalLocSrvRef.current = new window.ROSLIB.Service({
      ros,
      name: "/reinitialize_global_localization",
      serviceType: "std_srvs/Empty",
    });

    return () => amclTopic.unsubscribe(handler);
  }, [ros]);

  // 每秒进行一次轻量更新，使“数据过期/无数据”状态和数据时长持续刷新，包括 AMCL 停止发布时（正是需要显示的情况）。
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ageMs = lastUpdate == null ? Infinity : now - lastUpdate;
  const stale = ageMs > STALE_AFTER_MS;
  const hasData = cov != null && !stale;
  const band = hasData ? classify(cov.posStd, cov.yawStdDeg) : null;

  const reLocalize = () => {
    const srv = globalLocSrvRef.current;
    if (!srv) return;
    setRelocalizing(true);
    srv.callService(
      new window.ROSLIB.ServiceRequest({}),
      () => setTimeout(() => setRelocalizing(false), 1500),
      () => setRelocalizing(false),
    );
  };

  const dot = band ? band.dot : "bg-themeTextGray";
  const color = band ? band.color : "text-themeTextGray";
  const label = band ? band.label : lastUpdate == null ? "No data" : "Stale";
  const isLost = band?.key === "lost";

  return (
    <div
      className="dashboard-card px-4 py-1.5 font-[RobotoMono]"
      data-tour="localization"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2.5 w-2.5">
            {isLost && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-60`}
              />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`}
            />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-themeTextGray">
              <T>{"Localization"}</T>{" "}
            </span>
            <span className={`text-sm font-semibold ${color}`}>{t(label)}</span>
            <button
              onClick={() => setShowExplain((v) => !v)}
              aria-label={t("What does this mean?")}
              title={t("What does this mean?")}
              className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-borderSubtle text-[10px] text-themeTextGray hover:border-themeBlue hover:text-themeBlue"
            >
              ?
            </button>
            {hasData && (
              <span className="ml-3 text-xs text-themeTextGray">
                ±{cov.posStd.toFixed(2)}m · ±{cov.yawStdDeg.toFixed(0)}°
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSetPoseMode && (
            <button
              onClick={onSetPoseMode}
              className="rounded-lg border border-borderSubtle px-3 py-1 text-xs text-themeTextGray transition-colors hover:border-themeBlue hover:text-themeBlue"
            >
              <T>{"Set pose"}</T>{" "}
            </button>
          )}
          <button
            onClick={reLocalize}
            disabled={relocalizing}
            title={t(
              "Have the robot search the whole map for its position again (drive to help it converge)",
            )}
            className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
              isLost
                ? "border-statusRed text-statusRed hover:bg-statusRed hover:text-white"
                : "border-borderSubtle text-themeTextGray hover:border-themeBlue hover:text-themeBlue"
            } disabled:opacity-50`}
          >
            {t(relocalizing ? "Re-localizing…" : "Re-localize")}
          </button>
        </div>
      </div>

      {showExplain && (
        <p className="mt-1 border-t border-borderSubtle pt-1 text-[11px] leading-snug text-themeTextGray">
          {t(
            band
              ? band.explain
              : lastUpdate == null
              ? "No position data received yet. The localization system may not be running, or the robot hasn't been told where it currently is."
              : "The robot has stopped sending a position estimate — the last reading is stale. Check that localization is still running, on the Health page.",
          )}
        </p>
      )}
    </div>
  );
};

export default LocalizationStatus;
