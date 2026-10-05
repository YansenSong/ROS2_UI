import { T } from "../shared/i18n/i18n";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * First-run wizard, gated on localStorage (see AppLayout.jsx) so it only
 * appears automatically once — reopenable any time via HelpWidget's
 * "Replay welcome guide". Deliberately doesn't duplicate the Config page's
 * connection form inline; the "connect" path explains the three steps and
 * hands off to Config, since that form already exists and works.
 */
const OnboardingWizard = ({ open, onClose, onRequestTour }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState("welcome");
  const [connectKind, setConnectKind] = useState("robot");

  if (!open) return null;

  const finish = (path) => {
    onClose();
    setStep("welcome");
    if (path) navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-borderSubtle bg-bgCard p-6 shadow-2xl shadow-black/60">
        {step === "welcome" && (
          <>
            <p className="font-[RobotoMono] text-[11px] uppercase tracking-[0.14em] text-themeBlue">
              <T>{"Welcome"}</T>{" "}
            </p>
            <h2 className="mt-1 text-xl font-bold text-textWhiteHover">
              <T>{"Welcome to OpenAMRobot"}</T>{" "}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-themeTextGray">
              <T>
                {
                  "This is a browser-based control and monitoring interface for a real ROS 2 mobile robot — driving, mapping, route planning, diagnostics, and more, all from here. Let's get you oriented."
                }
              </T>{" "}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => finish(null)}
                className="text-xs text-themeTextGray hover:text-textWhiteHover"
              >
                <T>{"Skip"}</T>{" "}
              </button>
              <button
                onClick={() => setStep("choose")}
                className="rounded-lg bg-themeBlue px-4 py-2 text-sm font-semibold text-white hover:bg-themeMediumBlue"
              >
                <T>{"Get started"}</T>{" "}
              </button>
            </div>
          </>
        )}

        {step === "choose" && (
          <>
            <p className="font-[RobotoMono] text-[11px] uppercase tracking-[0.14em] text-themeBlue">
              <T>{"How do you want to start?"}</T>{" "}
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  onRequestTour?.();
                  finish("/");
                }}
                className="w-full rounded-xl border border-borderSubtle p-4 text-left hover:border-themeBlue"
              >
                <p className="text-sm font-semibold text-textWhiteHover">
                  <T>{"Take the guided Map tour"}</T>{" "}
                </p>
                <p className="mt-1 text-xs text-themeTextGray">
                  <T>
                    {
                      "Learn where to find navigation, connection status, map layers, goals, and manual drive."
                    }
                  </T>{" "}
                </p>
              </button>
              <button
                onClick={() => {
                  setConnectKind("robot");
                  setStep("connect-guide");
                }}
                className="w-full rounded-xl border border-borderSubtle p-4 text-left hover:border-themeBlue"
              >
                <p className="text-sm font-semibold text-textWhiteHover">
                  <T>{"Connect a robot"}</T>{" "}
                </p>
                <p className="mt-1 text-xs text-themeTextGray">
                  <T>{"Point this UI at a real robot's connection."}</T>{" "}
                </p>
              </button>
              <button
                onClick={() => {
                  setConnectKind("simulation");
                  setStep("connect-guide");
                }}
                className="w-full rounded-xl border border-borderSubtle p-4 text-left hover:border-themeBlue"
              >
                <p className="text-sm font-semibold text-textWhiteHover">
                  <T>{"Connect to a simulation"}</T>{" "}
                </p>
                <p className="mt-1 text-xs text-themeTextGray">
                  <T>
                    {
                      "Point this UI at a simulated ROS 2 stack (e.g. Gazebo) the same way you would a real robot."
                    }
                  </T>{" "}
                </p>
              </button>
            </div>
          </>
        )}

        {step === "connect-guide" && (
          <>
            <p className="font-[RobotoMono] text-[11px] uppercase tracking-[0.14em] text-themeBlue">
              {connectKind === "simulation"
                ? "Connect to a simulation"
                : "Connect a robot"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-textWhiteHover">
              <T>{"Three steps"}</T>{" "}
            </h2>
            <ol className="mt-3 space-y-2.5 text-sm text-themeTextGray">
              <li>
                <span className="font-semibold text-textWhiteHover">
                  <T>{"1. Configure the connection —"}</T>{" "}
                </span>{" "}
                <T>{"set the host and port on the Config page."}</T>{" "}
              </li>
              <li>
                <span className="font-semibold text-textWhiteHover">
                  <T>{"2. Test the connection —"}</T>{" "}
                </span>{" "}
                <T>
                  {
                    "watch the status dot in the sidebar, or check the Health page for a full rollup."
                  }
                </T>{" "}
              </li>
              <li>
                <span className="font-semibold text-textWhiteHover">
                  <T>{"3. Detect available devices —"}</T>{" "}
                </span>{" "}
                <T>
                  {
                    "the Devices page can find real serial ports if you have USB hardware attached."
                  }
                </T>{" "}
              </li>
            </ol>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => finish("/config")}
                className="rounded-lg bg-themeBlue px-4 py-2 text-sm font-semibold text-white hover:bg-themeMediumBlue"
              >
                <T>{"Go to Config"}</T>{" "}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
