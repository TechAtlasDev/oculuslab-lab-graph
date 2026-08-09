import { createContext } from 'react';
import type { GraphDataService } from '../domains/graph-data/GraphDataService';
import type { AnalysisService } from '../domains/analysis/AnalysisService';
import type { WorkspaceService } from '../domains/workspace/WorkspaceService';

export interface DomainServicesContextValue {
  graphDataService: GraphDataService;
  analysisService: AnalysisService;
  workspaceService: WorkspaceService;
}

export const DomainServicesContext = createContext<DomainServicesContextValue | null>(null);
