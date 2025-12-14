import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic'; // Prevent caching

type Job = {
  id: string;
  name: string;
  url: string;
  lastRun: string | null;
  status: 'ok' | 'error' | 'pending';
};

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Fetch Jobs from DB
  const jobs = await kv.lrange<Job>('cron:jobs', 0, -1);
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: 'No jobs to run' });
  }

  // 3. Execute Pings in Parallel
  const results = await Promise.all(
    jobs.map(async (job, index) => {
      try {
        const start = Date.now();
        const res = await fetch(job.url, { method: 'GET' }); // Simple GET ping
        const duration = Date.now() - start;
        
        // Update Job Status
        const updatedJob = {
          ...job,
          lastRun: new Date().toISOString(),
          status: res.ok ? 'ok' : 'error',
          lastDuration: duration
        };
        
        // Update in KV (We replace the item at the specific index)
        // Note: For a robust production app, use IDs and a Hash map. 
        // For simplicity here, we update by index.
        await kv.lset('cron:jobs', index, updatedJob);

        return { name: job.name, status: res.status };
      } catch (error) {
         const failedJob = {
          ...job,
          lastRun: new Date().toISOString(),
          status: 'error',
        };
        await kv.lset('cron:jobs', index, failedJob);
        return { name: job.name, error: 'Failed to fetch' };
      }
    })
  );

  return NextResponse.json({ success: true, results });
}