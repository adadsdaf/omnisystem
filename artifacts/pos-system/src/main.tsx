import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

setBaseUrl("");

setAuthTokenGetter(() => {
  return localStorage.getItem("pos_token");
});

const root = document.getElementById("root");
if (root) {
  root.setAttribute("dir", "rtl");
}

createRoot(root!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
