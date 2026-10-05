import { T } from "../shared/i18n/i18n";
import React, { useEffect, useState } from "react";

const API_BASE = window.location.port === "3000" ? "http://127.0.0.1:5050" : "";

/**
 * 始终挂载（位于 AppLayout 中）的横幅，显示后端实际的 AUTH_MODE 状态。不会在客户端推断该状态，因为隐藏前端
 * 路由/按钮不等于授权；此处只有后端（flask_app.py）是可信来源。横幅可以提示两种互相独立的情况：
 *
 *  1. 请求的 AUTH_MODE 不是 open，但该模式尚未实现，因此服务器回退到 open。维护者应明确知道配置未生效，
 *     而不是误以为它已生效。
 *  2. 此浏览器从本地网络之外访问机器人。当前唯一实现的模式是 AUTH_MODE=open，网络可达与操作机器人之间没有登录验证。
 */
const AuthModeBanner = () => {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/auth/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || dismissed) return null;

  const showConfigWarning = Boolean(status.warning);
  const showNetworkWarning =
    status.mode === "open" && status.isLocalNetwork === false;
  if (!showConfigWarning && !showNetworkWarning) return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-statusYellow/30 bg-statusYellow/10 px-4 py-2 font-[RobotoMono] text-xs leading-snug text-statusYellow">
      <span className="flex-1">
        {showConfigWarning && <span>{status.warning} </span>}
        {showNetworkWarning && (
          <span>
            <T>
              {
                "This robot's controls are reachable from outside your local network with no authentication (AUTH_MODE=open) — anyone who can reach this address can operate the robot. Restrict network access, or set AUTH_MODE once a supported mode is available."
              }
            </T>{" "}
          </span>
        )}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-statusYellow/70 hover:text-statusYellow"
        aria-label="Dismiss warning"
      >
        ×
      </button>
    </div>
  );
};

export default AuthModeBanner;
