import { redis } from '@/lib/redis';
import { Activity } from 'lucide-react';
import { JobCard } from './components/JobCard';
import { AddJobForm } from './components/AddJobForm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const rawJobs = await redis.lrange('cron:jobs', 0, -1);
  // Parse the raw strings from Redis into objects
  const jobs = rawJobs.map((j) => JSON.parse(j));

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cron Commander</h1>
            <p className="text-neutral-400">Connected via standard Redis URL</p>
          </div>
        </div>

        <AddJobForm />

        <div className="space-y-4">
          {jobs.length === 0 ? (
             <div className="text-center py-10 text-neutral-500">No jobs running. Add one above!</div>
          ) : (
            jobs.map((job: any, index: number) => (
              <JobCard key={job.id || index} job={job} />
            ))
          )}
        </div>

      </div>
    </main>
  );
}