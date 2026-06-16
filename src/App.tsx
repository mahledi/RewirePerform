import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import QATestBanner from "./components/qa/QATestBanner";
import { NotificationOpenTracker } from "./components/notifications/NotificationOpenTracker";
import ErrorBoundary from "./components/ErrorBoundary";
import IosInputPolish from "./components/IosInputPolish";
import AppLoadingShell from "./components/AppLoadingShell";
import ConnectionStatus from "./components/ConnectionStatus";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const Demo = lazy(() => import("./demo/DemoPage.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Questionnaire = lazy(() => import("./pages/Questionnaire.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Assessment = lazy(() => import("./pages/Assessment.tsx"));
const Coach = lazy(() => import("./pages/Coach.tsx"));
const DeepProfile = lazy(() => import("./pages/DeepProfile.tsx"));
const Progress = lazy(() => import("./pages/Progress.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Journal = lazy(() => import("./pages/Journal.tsx"));
const JournalHistory = lazy(() => import("./pages/JournalHistory.tsx"));
const PreTraining = lazy(() => import("./pages/PreTraining.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminContent = lazy(() => import("./pages/AdminContent.tsx"));
const AdminQA = lazy(() => import("./pages/AdminQA.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const PageFallback = () => (
  <AppLoadingShell subtitle="Öffne deinen Bereich..." />
);

const AppRoutes = () => {
  const location = useLocation();
  const isDemoRoute = location.pathname === "/demo";

  if (isDemoRoute) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/demo" element={<Demo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    );
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <QATestBanner />
        <NotificationOpenTracker />
        <IosInputPolish />
        <ConnectionStatus />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/questionnaire" element={
              <ProtectedRoute><Questionnaire /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/assessment" element={
              <ProtectedRoute><Assessment /></ProtectedRoute>
            } />
            <Route path="/coach" element={
              <ProtectedRoute><Coach /></ProtectedRoute>
            } />
            <Route path="/deep-profile" element={
              <ProtectedRoute><DeepProfile /></ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute><Progress /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
            <Route path="/journal" element={
              <ProtectedRoute><Journal /></ProtectedRoute>
            } />
            <Route path="/journal/history" element={
              <ProtectedRoute><JournalHistory /></ProtectedRoute>
            } />
            <Route path="/pre-training" element={
              <ProtectedRoute><PreTraining /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute><Admin /></ProtectedRoute>
            } />
            <Route path="/admin/content" element={
              <ProtectedRoute><AdminContent /></ProtectedRoute>
            } />
            <Route path="/admin/qa" element={
              <ProtectedRoute><AdminQA /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
