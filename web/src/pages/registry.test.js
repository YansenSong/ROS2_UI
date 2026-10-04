import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("inspection profile keeps robot control pages out of routes and navigation", async () => {
  vi.stubEnv("REACT_APP_UI_PROFILE", "inspection_demo");
  vi.resetModules();
  const { PAGE_REGISTRY, NAV_REGISTRY } = await import("./registry");
  expect(PAGE_REGISTRY.map(({ path }) => path)).toEqual([
    "/", "/route", "/maps", "/missions", "/info", "/health", "/events", "/config",
  ]);
  expect(NAV_REGISTRY.find(({ path }) => path === "/missions").label).toBe("Inspection");
});

test("legacy profile retains the existing program route", async () => {
  vi.stubEnv("REACT_APP_UI_PROFILE", "");
  vi.resetModules();
  const { PAGE_REGISTRY } = await import("./registry");
  expect(PAGE_REGISTRY.some(({ path }) => path === "/blocks")).toBe(true);
});
