import type { IPipelineRunner } from './IPipelineRunner';
import type { JobType, PipelineJob, JobStatus } from '../../types';

export class ApiPipelineRunner implements IPipelineRunner {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1/analysis') {
    this.baseUrl = baseUrl;
  }

  async submitJob(type: JobType, params: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, params })
    });
    if (!res.ok) throw new Error(`Failed to submit job: ${res.statusText}`);
    const data = await res.json();
    return data.jobId;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}/status`);
    if (!res.ok) throw new Error(`Failed to get status: ${res.statusText}`);
    const data = await res.json();
    return data.status;
  }

  async getJobResult<T = unknown>(jobId: string): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}/result`);
    if (!res.ok) throw new Error(`Failed to get result: ${res.statusText}`);
    return res.json();
  }

  async listJobs(): Promise<PipelineJob[]> {
    const res = await fetch(`${this.baseUrl}/jobs`);
    if (!res.ok) throw new Error(`Failed to list jobs: ${res.statusText}`);
    return res.json();
  }
}
