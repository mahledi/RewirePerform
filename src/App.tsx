import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import QATestBanner from "./components/qa/QATestBanner";
import { NotificationOpenTracker } from "./components/notifications/NotificationOpenTracker";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Questionnaire = lazy(() => import("./pages/Questionnaire.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Assessment = lazy(() => import("./pages/Assessment.tsx"));
const Coach = lazy(() => import("./pages/Coach.tsx"));
const DeepProfile = lazy(() => import("./pages/DeepProfile.tsx"));
const Progress = lazy(() => import("./pages/Progress.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Journal = lazy(() => import("./pages/Journal.tsx"));
const PreTraining = lazy(() => import("./pages/PreTraining.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminContent = lazy(() => import("./pages/AdminContent.tsx"));
const AdminQA = lazy(() => import("./pages/AdminQA.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const PageFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
    <div className="h-9 w-9 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <QATestBanner />
          <NotificationOpenTracker />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
