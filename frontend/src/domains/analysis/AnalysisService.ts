import type { IPipelineRunner } from './IPipelineRunner';
import type { PipelineJob } from '../../types';

export class AnalysisService {
  private runner: IPipelineRunner;

  constructor(runner: IPipelineRunner) {
    this.runner = runner;
  }

  async runPathFinding(fromId: string, toId: string, maxLength: number = 4): Promise<string> {
    return this.runner.submitJob('PATH_FINDING', { fromId, toId, maxLength });
  }

  async runProjection(method: string = 'Node2Vec', dimensions: number = 128): Promise<string> {
    return this.runner.submitJob('PROJECTION', { method, dimensions });
  }

  async runEvidenceScoring(nodeId: string, diseaseId: string): Promise<string> {
    return this.runner.submitJob('EVIDENCE_SCORING', { nodeId, diseaseId });
  }

  async runSubgraphExtraction(seedNodeIds: string[], depth: number = 2): Promise<string> {
    return this.runner.submitJob('SUBGRAPH_EXTRACTION', { seedNodeIds, depth });
  }

  async pollJobUntilDone<T = unknown>(
    jobId: string, 
    onProgress?: (status: string) => void, 
    intervalMs: number = 800
  ): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const status = await this.runner.getJobStatus(jobId);
          if (onProgress) onProgress(status);

          if (status === 'done') {
            clearInterval(timer);
            const result = await this.runner.getJobResult<T>(jobId);
            resolve(result);
          } else if (status === 'error') {
            clearInterval(timer);
            reject(new Error(`Job ${jobId} failed`));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, intervalMs);
    });
  }

  async getAllJobs(): Promise<PipelineJob[]> {
    return this.runner.listJobs();
  }
}
