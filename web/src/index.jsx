import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";

// Plugins must install before the router/nav render.
import { installNotesPlugin } from "./plugins/notesPlugin";
installNotesPlugin();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
