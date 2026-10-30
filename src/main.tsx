import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FloorGame } from "./components/floor/FloorGame";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FloorGame />
  </StrictMode>,
);
