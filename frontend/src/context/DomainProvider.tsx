import React, { useMemo } from 'react';
import { DomainServicesContext } from './DomainServicesContext';
import { GraphDataService } from '../domains/graph-data/GraphDataService';
import { MockGraphRepository } from '../domains/graph-data/MockGraphRepository';
import { AnalysisService } from '../domains/analysis/AnalysisService';
import { MockPipelineRunner } from '../domains/analysis/MockPipelineRunner';
import { WorkspaceService } from '../domains/workspace/WorkspaceService';
import { LocalStorageWorkspaceRepository } from '../domains/workspace/LocalStorageWorkspaceRepository';

export const DomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(() => {
    const graphRepo = new MockGraphRepository();
    const pipelineRunner = new MockPipelineRunner();
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
