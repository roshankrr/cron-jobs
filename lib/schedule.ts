export type Schedule = 'hourly' | 'every6hours' | 'daily' | 'weekly';

/**
 * Check if a job should run based on its schedule and last run time.
 * Returns true if the job should run now.
 */
export function shouldRunJob(schedule: Schedule, lastRun: string | null): boolean {
  const now = new Date();

  // If never run before, always run
  if (!lastRun) {
    return true;
  }

  const lastRunDate = new Date(lastRun);
  const timeSinceLastRun = now.getTime() - lastRunDate.getTime();
  const hourInMs = 60 * 60 * 1000;

  switch (schedule) {
    case 'hourly':
      // Run if at least 55 minutes have passed (with 5 min buffer)
      return timeSinceLastRun >= 55 * 60 * 1000;

    case 'every6hours':
      // Run if at least 5 hours 55 minutes have passed
      return timeSinceLastRun >= (6 * hourInMs - 5 * 60 * 1000);

    case 'daily':
      // Run if at least 23 hours 55 minutes have passed
      return timeSinceLastRun >= (24 * hourInMs - 5 * 60 * 1000);

    case 'weekly':
      // Run if at least 6 days 23 hours have passed
      return timeSinceLastRun >= (7 * 24 * hourInMs - hourInMs);

    default:
      // Default to daily behavior
      return timeSinceLastRun >= (24 * hourInMs - 5 * 60 * 1000);
  }
}

/**
 * Get the next run time for a job based on its schedule.
 */
export function getNextRunTime(schedule: Schedule, lastRun: string | null): Date {
  const now = new Date();

  if (!lastRun) {
    return now;
  }

  const lastRunDate = new Date(lastRun);
  const hourInMs = 60 * 60 * 1000;

  switch (schedule) {
    case 'hourly':
      return new Date(lastRunDate.getTime() + hourInMs);
    case 'every6hours':
      return new Date(lastRunDate.getTime() + 6 * hourInMs);
    case 'daily':
      return new Date(lastRunDate.getTime() + 24 * hourInMs);
    case 'weekly':
      return new Date(lastRunDate.getTime() + 7 * 24 * hourInMs);
    default:
      return new Date(lastRunDate.getTime() + 24 * hourInMs);
  }
}
