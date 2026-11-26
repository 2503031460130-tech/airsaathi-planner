import React from "react";
import { createRoot } from "react-dom/client";
import { Gate } from "./Gate";
import { ErrorBoundary } from "./ErrorBoundary";
import "./base.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Gate />
  </ErrorBoundary>,
);
