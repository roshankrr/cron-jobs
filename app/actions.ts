'use server';

import { redis } from '@/lib/redis';
import { parseCurl } from '@/lib/curl-parser';
import { revalidatePath } from 'next/cache';

interface JobHeader {
  key: string;
  value: string;
}

export type Schedule = 'hourly' | 'every6hours' | 'daily' | 'weekly';

export async function addJob(formData: FormData) {
  const name = formData.get('name') as string;
  const mode = formData.get('mode') as string || 'url';
  const schedule = (formData.get('schedule') as Schedule) || 'daily';

  if (!name) return;

  let newJob: any;

  if (mode === 'curl') {
    const curl = formData.get('curl') as string;
    if (!curl) return;

    newJob = {
      id: crypto.randomUUID(),
      name,
      mode: 'curl',
      curl,
      schedule,
      lastRun: null,
      status: 'pending',
    };
  } else {
    const url = formData.get('url') as string;
    const headersJson = formData.get('headers') as string;

    if (!url) return;

    let headers: JobHeader[] = [];
    if (headersJson) {
      try {
        headers = JSON.parse(headersJson);
      } catch {
        headers = [];
      }
    }

    newJob = {
      id: crypto.randomUUID(),
      name,
      mode: 'url',
      url,
      headers,
      schedule,
      lastRun: null,
      status: 'pending',
    };
  }

  // Redis lists store strings, so we stringify the object
  await redis.rpush('cron:jobs', JSON.stringify(newJob));
  revalidatePath('/');
}

export async function updateJobSchedule(jobId: string, schedule: Schedule) {
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  const jobs = rawJobs.map((j) => JSON.parse(j));
  const jobIndex = jobs.findIndex((j: any) => j.id === jobId);

  if (jobIndex === -1) return;

  jobs[jobIndex].schedule = schedule;

  await redis.del('cron:jobs');
  if (jobs.length > 0) {
    await redis.rpush('cron:jobs', ...jobs.map((j: any) => JSON.stringify(j)));
  }

  revalidatePath('/');
}

export async function runJob(jobId: string) {
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  const jobs = rawJobs.map((j) => JSON.parse(j));
  const jobIndex = jobs.findIndex((j: any) => j.id === jobId);

  if (jobIndex === -1) return { success: false, error: 'Job not found' };

  const job = jobs[jobIndex];

  try {
    let response: Response;

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

      response = await fetch(parsed.url, fetchOptions);
    } else {
      // URL mode
      const headerObj: Record<string, string> = {};
      if (job.headers && Array.isArray(job.headers)) {
        job.headers.forEach((h: JobHeader) => {
          if (h.key) headerObj[h.key] = h.value;
        });
      }

      response = await fetch(job.url, {
        method: 'GET',
        headers: headerObj,
      });
    }

    job.lastRun = new Date().toISOString();
    job.status = response.ok ? 'ok' : 'error';
    job.lastStatusCode = response.status;
  } catch (error) {
    job.lastRun = new Date().toISOString();
    job.status = 'error';
    job.lastStatusCode = null;
  }

  // Update job in Redis
  jobs[jobIndex] = job;
  await redis.del('cron:jobs');
  if (jobs.length > 0) {
    await redis.rpush('cron:jobs', ...jobs.map((j: any) => JSON.stringify(j)));
  }

  revalidatePath('/');
  return { success: true, status: job.status };
}

export async function updateJobHeaders(jobId: string, headers: JobHeader[]) {
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  const jobs = rawJobs.map((j) => JSON.parse(j));
  const jobIndex = jobs.findIndex((j: any) => j.id === jobId);

  if (jobIndex === -1) return;

  jobs[jobIndex].headers = headers;

  await redis.del('cron:jobs');
  if (jobs.length > 0) {
    await redis.rpush('cron:jobs', ...jobs.map((j: any) => JSON.stringify(j)));
  }

  revalidatePath('/');
}

export async function updateJobCurl(jobId: string, curl: string) {
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  const jobs = rawJobs.map((j) => JSON.parse(j));
  const jobIndex = jobs.findIndex((j: any) => j.id === jobId);

  if (jobIndex === -1) return;

  jobs[jobIndex].curl = curl;

  await redis.del('cron:jobs');
  if (jobs.length > 0) {
    await redis.rpush('cron:jobs', ...jobs.map((j: any) => JSON.stringify(j)));
  }

  revalidatePath('/');
}

export async function deleteJob(jobId: string) {
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  const jobs = rawJobs.map((j) => JSON.parse(j));
  const newJobs = jobs.filter((j: any) => j.id !== jobId);

  await redis.del('cron:jobs');

  if (newJobs.length > 0) {
    await redis.rpush('cron:jobs', ...newJobs.map((j: any) => JSON.stringify(j)));
  }

  revalidatePath('/');
}