import type { IPipelineRunner } from './IPipelineRunner';
import type { JobType, PipelineJob, JobStatus } from '../../types';

export class MockPipelineRunner implements IPipelineRunner {
  private jobs: Map<string, PipelineJob> = new Map();

  async submitJob(type: JobType, params: Record<string, unknown>): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: PipelineJob = {
      id: jobId,
      type,
      params,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    this.simulateExecution(jobId);
    return jobId;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);
    return job ? job.status : 'error';
  }

  async getJobResult<T = unknown>(jobId: string): Promise<T | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'done') return null;
    return (job.result as T) || null;
  }

  async listJobs(): Promise<PipelineJob[]> {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private simulateExecution(jobId: string): void {
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'running';
        job.progress = 50;
      }
    }, 1000);

    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'done';
        job.progress = 100;
        job.result = this.generateMockResult(job.type, job.params);
      }
    }, 3000);
  }

  private generateMockResult(type: JobType, params: Record<string, unknown>): unknown {
    switch (type) {
      case 'PATH_FINDING':
        return {
          path: [params.fromId || 'node-1', 'node-2', params.toId || 'node-3'],
          weight: 0.95,
          metapathScore: 0.91,
        };
      case 'PROJECTION':
        return {
          dimension: 128,
          method: 'Node2Vec',
          nodesProcessed: 1500,
          projectionMatrixUrl: '/mock/projection.bin',
        };
      case 'EVIDENCE_SCORING':
        return {
          paperQA3Score: 0.89,
          supportingPublications: ['PMID:2413201', 'PMID:8912301'],
          confidence: 'High',
        };
      case 'SUBGRAPH_EXTRACTION':
      default:
        return {
          extractedNodesCount: 42,
          extractedEdgesCount: 118,
          modularity: 0.74,
        };
    }
  }
}
