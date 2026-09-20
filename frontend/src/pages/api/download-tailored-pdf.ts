/**
 * Next.js API Route: /api/download-tailored-pdf
 *
 * Accepts GET with query params:  ?resume_id=...&job_id=...&filename=...
 * Also accepts POST with JSON body for backwards compat.
 *
 * Proxies the FastAPI PDF export server-side so the browser receives a proper
 * Content-Disposition: attachment response — the browser saves it with the
 * correct .pdf filename without any JS blob-URL tricks.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const config = {
  api: { responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support both GET (query params) and POST (JSON body)
  let resume_id: string | undefined;
  let job_id: string | undefined;
  let customFilename: string | undefined;

  if (req.method === 'GET') {
    resume_id = req.query.resume_id as string | undefined;
    job_id = req.query.job_id as string | undefined;
    customFilename = req.query.filename as string | undefined;
  } else if (req.method === 'POST') {
    const body = req.body as { resume_id?: string; job_id?: string; filename?: string };
    resume_id = body.resume_id;
    job_id = body.job_id;
    customFilename = body.filename;
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!resume_id || !job_id) {
    return res.status(400).json({ error: 'resume_id and job_id are required.' });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/v1/tailored-resume/export-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id, job_id }),
    });

    if (!backendRes.ok) {
      let errorBody = 'Backend PDF generation failed.';
      try {
        const errJson = await backendRes.json();
        errorBody = errJson?.detail || errJson?.message || errorBody;
      } catch { /* non-JSON */ }
      return res.status(backendRes.status).json({ error: errorBody });
    }

    const arrayBuffer = await backendRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prefer custom filename from query/body, then fall back to backend header
    let filename = customFilename;
    if (!filename) {
      const disposition = backendRes.headers.get('content-disposition') || '';
      const m = disposition.match(/filename="?([^";\r\n]+)"?/);
      filename = m?.[1]?.trim() || 'Tailored_Resume_95Plus.pdf';
    }

    // Ensure .pdf extension
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    // Sanitise filename — remove characters browsers can't handle
    filename = filename.replace(/[^\w\s\-_.]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.setHeader('Pragma', 'no-cache');

    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[download-tailored-pdf] Proxy error:', err);
    return res.status(500).json({ error: 'Unexpected server error generating PDF.' });
  }
}
