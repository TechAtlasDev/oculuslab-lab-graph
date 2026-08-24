import React, { useMemo } from 'react';
import { DomainServicesContext } from './DomainServicesContext';
import { GraphDataService } from '../domains/graph-data/GraphDataService';
import { ApiGraphRepository } from '../domains/graph-data/ApiGraphRepository';
import { AnalysisService } from '../domains/analysis/AnalysisService';
import { ApiPipelineRunner } from '../domains/analysis/ApiPipelineRunner';
import { WorkspaceService } from '../domains/workspace/WorkspaceService';
import { LocalStorageWorkspaceRepository } from '../domains/workspace/LocalStorageWorkspaceRepository';

export const DomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(() => {
    // Conexión directa a los repositorios API reales del Backend OptimusKG
    const graphRepo = new ApiGraphRepository('/api/v1/graph');
    const pipelineRunner = new ApiPipelineRunner('/api/v1/analysis');
    const workspaceRepo = new LocalStorageWorkspaceRepository();

    const graphDataService = new GraphDataService(graphRepo);
    const analysisService = new AnalysisService(pipelineRunner);
    const workspaceService = new WorkspaceService(workspaceRepo);

    return {
      graphDataService,
      analysisService,
      workspaceService,
    };
  }, []);

  return (
    <DomainServicesContext.Provider value={value}>
      {children}
    </DomainServicesContext.Provider>
  );
};
