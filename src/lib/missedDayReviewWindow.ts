export const getRecentMissedDayReviewWindow = (currentDayNumber: number) => {
  const oldestReviewDay = Math.max(1, currentDayNumber - 3);
  const dayNumbers: number[] = [];

  for (let dayNumber = currentDayNumber - 1; dayNumber >= oldestReviewDay; dayNumber -= 1) {
    dayNumbers.push(dayNumber);
  }

  return dayNumbers;
};
