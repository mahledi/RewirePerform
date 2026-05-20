import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Questionnaire from "./pages/Questionnaire.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Assessment from "./pages/Assessment.tsx";
import Coach from "./pages/Coach.tsx";
import DeepProfile from "./pages/DeepProfile.tsx";
import Progress from "./pages/Progress.tsx";
import Settings from "./pages/Settings.tsx";
import Journal from "./pages/Journal.tsx";
import PreTraining from "./pages/PreTraining.tsx";
import Admin from "./pages/Admin.tsx";
import AdminContent from "./pages/AdminContent.tsx";
import AdminQA from "./pages/AdminQA.tsx";
import Privacy from "./pages/Privacy.tsx";
import Support from "./pages/Support.tsx";
import NotFound from "./pages/NotFound.tsx";
import QATestBanner from "./components/qa/QATestBanner";
import { NotificationOpenTracker } from "./components/notifications/NotificationOpenTracker";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <QATestBanner />
          <NotificationOpenTracker />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
