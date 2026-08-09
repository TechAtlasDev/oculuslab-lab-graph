import React, { useEffect, useState } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { PipelineJob, JobType } from '../types';
import { Cpu, Play, CheckCircle, Clock, Spinner } from '@phosphor-icons/react';

export const PipelinesPage: React.FC = () => {
  const { analysisService } = useDomainServices();
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [selectedType, setSelectedType] = useState<JobType>('PATH_FINDING');

  useEffect(() => {
    let active = true;
    void (async () => {
      const list = await analysisService.getAllJobs();
      if (active) {
        setJobs(list);
      }
    })();
    return () => {
      active = false;
    };
  }, [analysisService]);

  const handleLaunchJob = async () => {
    const jobId = selectedType === 'PATH_FINDING'
      ? await analysisService.runPathFinding('node-1', 'node-3')
      : selectedType === 'PROJECTION'
      ? await analysisService.runProjection('Node2Vec', 128)
      : selectedType === 'EVIDENCE_SCORING'
      ? await analysisService.runEvidenceScoring('node-1', 'node-3')
      : await analysisService.runSubgraphExtraction(['node-1', 'node-2']);

    const updatedList = await analysisService.getAllJobs();
    setJobs(updatedList);

    void analysisService.pollJobUntilDone(jobId, async () => {
      const currentList = await analysisService.getAllJobs();
      setJobs(currentList);
    }).then(async () => {
      const finalList = await analysisService.getAllJobs();
      setJobs(finalList);
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Cpu size={36} className="text-primary" />
          Pipelines & Análisis Asíncrono
        </h1>
        <p className="text-muted-foreground text-lg">
          Ejecución de trabajos derivados del grafo (Proyecciones, Path Finding, Evidence Scoring).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lanzador de Jobs */}
        <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm h-fit">
          <h2 className="text-xl font-semibold text-foreground">Lanzar Nuevo Pipeline</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-medium text-foreground mb-2">Tipo de Computación</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as JobType)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-base text-foreground"
              >
                <option value="PATH_FINDING">Path Finding (Búsqueda de Caminos)</option>
                <option value="PROJECTION">Proyección de Grafo (Embeddings)</option>
                <option value="EVIDENCE_SCORING">Scoring de Evidencia (PaperQA3)</option>
                <option value="SUBGRAPH_EXTRACTION">Extracción de Subgrafo</option>
              </select>
            </div>

            <button
              onClick={handleLaunchJob}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg text-base hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <Play size={20} weight="fill" />
              Ejecutar Job
            </button>
          </div>
        </div>

        {/* Historial de Jobs */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Historial de Pipelines ({jobs.length})</h2>

          {jobs.length === 0 ? (
            <p className="text-base text-muted-foreground">No hay ejecuciones registradas.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 bg-muted/20 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">{job.type}</span>
                    <span className="flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-base font-medium">
                      {job.status === 'done' && <CheckCircle size={18} className="text-emerald-500" />}
                      {job.status === 'running' && <Spinner size={18} className="animate-spin text-amber-500" />}
                      {job.status === 'pending' && <Clock size={18} className="text-muted-foreground" />}
                      {job.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-base text-muted-foreground">ID: {job.id}</p>

                  {job.result !== undefined && (
                    <div className="p-3 bg-background border border-border rounded text-base space-y-1">
                      <strong className="text-foreground">Resultado:</strong>
                      <pre className="text-base font-mono overflow-x-auto text-foreground">
                        {JSON.stringify(job.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
