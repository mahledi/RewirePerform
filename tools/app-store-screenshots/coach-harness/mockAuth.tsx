const screenshotCoach = {
  id: "coach-screenshot-demo",
  email: "coach@example.invalid",
  user_metadata: {
    full_name: "Coach",
  },
};

const screenshotSession = {
  access_token: "screenshot-only-token",
  refresh_token: "screenshot-only-refresh",
  expires_in: 3600,
  expires_at: 4_102_444_800,
  token_type: "bearer",
  user: screenshotCoach,
};

export const useAuth = () => ({
  user: screenshotCoach,
  session: screenshotSession,
  loading: false,
  role: "coach" as const,
  roleVerified: true,
  roleLoading: false,
  isTestUser: true,
  verifyRole: async () => ({ ok: true as const, value: "coach" as const }),
  signOut: async () => undefined,
});
