'use client';

import { useState } from 'react';
import { BadgeCheck, BadgeAlert, Clock, Trash2, Play, Settings, X, Plus, Loader2, Terminal, Globe } from 'lucide-react';
import { runJob, updateJobHeaders, updateJobCurl, updateJobSchedule, deleteJob, Schedule } from '../actions';

interface JobHeader {
  key: string;
  value: string;
}

interface Job {
  id: string;
  name: string;
  mode?: 'url' | 'curl';
  url?: string;
  curl?: string;
  headers?: JobHeader[];
  schedule?: Schedule;
  lastRun: string | null;
  status: 'ok' | 'error' | 'pending';
  lastStatusCode?: number | null;
}

const SCHEDULE_LABELS: Record<Schedule, string> = {
  hourly: 'Hourly',
  every6hours: 'Every 6h',
  daily: 'Daily',
  weekly: 'Weekly',
};

const SCHEDULE_OPTIONS: { value: Schedule; label: string }[] = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'every6hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily (midnight UTC)' },
  { value: 'weekly', label: 'Weekly (Sunday midnight)' },
];

export function JobCard({ job }: { job: Job }) {
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [headers, setHeaders] = useState<JobHeader[]>(job.headers || []);
  const [curl, setCurl] = useState(job.curl || '');
  const [schedule, setSchedule] = useState<Schedule>(job.schedule || 'daily');
  const [isSaving, setIsSaving] = useState(false);

  const isCurlMode = job.mode === 'curl';

  const handleRun = async () => {
    setIsRunning(true);
    await runJob(job.id);
    setIsRunning(false);
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (idx: number) => {
    setHeaders(headers.filter((_, i) => i !== idx));
  };

  const handleHeaderChange = (idx: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[idx][field] = value;
    setHeaders(newHeaders);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Update schedule if changed
    if (schedule !== job.schedule) {
      await updateJobSchedule(job.id, schedule);
    }
    if (isCurlMode) {
      await updateJobCurl(job.id, curl);
    } else {
      await updateJobHeaders(job.id, headers.filter(h => h.key.trim() !== ''));
    }
    setIsSaving(false);
    setShowSettings(false);
  };

  const handleCancel = () => {
    setHeaders(job.headers || []);
    setCurl(job.curl || '');
    setSchedule(job.schedule || 'daily');
    setShowSettings(false);
  };

  const handleDelete = async () => {
    await deleteJob(job.id);
  };

  // Get display URL - for curl mode, try to extract URL from curl command
  const displayUrl = isCurlMode
    ? (job.curl?.match(/https?:\/\/[^\s'"]+/)?.[0] || 'curl command')
    : job.url;

  return (
    <div className="group bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all">
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-200">{job.name}</h3>
            {isCurlMode ? (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                <Terminal className="w-3 h-3" /> cURL
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                <Globe className="w-3 h-3" /> GET
              </span>
            )}
            {job.status === 'ok' && <BadgeCheck className="w-4 h-4 text-green-500" />}
            {job.status === 'error' && <BadgeAlert className="w-4 h-4 text-red-500" />}
            {job.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
            {job.lastStatusCode && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${job.status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {job.lastStatusCode}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 font-mono truncate max-w-md">{displayUrl}</p>
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {SCHEDULE_LABELS[job.schedule || 'daily']}
            </span>
            {!isCurlMode && job.headers && job.headers.length > 0 && (
              <span>• {job.headers.length} header{job.headers.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <p className="text-xs text-neutral-400">Last Run</p>
            <p className="text-xs font-mono text-neutral-300">
              {job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : 'Never'}
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="p-2 text-neutral-400 hover:text-green-400 hover:bg-green-400/10 rounded-full transition-colors disabled:opacity-50"
            title="Run now"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'text-blue-400 bg-blue-400/10' : 'text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10'}`}
            title={isCurlMode ? 'Edit curl command' : 'Configure headers'}
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="border-t border-neutral-800 p-4 space-y-3">
          {isCurlMode ? (
            <>
              <h4 className="text-sm font-medium text-neutral-300">cURL Command</h4>
              <textarea
                value={curl}
                onChange={(e) => setCurl(e.target.value)}
                rows={4}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="curl -X POST https://..."
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-neutral-300">Request Headers</h4>
                <button
                  onClick={handleAddHeader}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-3 h-3" /> Add Header
                </button>
              </div>

              {headers.length === 0 ? (
                <p className="text-xs text-neutral-500">No headers configured. Click "Add Header" to add one.</p>
              ) : (
                <div className="space-y-2">
                  {headers.map((header, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                        className="flex-[2] bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={() => handleRemoveHeader(idx)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="pt-3 border-t border-neutral-800">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-400">Schedule:</span>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as Schedule)}
                className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SCHEDULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
