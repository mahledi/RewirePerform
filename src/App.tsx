import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { MinorAuthorizationProvider } from "@/contexts/MinorAuthorizationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MinorAuthorizationGate from "@/components/minor-consent/MinorAuthorizationGate";
import QATestBanner from "./components/qa/QATestBanner";
import { NotificationOpenTracker } from "./components/notifications/NotificationOpenTracker";
import { NativeNotificationRouter } from "./components/notifications/NativeNotificationRouter";
import ErrorBoundary from "./components/ErrorBoundary";
import IosInputPolish from "./components/IosInputPolish";
import AppLoadingShell from "./components/AppLoadingShell";
import ConnectionStatus from "./components/ConnectionStatus";
import PostSignupOnboardingGate from "./components/onboarding/PostSignupOnboardingGate";
import NativeAuthReturnHandler from "./components/auth/NativeAuthReturnHandler";
import AppScrollReset from "./components/app/AppScrollReset";

const queryClient = new QueryClient();
const evidencePreviewEnabled = import.meta.env.DEV
  || import.meta.env.VITE_ENABLE_EVIDENCE_PREVIEW === "true";

const Index = lazy(() => import("./pages/Index.tsx"));
const FirstRunRoleEntry = lazy(() => import("./pages/FirstRunRoleEntry.tsx"));
const AthleteFirstRunEntry = lazy(() => import("./pages/AthleteFirstRunEntry.tsx"));
const CoachFirstRunEntry = lazy(() => import("./pages/CoachFirstRunEntry.tsx"));
const Demo = lazy(() => import("./demo/DemoPage.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const TeamInvite = lazy(() => import("./pages/TeamInvite.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Questionnaire = lazy(() => import("./pages/Questionnaire.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Assessment = lazy(() => import("./pages/Assessment.tsx"));
const Coach = lazy(() => import("./pages/Coach.tsx"));
const DeepProfile = lazy(() => import("./pages/DeepProfile.tsx"));
const Progress = lazy(() => import("./pages/Progress.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const AccountSettings = lazy(() => import("./pages/AccountSettings.tsx"));
const AccountDeleted = lazy(() => import("./pages/AccountDeleted.tsx"));
const Journal = lazy(() => import("./pages/Journal.tsx"));
const JournalHistory = lazy(() => import("./pages/JournalHistory.tsx"));
const PreTraining = lazy(() => import("./pages/PreTraining.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminContent = lazy(() => import("./pages/AdminContent.tsx"));
const AdminQA = lazy(() => import("./pages/AdminQA.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Imprint = lazy(() => import("./pages/Imprint.tsx"));
const Presentation = lazy(() => import("./pages/Presentation.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const OrganizationAccess = lazy(() => import("./pages/OrganizationAccess.tsx"));
const OrganizationInvite = lazy(() => import("./pages/OrganizationInvite.tsx"));
const MinorConsent = lazy(() => import("./pages/MinorConsent.tsx"));
const GuardianDecision = lazy(() => import("./pages/GuardianDecision.tsx"));
const EvidencePreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/EvidencePreview.tsx"))
  : null;
const EmailPreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/EmailPreview.tsx"))
  : null;
const MinorConsentPreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/MinorConsentPreview.tsx"))
  : null;
const FirstRunExperiencePreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/FirstRunExperiencePreview.tsx"))
  : null;
const CoachFirstRunExperiencePreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/CoachFirstRunExperience.tsx"))
  : null;
const FeedbackIntelligencePreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/FeedbackIntelligencePreview.tsx"))
  : null;
const FeedbackCheckpointGate = lazy(
  () => import("./components/feedback-intelligence/FeedbackCheckpointGate.tsx"),
);
const GoldenDaysPreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/GoldenDaysPreview.tsx"))
  : null;
const ProgramContentPreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/ProgramContentPreview.tsx"))
  : null;
const WebsiteGoldenPagePreview = evidencePreviewEnabled
  ? lazy(() => import("./pages/WebsiteGoldenPagePreview.tsx"))
  : null;
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const PageFallback = () => (
  <AppLoadingShell subtitle="Öffne deinen Bereich..." />
);

const AppRoutes = () => {
  const location = useLocation();
  const isEvidencePreview = EvidencePreview !== null && location.pathname === "/internal/evidence-preview";
  const isEmailPreview = EmailPreview !== null && location.pathname === "/internal/email-preview";
  const isMinorConsentPreview = MinorConsentPreview !== null && location.pathname === "/internal/minor-consent-preview";
  const isFirstRunExperiencePreview = FirstRunExperiencePreview !== null
    && location.pathname === "/internal/first-run-preview";
  const isCoachFirstRunExperiencePreview = CoachFirstRunExperiencePreview !== null
    && location.pathname === "/internal/coach-first-run-preview";
  const isFeedbackIntelligencePreview = FeedbackIntelligencePreview !== null
    && location.pathname === "/internal/feedback-intelligence-preview";
  const isGoldenDaysPreview = GoldenDaysPreview !== null
    && location.pathname === "/internal/golden-days-preview";
  const isProgramContentPreview = ProgramContentPreview !== null
    && location.pathname === "/internal/program-content-preview";
  const isWebsiteGoldenPagePreview = WebsiteGoldenPagePreview !== null
    && location.pathname === "/internal/website-golden-page-preview";
  const isDemoRoute = location.pathname === "/demo"
    || isEvidencePreview
    || isEmailPreview
    || isMinorConsentPreview
    || isFirstRunExperiencePreview
    || isCoachFirstRunExperiencePreview
    || isFeedbackIntelligencePreview
    || isGoldenDaysPreview
    || isProgramContentPreview
    || isWebsiteGoldenPagePreview;

  if (isDemoRoute) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/demo" element={<Demo />} />
            {EvidencePreview && <Route path="/internal/evidence-preview" element={<EvidencePreview />} />}
            {EmailPreview && <Route path="/internal/email-preview" element={<EmailPreview />} />}
            {MinorConsentPreview && <Route path="/internal/minor-consent-preview" element={<MinorConsentPreview />} />}
            {FirstRunExperiencePreview && (
              <Route path="/internal/first-run-preview" element={<FirstRunExperiencePreview />} />
            )}
            {CoachFirstRunExperiencePreview && (
              <Route path="/internal/coach-first-run-preview" element={<CoachFirstRunExperiencePreview />} />
            )}
            {FeedbackIntelligencePreview && (
              <Route path="/internal/feedback-intelligence-preview" element={<FeedbackIntelligencePreview />} />
            )}
            {GoldenDaysPreview && (
              <Route path="/internal/golden-days-preview" element={<GoldenDaysPreview />} />
            )}
            {ProgramContentPreview && (
              <Route path="/internal/program-content-preview" element={<ProgramContentPreview />} />
            )}
            {WebsiteGoldenPagePreview && (
              <Route path="/internal/website-golden-page-preview" element={<WebsiteGoldenPagePreview />} />
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    );
  }

  return (
    <AuthProvider>
      <MinorAuthorizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <QATestBanner />
          <NativeAuthReturnHandler />
          <NotificationOpenTracker />
          <NativeNotificationRouter />
          <IosInputPolish />
          <ConnectionStatus />
          <Suspense fallback={<PageFallback />}>
            <Suspense fallback={null}><FeedbackCheckpointGate /></Suspense>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/start" element={<FirstRunRoleEntry />} />
            <Route path="/start/athlete" element={<AthleteFirstRunEntry />} />
            <Route path="/start/coach" element={<CoachFirstRunEntry />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/coach-pitch" element={<Presentation />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/imprint" element={<Imprint />} />
            <Route path="/support" element={<Support />} />
            <Route path="/team-access" element={<OrganizationAccess />} />
            <Route path="/organization/invite" element={<OrganizationInvite />} />
            <Route path="/guardian/decision" element={<GuardianDecision />} />
            <Route path="/account-deleted" element={<AccountDeleted />} />
            <Route path="/join" element={<TeamInvite />} />
            <Route path="/welcome" element={
              <ProtectedRoute><MinorAuthorizationGate><Welcome /></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/minor-consent" element={
              <ProtectedRoute><MinorConsent /></ProtectedRoute>
            } />
            <Route path="/questionnaire" element={
              <ProtectedRoute>
                <MinorAuthorizationGate>
                  <PostSignupOnboardingGate><Questionnaire /></PostSignupOnboardingGate>
                </MinorAuthorizationGate>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><Dashboard /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/assessment" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><Assessment /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/coach" element={
              <ProtectedRoute><Coach /></ProtectedRoute>
            } />
            <Route path="/deep-profile" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><DeepProfile /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><Progress /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
            <Route path="/settings/account" element={
              <ProtectedRoute><AccountSettings /></ProtectedRoute>
            } />
            <Route path="/journal" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><Journal /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/journal/history" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><JournalHistory /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
            } />
            <Route path="/pre-training" element={
              <ProtectedRoute><MinorAuthorizationGate><PostSignupOnboardingGate><PreTraining /></PostSignupOnboardingGate></MinorAuthorizationGate></ProtectedRoute>
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
      </MinorAuthorizationProvider>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <BrowserRouter>
        <AppScrollReset />
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
