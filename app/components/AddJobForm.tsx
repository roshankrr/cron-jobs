'use client';

import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, X, Terminal, Globe, Clock } from 'lucide-react';
import { addJob } from '../actions';

interface JobHeader {
  key: string;
  value: string;
}

type JobMode = 'url' | 'curl';

export type Schedule = 'hourly' | 'every6hours' | 'daily' | 'weekly';

const SCHEDULE_OPTIONS: { value: Schedule; label: string }[] = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'every6hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily (midnight UTC)' },
  { value: 'weekly', label: 'Weekly (Sunday midnight)' },
];

export function AddJobForm() {
  const [mode, setMode] = useState<JobMode>('url');
  const [schedule, setSchedule] = useState<Schedule>('daily');
  const [showHeaders, setShowHeaders] = useState(false);
  const [headers, setHeaders] = useState<JobHeader[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleSubmit = async (formData: FormData) => {
    formData.set('mode', mode);
    formData.set('schedule', schedule);
    if (mode === 'url') {
      const validHeaders = headers.filter(h => h.key.trim() !== '');
      formData.set('headers', JSON.stringify(validHeaders));
    }
    await addJob(formData);
    formRef.current?.reset();
    setHeaders([]);
    setShowHeaders(false);
    setSchedule('daily');
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Add Target</h2>
        <div className="flex bg-neutral-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'url' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <Globe className="w-3 h-3" /> URL
          </button>
          <button
            type="button"
            onClick={() => setMode('curl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'curl' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <Terminal className="w-3 h-3" /> cURL
          </button>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        {mode === 'url' ? (
          <>
            <div className="flex gap-3">
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
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-500" />
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as Schedule)}
                  className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors ml-auto"
              >
                Add
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowHeaders(!showHeaders)}
              className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              {showHeaders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showHeaders ? 'Hide Headers' : 'Add Headers (optional)'}
            </button>

            {showHeaders && (
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-400">Request Headers</p>
                  <button
                    type="button"
                    onClick={handleAddHeader}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Plus className="w-3 h-3" /> Add Header
                  </button>
                </div>

                {headers.length === 0 ? (
                  <p className="text-xs text-neutral-500">No headers. Click "Add Header" to include custom headers.</p>
                ) : (
                  <div className="space-y-2">
                    {headers.map((header, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Header name (e.g. Authorization)"
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
                          type="button"
                          onClick={() => handleRemoveHeader(idx)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <input
              name="name"
              placeholder="App Name (e.g. Deploy Hook)"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <textarea
              name="curl"
              placeholder={`curl -X POST https://api.example.com/webhook \\
  -H "Authorization: Bearer token" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'`}
              rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              required
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-500" />
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as Schedule)}
                  className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Paste your curl command. Supports -X, -H, -d, --data flags.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
