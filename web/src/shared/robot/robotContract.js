// Proposed project integration points. Empty names mean the robot-side
// interface has not been supplied or accepted. Never infer it from Nav2.
export const INSPECTION_PROFILE =
  (import.meta.env.VITE_UI_PROFILE || import.meta.env.REACT_APP_UI_PROFILE) === "inspection_demo";

export const robotContract = Object.freeze({
  mapTopic: "/ui/map", // Existing UI relay, not a project robot interface.
  localizationPoseTopic: "",
  localizationStateTopic: "",
  navigationGoalTopic: "",
  navigationStatusTopic: "",
  navigationCancelService: "",
  missionCommandTopic: "",
  missionStateTopic: "",
  softwareStopService: "",
  manualCommandTopic: "",
});

