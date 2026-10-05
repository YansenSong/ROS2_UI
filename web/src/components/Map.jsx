import { T, useT } from "../shared/i18n/i18n";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import { useRos } from "../app/App";
import { AppConfig } from "../shared/constants";

import MapButton from "../shared/ui/MapButton";
import { IconButton } from "../shared/ui/Dashboard";

/**
 * NAV2D 安全辅助逻辑。
 */
const getNav2D = () => (typeof window !== "undefined" ? window.NAV2D : null);

const ensureNav2D = () => {
  if (typeof window === "undefined") return null;
  window.NAV2D = window.NAV2D || {};
  return window.NAV2D;
};

const getCanvas = () => {
  const nav2d = getNav2D();
  return nav2d?.canvas || null;
};

const getScene = () => {
  const canvas = getCanvas();
  return canvas?.scene || null;
};

const Map = forwardRef(
  ({ onContextGoal, onContextSavePose, onContextSetPose }, ref) => {
    const { t } = useT();
    const ros = useRos();

    const mapContainer = useRef(null);
    const mapItem = useRef(null);

    const viewerRef = useRef(null);

    const [canvasWidth, setCanvasWidth] = useState(undefined);
    const [canvasHeight, setCanvasHeight] = useState(undefined);

    // eslint-disable-next-line no-unused-vars
    const [mapPoints, updateMapPoints] = useState(0);

    // ROS topic 引用（ROSLIB 可用后再延迟创建）。
    const mapTopicRef = useRef(null);
    const mapUpdateTopicRef = useRef(null);

    // 初始化重试定时器（会自动清理）。
    const initRetryIntervalRef = useRef(null);

    useImperativeHandle(ref, () => ({
      getMapRef: () => mapItem.current,
    }));

    /**
     * ROSLIB 可用后再延迟创建 ROSLIB topic。
     */
    useEffect(() => {
      if (typeof window === "undefined") return;
      if (!window.ROSLIB) return;
      if (!ros) return;

      if (!mapTopicRef.current) {
        mapTopicRef.current = new window.ROSLIB.Topic({
          ros,
          name: AppConfig.WP_REQ,
          messageType: "std_msgs/Empty",
        });
      }

      if (!mapUpdateTopicRef.current) {
        mapUpdateTopicRef.current = new window.ROSLIB.Topic({
          ros,
          name: AppConfig.MAP_TOPIC,
          messageType: "nav_msgs/OccupancyGrid",
        });
      }

      // ROS 连接激活后立即发布 waypoint 请求。
      if (
        mapTopicRef.current &&
        typeof mapTopicRef.current.publish === "function"
      ) {
        mapTopicRef.current.publish();
      }
    }, [ros]);

    /**
     * 仅在容器为空时创建 ROS2D.Viewer。
     */
    const createCanvasContainer = useCallback(() => {
      if (typeof window === "undefined") return;

      const nav2d = ensureNav2D();
      if (!nav2d) return;

      if (!mapItem.current || !mapContainer.current) return;

      const mapElements = mapItem.current.childNodes;

      // 若 canvas 已存在，则不执行操作。
      if (mapElements && mapElements.length >= 1) {
        if (!nav2d.canvas && viewerRef.current) {
          nav2d.canvas = viewerRef.current;
        }
        return;
      }

      const container = mapContainer.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      if (!containerWidth || !containerHeight) return;

      const maxCanvasHeight = containerHeight;

      let calculatedCanvasWidth = maxCanvasHeight / 0.7;
      let calculatedCanvasHeight;

      if (calculatedCanvasWidth > containerWidth) {
        calculatedCanvasWidth = containerWidth;
        calculatedCanvasHeight = calculatedCanvasWidth * 0.7;
      } else {
        calculatedCanvasHeight = maxCanvasHeight;
      }

      setCanvasWidth(calculatedCanvasWidth);
      setCanvasHeight(calculatedCanvasHeight);

      if (!window.ROS2D || !window.ROS2D.Viewer) return;

      const viewer = new window.ROS2D.Viewer({
        divID: "nav_div",
        width: calculatedCanvasWidth,
        height: calculatedCanvasHeight,
      });

      viewerRef.current = viewer;
      nav2d.canvas = viewer;

      if (window.createjs?.Touch) {
        window.createjs.Touch.enable(viewer.scene);
      }
    }, []);

    /**
     * topic 存在后再订阅中继地图的更新。
     */
    useEffect(() => {
      const topic = mapUpdateTopicRef.current;
      if (!topic) return;

      const handler = () => {
        updateMapPoints((prev) => prev + 1);
      };

      topic.subscribe(handler);

      return () => {
        topic.unsubscribe(handler);
      };
    }, [mapUpdateTopicRef.current]);

    /**
     * 挂载时创建 canvas 容器。
     */
    useEffect(() => {
      createCanvasContainer();
    }, [createCanvasContainer]);

    /**
     * 初始化 NAV2D 地图逻辑。
     * 持续重试，直到 canvas.scene 存在，然后只初始化一次。
     */
    useEffect(() => {
      if (typeof window === "undefined") return;
      if (!ros) return;

      const nav2d = ensureNav2D();
      if (!nav2d) return;

      createCanvasContainer();

      if (initRetryIntervalRef.current) {
        clearInterval(initRetryIntervalRef.current);
        initRetryIntervalRef.current = null;
      }

      const tryInit = () => {
        const scene = getScene();
        if (typeof nav2d.InitMap !== "function") return;
        if (!scene) return;

        nav2d.InitMap(ros);

        if (initRetryIntervalRef.current) {
          clearInterval(initRetryIntervalRef.current);
          initRetryIntervalRef.current = null;
        }
      };

      tryInit();
      initRetryIntervalRef.current = setInterval(tryInit, 200);

      return () => {
        if (initRetryIntervalRef.current) {
          clearInterval(initRetryIntervalRef.current);
          initRetryIntervalRef.current = null;
        }
        // Map 重新挂载（例如页面切换后）时允许再次运行 navigator()。
        if (window.NAV2D) {
          window.NAV2D.mapInited = false;
          if (window.NAV2D.scanTopic) {
            try {
              window.NAV2D.scanTopic.unsubscribe();
            } catch (e) {}
            window.NAV2D.scanTopic = null;
          }
        }
      };
    }, [ros, createCanvasContainer]);

    const zoomMap = useCallback(
      (direction) => {
        if (typeof window === "undefined") return;
        if (!window.ROS2D || !window.ROS2D.ZoomView) return;

        const scene = getScene();
        if (!scene) return;

        const zoomView = new window.ROS2D.ZoomView({
          ros,
          rootObject: scene,
        });

        // ZoomView.zoom(factor) 会将当前比例（由上一行的 startZoom() 获取）乘以 factor。因此直接传入调用方的 ±1
        // 会变成无操作（zoom(1)）或负比例反转（zoom(-1)）。方向参数仅表示步进符号；在此转换为实际乘数。
        const ZOOM_STEP = 1.15;
        zoomView.startZoom(300, 200);
        zoomView.zoom(direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
      },
      [ros],
    );

    const shiftMap = (x, y) => {
      const canvas = getCanvas();
      if (!canvas || typeof canvas.shift !== "function") return;
      canvas.shift(x, y);
    };

    /**
     * 在现有 +/- 按钮之外，支持滚轮和双指捏合缩放。两种输入都调用相同的 zoomMap() 步进函数，
     * 不新增缩放机制，只增加两种触发现有逻辑的方式。
     */
    useEffect(() => {
      const container = mapContainer.current;
      if (!container) return undefined;

      const onWheel = (event) => {
        event.preventDefault();
        zoomMap(event.deltaY < 0 ? 1 : -1);
      };

      // 使用普通对象而不是 `new Map()`：本文件中的组件也名为 Map，会在模块作用域遮蔽全局 Map 构造函数，
      // 因此此处的 `new Map()` 会尝试创建该组件。
      const activePointers = {};
      let lastPinchDistance = null;
      const PINCH_STEP_PX = 18; // px of pinch travel per discrete zoom step

      const pinchDistance = () => {
        const pts = Object.values(activePointers);
        if (pts.length < 2) return null;
        return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      };

      const onPointerDown = (event) => {
        activePointers[event.pointerId] = {
          x: event.clientX,
          y: event.clientY,
        };
        if (Object.keys(activePointers).length === 2)
          lastPinchDistance = pinchDistance();
      };
      const onPointerMove = (event) => {
        if (!(event.pointerId in activePointers)) return;
        activePointers[event.pointerId] = {
          x: event.clientX,
          y: event.clientY,
        };
        if (Object.keys(activePointers).length !== 2) return;

        const distance = pinchDistance();
        if (lastPinchDistance == null || distance == null) {
          lastPinchDistance = distance;
          return;
        }
        const delta = distance - lastPinchDistance;
        if (Math.abs(delta) > PINCH_STEP_PX) {
          zoomMap(delta > 0 ? 1 : -1);
          lastPinchDistance = distance;
        }
      };
      const onPointerEnd = (event) => {
        delete activePointers[event.pointerId];
        if (Object.keys(activePointers).length < 2) lastPinchDistance = null;
      };

      container.addEventListener("wheel", onWheel, { passive: false });
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerup", onPointerEnd);
      container.addEventListener("pointercancel", onPointerEnd);

      return () => {
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerup", onPointerEnd);
        container.removeEventListener("pointercancel", onPointerEnd);
      };
    }, [zoomMap]);

    /**
     * 全屏模式：canvas 的像素宽高在构造时固定（ROS2D.Viewer 不会自动调整），因此进入/退出全屏时需要直接调整
     * canvas 元素和 viewer 实例字段，然后重新触发 map client 自带的 "change" 事件。此操作会复用 nav2d.js
     * 每次地图更新时已有的重绘/缩放逻辑，避免在此重复实现。
     */
    const [isFullscreen, setIsFullscreen] = useState(false);

    const resizeMapCanvas = useCallback((newWidth, newHeight) => {
      const viewer = viewerRef.current;
      if (!viewer || !viewer.scene || !viewer.scene.canvas) return;
      viewer.scene.canvas.width = newWidth;
      viewer.scene.canvas.height = newHeight;
      viewer.width = newWidth;
      viewer.height = newHeight;
      setCanvasWidth(newWidth);
      setCanvasHeight(newHeight);
      window.NAV2D?.mapClient?.emit?.("change");
    }, []);

    const toggleFullscreen = useCallback(() => {
      const container = mapContainer.current;
      if (!container) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen?.();
      }
    }, []);

    useEffect(() => {
      const onFullscreenChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
        requestAnimationFrame(() => {
          const container = mapContainer.current;
          if (!container) return;
          const w = container.clientWidth;
          const h = container.clientHeight;
          if (!w || !h) return;

          let newWidth = h / 0.7;
          let newHeight;
          if (newWidth > w) {
            newWidth = w;
            newHeight = newWidth * 0.7;
          } else {
            newHeight = h;
          }
          resizeMapCanvas(newWidth, newHeight);
        });
      };
      document.addEventListener("fullscreenchange", onFullscreenChange);
      return () =>
        document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, [resizeMapCanvas]);

    /**
     * 可选的右键菜单（发送目标 / 保存 waypoint / 在此设置位姿）。只有父页面至少传入一个 handler 时才会启用，
     * 因此未接入这些操作的页面（Control、Routes）仍保留浏览器原有的右键菜单。通过 ref 读取 handler，
     * 避免它们每次渲染时身份变化导致监听器反复移除和注册。
     */
    const onContextGoalRef = useRef(onContextGoal);
    const onContextSavePoseRef = useRef(onContextSavePose);
    const onContextSetPoseRef = useRef(onContextSetPose);
    useEffect(() => {
      onContextGoalRef.current = onContextGoal;
      onContextSavePoseRef.current = onContextSavePose;
      onContextSetPoseRef.current = onContextSetPose;
    });

    const [contextMenu, setContextMenu] = useState(null);
    const [waypointName, setWaypointName] = useState("");
    const contextMenuRef = useRef(null);

    const hasContextMenuHandler = Boolean(
      onContextGoal || onContextSavePose || onContextSetPose,
    );

    useEffect(() => {
      if (!hasContextMenuHandler) return undefined;

      let attachedCanvas = null;

      const handleContextMenu = (event) => {
        event.preventDefault();
        const scene = getScene();
        if (!scene) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const stageX =
          ((event.clientX - rect.left) / rect.width) *
          event.currentTarget.width;
        const stageY =
          ((event.clientY - rect.top) / rect.height) *
          event.currentTarget.height;
        const world = scene.globalToRos(stageX, stageY);

        setWaypointName("");
        setContextMenu({
          clientX: event.clientX,
          clientY: event.clientY,
          naming: false,
          pose: {
            position: { x: world.x, y: world.y, z: 0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        });
      };

      const tryAttach = () => {
        const scene = getScene();
        const canvasEl = scene?.canvas;
        if (!canvasEl || attachedCanvas === canvasEl) return;
        if (attachedCanvas)
          attachedCanvas.removeEventListener("contextmenu", handleContextMenu);
        attachedCanvas = canvasEl;
        attachedCanvas.addEventListener("contextmenu", handleContextMenu);
      };

      tryAttach();
      const pollId = setInterval(tryAttach, 300);

      return () => {
        clearInterval(pollId);
        if (attachedCanvas)
          attachedCanvas.removeEventListener("contextmenu", handleContextMenu);
      };
    }, [hasContextMenuHandler]);

    // 点击菜单外部时关闭菜单。
    useEffect(() => {
      if (!contextMenu) return undefined;
      const onDocClick = (event) => {
        if (contextMenuRef.current?.contains(event.target)) return;
        setContextMenu(null);
      };
      const id = setTimeout(
        () => document.addEventListener("click", onDocClick),
        0,
      );
      return () => {
        clearTimeout(id);
        document.removeEventListener("click", onDocClick);
      };
    }, [contextMenu]);

    const confirmSaveWaypoint = () => {
      const trimmed = waypointName.trim();
      if (!trimmed || !contextMenu) return;
      onContextSavePoseRef.current?.(trimmed, contextMenu.pose);
      setContextMenu(null);
      setWaypointName("");
    };

    return (
      <div
        ref={mapContainer}
        className="dashboard-card dashboard-card--recessed flex h-full w-full items-center justify-center overflow-hidden p-2"
      >
        <div
          className="relative"
          style={{
            width: canvasWidth ? `${canvasWidth}px` : undefined,
            height: canvasHeight ? `${canvasHeight}px` : undefined,
          }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <div
              id="nav_div"
              ref={mapItem}
              className="mapContainer h-full w-full text-center text-[0px]"
            />
          </div>

          <div className="absolute bottom-4 left-4 grid grid-cols-[44px_44px_44px] grid-rows-[44px_44px_44px] justify-items-center gap-1 rounded-xl border border-borderSubtle bg-bgCard/90 p-1.5 shadow-xl shadow-black/30 backdrop-blur">
            <div />
            <MapButton
              type={"arrow"}
              direction={"top"}
              onBtnClick={() => shiftMap(0, 0.5)}
            />
            <div />

            <MapButton
              type={"arrow"}
              direction={"left"}
              onBtnClick={() => shiftMap(-0.5, 0)}
            />

            <MapButton
              type={"arrow"}
              direction={"bottom"}
              onBtnClick={() => shiftMap(0, -0.5)}
            />

            <MapButton
              type={"arrow"}
              direction={"right"}
              onBtnClick={() => shiftMap(0.5, 0)}
            />

            <MapButton
              type={"zoom"}
              direction={"plus"}
              onBtnClick={() => zoomMap(1)}
            />
            <MapButton
              type={"zoom"}
              direction={"minus"}
              onBtnClick={() => zoomMap(-1)}
            />
          </div>

          <div className="absolute right-3 top-3 z-10">
            <IconButton
              label={t(isFullscreen ? "Exit fullscreen" : "Fullscreen")}
              onClick={toggleFullscreen}
              className="bg-bgCard/85 backdrop-blur"
            >
              {isFullscreen ? "✕" : "⤢"}
            </IconButton>
          </div>

          {contextMenu && (
            <div
              ref={contextMenuRef}
              className="fixed z-50 min-w-[190px] rounded-xl border border-borderSubtle bg-bgCard/95 p-1.5 font-[RobotoMono] shadow-2xl shadow-black/50 backdrop-blur"
              style={{ left: contextMenu.clientX, top: contextMenu.clientY }}
            >
              {contextMenu.naming ? (
                <div className="p-1">
                  <input
                    autoFocus
                    type="text"
                    value={waypointName}
                    onChange={(e) => setWaypointName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmSaveWaypoint();
                      if (e.key === "Escape") setContextMenu(null);
                    }}
                    placeholder={t("Waypoint name")}
                    className="w-full rounded-lg border border-borderSubtle bg-bgSurface px-2 py-1.5 text-xs text-textWhiteHover placeholder:text-themeTextGray"
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={confirmSaveWaypoint}
                      className="flex-1 rounded-lg border border-themeBlue px-2 py-1 text-xs font-semibold text-themeBlue hover:bg-themeBlue hover:text-white"
                    >
                      <T>{"Save"}</T>{" "}
                    </button>
                    <button
                      onClick={() => setContextMenu(null)}
                      className="flex-1 rounded-lg border border-borderSubtle px-2 py-1 text-xs text-themeTextGray hover:border-statusRed/40 hover:text-statusRed"
                    >
                      <T>{"Cancel"}</T>{" "}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {onContextGoal && (
                    <button
                      onClick={() => {
                        onContextGoalRef.current?.(contextMenu.pose);
                        setContextMenu(null);
                      }}
                      className="rounded-lg px-3 py-2 text-left text-xs text-textWhiteHover hover:bg-bgSurface"
                    >
                      <T>{"Send goal here"}</T>{" "}
                    </button>
                  )}
                  {onContextSavePose && (
                    <button
                      onClick={() =>
                        setContextMenu((prev) => ({ ...prev, naming: true }))
                      }
                      className="rounded-lg px-3 py-2 text-left text-xs text-textWhiteHover hover:bg-bgSurface"
                    >
                      <T>{"Save waypoint here"}</T>{" "}
                    </button>
                  )}
                  {onContextSetPose && (
                    <button
                      onClick={() => {
                        onContextSetPoseRef.current?.(contextMenu.pose);
                        setContextMenu(null);
                      }}
                      className="rounded-lg px-3 py-2 text-left text-xs text-textWhiteHover hover:bg-bgSurface"
                    >
                      <T>{"Correct robot's position here"}</T>{" "}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default Map;
