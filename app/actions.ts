'use server';

import { kv } from '@vercel/kv';
import { revalidatePath } from 'next/cache';

export async function addJob(formData: FormData) {
  const name = formData.get('name') as string;
  const url = formData.get('url') as string;

  if (!name || !url) return;

  const newJob = {
    id: crypto.randomUUID(),
    name,
    url,
    lastRun: null,
    status: 'pending',
  };

  await kv.rpush('cron:jobs', newJob);
  revalidatePath('/');
}

export async function deleteJob(index: number) {
  // In a real app, use IDs and kv.lrem, but we must match the exact object.
  // For this simple demo, we will use lpop/rpop logic or just clear/reset.
  // A safer way for lists is fetching all, filtering, and resetting.
  
  const jobs = await kv.lrange('cron:jobs', 0, -1);
  const newJobs = jobs.filter((_, i) => i !== index);
  
  await kv.del('cron:jobs');
  if (newJobs.length > 0) {
    await kv.rpush('cron:jobs', ...newJobs);
  }
  revalidatePath('/');
}