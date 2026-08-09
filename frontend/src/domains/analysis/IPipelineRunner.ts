import type { JobType, PipelineJob, JobStatus } from '../../types';

export interface IPipelineRunner {
  submitJob(type: JobType, params: Record<string, unknown>): Promise<string>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  getJobResult<T = unknown>(jobId: string): Promise<T | null>;
  listJobs(): Promise<PipelineJob[]>;
}
