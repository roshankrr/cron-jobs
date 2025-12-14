import { kv } from '@vercel/kv';
import { addJob, deleteJob } from './actions';
import { BadgeCheck, BadgeAlert, Clock, Trash2, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const jobs = await kv.lrange('cron:jobs', 0, -1) || [];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cron Commander</h1>
            <p className="text-neutral-400">Keep your apps alive and healthy</p>
          </div>
        </div>

        {/* Add Job Form */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add Target</h2>
          <form action={addJob} className="flex gap-3">
            <input
              name="name"
              placeholder="App Name (e.g. Flute Tuner)"
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <input
              name="url"
              type="url"
              placeholder="https://..."
              className="flex-[2] bg-neutral-800 border border-neutral-700 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Add
            </button>
          </form>
        </div>

        {/* Job List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
             <div className="text-center py-10 text-neutral-500">No jobs running. Add one above!</div>
          ) : (
            jobs.map((job: any, index: number) => (
              <div 
                key={index} 
                className="group flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-xl hover:border-neutral-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-200">{job.name}</h3>
                    {job.status === 'ok' && <BadgeCheck className="w-4 h-4 text-green-500" />}
                    {job.status === 'error' && <BadgeAlert className="w-4 h-4 text-red-500" />}
                    {job.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <p className="text-xs text-neutral-500 font-mono truncate max-w-md">{job.url}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Last Run</p>
                    <p className="text-xs font-mono text-neutral-300">
                      {job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                  
                  <form action={deleteJob.bind(null, index)}>
                    <button className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}