/**
 * Formats a 24-hour integer hour into a standard HH:00 time string.
 * @param hour - Hour number between 0 and 24
 * @returns Zero-padded string representation (e.g., "08:00")
 */
export const formatHour = (hour: number): string =>
  `${String(hour).padStart(2, "0")}:00`;
