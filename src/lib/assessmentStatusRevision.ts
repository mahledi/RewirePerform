const revisions = new Map<string, number>();

export const markAssessmentStatusChanged = (userId: string) => {
  const revision = Date.now();
  revisions.set(userId, revision);
  return revision;
};

export const getAssessmentStatusRevision = (userId: string | null | undefined) =>
  userId ? revisions.get(userId) ?? 0 : 0;

export const clearAssessmentStatusRevision = (userId?: string) => {
  if (userId) revisions.delete(userId);
  else revisions.clear();
};
