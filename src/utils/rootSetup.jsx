import React from "react";
import ReactDOM from "react-dom/client";
import { APP_CONFIG } from "../config/appConfig";

/**
 * Sets up and renders the React root
 * @param {React.Component} AppComponent - The main App component to render
 */
export function setupRoot(AppComponent) {
  const rootElement = document.getElementById(APP_CONFIG.rootElementId);
  
  if (!rootElement) {
    throw new Error(`Root element with id "${APP_CONFIG.rootElementId}" not found`);
  }

  const root = ReactDOM.createRoot(rootElement);
  
  const appElement = APP_CONFIG.strictMode ? (
    <React.StrictMode>
      <AppComponent />
    </React.StrictMode>
  ) : (
    <AppComponent />
  );

  root.render(appElement);
  
  return root;
}





