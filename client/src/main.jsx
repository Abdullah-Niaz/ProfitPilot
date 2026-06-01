import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { store } from "./app/store.js";
import { queryClient } from "./app/queryClient.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
