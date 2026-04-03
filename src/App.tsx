import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { RBACProvider } from "@/contexts/RBACContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CallProvider } from "@/components/call/CallProvider";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ActiveUsers from "./pages/ActiveUsers";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import NotificationHub from "./pages/NotificationHub";
import ResetPassword from "./pages/ResetPassword";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { OfflineBanner } from "@/components/OfflineBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30 * 1000, // 30s
      gcTime: 5 * 60 * 1000, // 5min
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Query error:', error.message);
    },
  }),
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="meku-theme">
        <RBACProvider>
          <CallProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <PWAUpdatePrompt />
              <OfflineBanner />
            
            <HashRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/app" element={<ErrorBoundary><Index /></ErrorBoundary>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/active-users" element={<ActiveUsers />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/notifhub" element={<NotificationHub />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
          </CallProvider>
        </RBACProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
