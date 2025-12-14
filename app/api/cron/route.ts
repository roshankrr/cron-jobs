import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { parseCurl } from '@/lib/curl-parser';
import { shouldRunJob, Schedule } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

type JobHeader = {
  key: string;
  value: string;
};

type Job = {
  name: string;
  mode?: 'url' | 'curl';
  url?: string;
  curl?: string;
  headers?: JobHeader[];
  schedule?: Schedule;
  lastRun: string | null;
  status: 'ok' | 'error' | 'pending';
  lastDuration?: number;
  lastStatusCode?: number | null;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fetch all jobs as strings
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  if (!rawJobs || rawJobs.length === 0) {
    return NextResponse.json({ message: 'No jobs to run' });
  }

  // Parse strings back to JSON objects
  const jobs: Job[] = rawJobs.map((j) => JSON.parse(j));

  const results = await Promise.all(
    jobs.map(async (job, index) => {
      // Check if job should run based on schedule
      const schedule = job.schedule || 'daily';
      if (!shouldRunJob(schedule, job.lastRun)) {
        return { name: job.name, skipped: true, reason: `Not scheduled (${schedule})` };
      }

      try {
        const start = Date.now();
        let res: Response;

        if (job.mode === 'curl' && job.curl) {
          // Parse and execute curl command
          const parsed = parseCurl(job.curl);

          if (!parsed.url) {
            throw new Error('No URL found in curl command');
          }

          const fetchOptions: RequestInit = {
            method: parsed.method,
            headers: parsed.headers,
          };

          if (parsed.body && ['POST', 'PUT', 'PATCH'].includes(parsed.method)) {
            fetchOptions.body = parsed.body;
          }

          res = await fetch(parsed.url, fetchOptions);
        } else {
          // URL mode - build headers from job.headers array
          const headerObj: Record<string, string> = {};
          if (job.headers && Array.isArray(job.headers)) {
            job.headers.forEach((h: JobHeader) => {
              if (h.key) headerObj[h.key] = h.value;
            });
          }

          res = await fetch(job.url!, {
            method: 'GET',
            headers: headerObj,
          });
        }

        const duration = Date.now() - start;

        const updatedJob = {
          ...job,
          lastRun: new Date().toISOString(),
          status: res.ok ? 'ok' : 'error',
          lastDuration: duration,
          lastStatusCode: res.status,
        };

        // Update the specific item in the list
        await redis.lset('cron:jobs', index, JSON.stringify(updatedJob));

        return { name: job.name, status: res.status, executed: true };
      } catch (error) {
        const failedJob = {
          ...job,
          lastRun: new Date().toISOString(),
          status: 'error',
          lastStatusCode: null,
        };
        await redis.lset('cron:jobs', index, JSON.stringify(failedJob));
        return { name: job.name, error: 'Failed to fetch', executed: true };
      }
    })
  );

  const executed = results.filter((r: any) => r.executed).length;
  const skipped = results.filter((r: any) => r.skipped).length;

  return NextResponse.json({
    success: true,
    summary: { total: jobs.length, executed, skipped },
    results
  });
}