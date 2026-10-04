import { lazy } from "react";
import { INSPECTION_PROFILE } from "../shared/robot/robotContract";

const MapPage = lazy(() => import("./MapPage"));
const RoutePage = lazy(() => import("./RoutePage"));
const InfoPage = lazy(() => import("./InfoPage"));
const HealthPage = lazy(() => import("./HealthPage"));
const EventsPage = lazy(() => import("./EventsPage"));
const MapsPage = lazy(() => import("./MapsPage"));
const MissionsPage = lazy(() => import("./MissionsPage"));
const ConfigPage = lazy(() => import("./ConfigPage"));

/**
 * Single source of truth for every top-level page. Header.jsx's sidebar/
 * mobile nav and pages/index.jsx's routing both read this array instead of
 * each keeping their own hardcoded list — a contributor adding a new page
 * appends one entry here and nothing else needs editing.
 *
 * `path` is always the absolute nav path (what NavLink's `to` wants);
 * pages/index.jsx derives the relative <Route path> from it. `icon` must
 * match a case in Header.jsx's NavIcon (unregistered names fall back to a
 * generic dot, so a new entry never renders as a blank slot).
 */
export const PAGE_REGISTRY = [
  { path: "/", label: "Map", icon: "map", component: MapPage },
  { path: "/route", label: "Routes", icon: "route", component: RoutePage },
  { path: "/maps", label: "Maps", icon: "maps", component: MapsPage },
  { path: "/missions", label: INSPECTION_PROFILE ? "Inspection" : "Missions", icon: "missions", component: MissionsPage },
  { path: "/info", label: "Status", icon: "status", component: InfoPage },
  { path: "/health", label: "Health", icon: "health", component: HealthPage },
  { path: "/events", label: "Events", icon: "events", component: EventsPage },
  { path: "/config", label: "Config", icon: "config", component: ConfigPage },
  ...(!INSPECTION_PROFILE ? [
    { path: "/blocks", label: "Programs", icon: "blocks", component: lazy(() => import("./BlocksPage")) },
    { path: "/scheduler", label: "Scheduler", icon: "scheduler", component: lazy(() => import("./SchedulerPage")) },
    { path: "/robot", label: "Robot", icon: "robot", component: lazy(() => import("./RobotDescriptionPage")) },
    { path: "/devices", label: "Devices", icon: "devices", component: lazy(() => import("./DevicesPage")) },
    { path: "/metrics", label: "Metrics", icon: "metrics", component: lazy(() => import("./MetricsPage")) },
    { path: "/recordings", label: "Recordings", icon: "recordings", component: lazy(() => import("./RecordingsPage")) },
    { path: "/console", label: "Console", icon: "console", component: lazy(() => import("./ConsolePage")) },
    { path: "/params", label: "Parameters", icon: "params", component: lazy(() => import("./ParamsPage")) },
    { path: "/fleet", label: "Fleet", icon: "fleet", component: lazy(() => import("./FleetPage")) },
  ] : []),
];

export const NAV_REGISTRY = INSPECTION_PROFILE ? [...PAGE_REGISTRY] : PAGE_REGISTRY;

/** Appends a page plugin to the registry. Call before the app renders. */
export function registerPage(entry) {
  PAGE_REGISTRY.push(entry);
}
