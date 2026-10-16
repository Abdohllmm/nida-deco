import "./lib/zodSetup";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { ToastProvider } from "./components/Toast";
import "./index.css";
import { shouldRetryQuery } from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      // On ne réessaie pas une erreur « normale » (404, 401, 400…) : seulement les pannes réseau ou serveur.
      retry: shouldRetryQuery,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
