'use client';

import type { Application } from '@/types/application';
import { StatusBadge } from './StatusBadge';

export function ApplicationTable({
  applications,
}: {
  applications: Application[];
}) {
  return (
    <div className="overflow-x-auto bg-zinc-900/60 border border-zinc-800 rounded-xl">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4">ID</th>
            <th className="py-3 px-4">Resume</th>
            <th className="py-3 px-4">Job</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Created</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-zinc-900 transition-colors">
              <td className="py-3 px-4 font-mono text-xs text-zinc-300">{app.id.slice(0, 8)}...</td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-500">{app.resume_id.slice(0, 8)}...</td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-500">{app.job_id.slice(0, 8)}...</td>
              <td className="py-3 px-4">
                <StatusBadge status={app.status} />
              </td>
              <td className="py-3 px-4 text-xs text-zinc-400">
                {new Date(app.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                <a
                  href={`/applications/${app.id}`}
                  className="text-xs font-medium text-zinc-200 hover:underline"
                >
                  View details →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
