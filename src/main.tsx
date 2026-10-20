import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Elemento #root em falta");

createRoot(rootEl).render(<App />);
