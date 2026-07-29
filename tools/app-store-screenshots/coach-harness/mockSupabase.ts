type Row = Record<string, unknown>;
type Result = { data: unknown; error: null };

const athletes = Array.from({ length: 6 }, (_, index) => ({
  id: `athlete-${index + 1}`,
  full_name: `Spieler ${String(index + 1).padStart(2, "0")}`,
}));

const tables: Record<string, Row[]> = {
  teams: [
    {
      id: "team-demo",
      name: "Beispielteam",
      sport: "Multisport",
      access_code: "000000",
      created_by: "coach-screenshot-demo",
      program_start_date: "2026-07-08",
      program_activated_at: "2026-07-08T08:00:00.000Z",
    },
  ],
  team_members: [
    { team_id: "team-demo", user_id: "coach-screenshot-demo" },
    ...athletes.map((athlete) => ({
      team_id: "team-demo",
      user_id: athlete.id,
    })),
  ],
  user_roles: [
    { user_id: "coach-screenshot-demo", role: "coach" },
    ...athletes.map((athlete) => ({
      user_id: athlete.id,
      role: "athlete",
    })),
  ],
  assessments: athletes.map((athlete) => ({
    user_id: athlete.id,
  })),
  app_event_log: [],
};

class MockQuery {
  private filters: Array<(row: Row) => boolean> = [];

  constructor(private readonly table: string) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  or() {
    return this;
  }

  gte() {
    return this;
  }

  lte() {
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  retry() {
    return this;
  }

  abortSignal() {
    return this;
  }

  insert() {
    return this;
  }

  update() {
    return this;
  }

  upsert() {
    return this;
  }

  delete() {
    return this;
  }

  private rows() {
    return (tables[this.table] ?? []).filter((row) =>
      this.filters.every((filter) => filter(row)));
  }

  maybeSingle(): Promise<Result> {
    return Promise.resolve({ data: this.rows()[0] ?? null, error: null });
  }

  single(): Promise<Result> {
    return this.maybeSingle();
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve<Result>({ data: this.rows(), error: null }).then(
      onfulfilled,
      onrejected,
    );
  }
}

const activityRows = athletes.map((athlete, index) => ({
  user_id: athlete.id,
  full_name: athlete.full_name,
  last_activity_at: "2026-07-29T08:00:00.000Z",
  days_completed: 18 - index,
  days_available: 22,
  completion_rate: (18 - index) / 22,
  current_streak: Math.max(2, 7 - index),
  checkins_last_7d: Math.max(3, 7 - index),
  last_checkin_date: "2026-07-29",
  journal_entries_count: 12 - index,
  inactive_risk: false,
}));

export const supabase = {
  from: (table: string) => new MockQuery(table),
  rpc: async (name: string) => {
    if (name === "get_coach_team_activity_status") {
      return { data: activityRows, error: null };
    }
    return { data: [], error: null };
  },
  functions: {
    invoke: async (name: string) => {
      if (name === "team-mental-state") {
        return {
          data: {
            teamSize: athletes.length,
            min_n: 5,
            participation: { rate: 83, total: 5 },
            energy: {
              current: 6.4,
              trend: [
                { week: "2026-W30", value: 6.1, n_users: 6, sufficient_data: true },
                { week: "2026-W31", value: 6.4, n_users: 6, sufficient_data: true },
              ],
            },
            mood: {
              current: 6.8,
              trend: [
                { week: "2026-W30", value: 6.5, n_users: 6, sufficient_data: true },
                { week: "2026-W31", value: 6.8, n_users: 6, sufficient_data: true },
              ],
            },
            focus: {
              current: 7.1,
              trend: [
                { week: "2026-W30", value: 6.8, n_users: 6, sufficient_data: true },
                { week: "2026-W31", value: 7.1, n_users: 6, sufficient_data: true },
              ],
            },
            stressWarning: false,
            wellbeing: {
              today: {
                date: "2026-07-29",
                n_users: 6,
                sufficient_data: true,
                low_confidence: false,
                mood: 6.8,
                energy: 6.4,
                focus: 7.1,
                stress: 4.2,
                recovery: 6.0,
                sleep_quality: 6.3,
                physical_readiness: 6.7,
                motivation: 7.2,
                pressure: 4.8,
                team_connection: 7.4,
              },
              daily_trends: [
                {
                  date: "2026-07-28",
                  n_users: 6,
                  sufficient_data: true,
                  mood: 6.5,
                  energy: 6.1,
                  focus: 6.8,
                  stress: 4.6,
                  recovery: 5.8,
                  sleep_quality: 6.0,
                  physical_readiness: 6.4,
                  motivation: 6.9,
                  pressure: 5.1,
                  team_connection: 7.1,
                },
                {
                  date: "2026-07-29",
                  n_users: 6,
                  sufficient_data: true,
                  mood: 6.8,
                  energy: 6.4,
                  focus: 7.1,
                  stress: 4.2,
                  recovery: 6.0,
                  sleep_quality: 6.3,
                  physical_readiness: 6.7,
                  motivation: 7.2,
                  pressure: 4.8,
                  team_connection: 7.4,
                },
              ],
              weekly_trends: [],
            },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  },
  auth: {
    signOut: async () => ({ error: null }),
  },
};
