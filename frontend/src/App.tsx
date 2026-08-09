import { useState } from 'react';
import { DomainProvider } from './context/DomainProvider';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { PipelinesPage } from './pages/PipelinesPage';
import { Graph, MagnifyingGlass, Folder, Cpu } from '@phosphor-icons/react';

type Tab = 'dashboard' | 'explorer' | 'workspace' | 'pipelines';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header & Navigation bar */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Graph size={32} weight="duotone" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground block">OptimusKG</span>
              <span className="text-base text-muted-foreground block">Biomedical Knowledge Explorer</span>
            </div>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 rounded-lg font-medium text-base flex items-center gap-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Graph size={20} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-4 py-2.5 rounded-lg font-medium text-base flex items-center gap-2 transition-colors ${
                activeTab === 'explorer'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <MagnifyingGlass size={20} />
              Navegador
            </button>

            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-2.5 rounded-lg font-medium text-base flex items-center gap-2 transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Folder size={20} />
              Workspace
            </button>

            <button
              onClick={() => setActiveTab('pipelines')}
              className={`px-4 py-2.5 rounded-lg font-medium text-base flex items-center gap-2 transition-colors ${
                activeTab === 'pipelines'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Cpu size={20} />
              Pipelines
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'explorer' && <ExplorerPage />}
        {activeTab === 'workspace' && <WorkspacePage />}
        {activeTab === 'pipelines' && <PipelinesPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between text-base text-muted-foreground">
          <p>© 2026 OptimusKG - Plataforma Modular de Exploración de Grafos</p>
          <span className="px-3 py-1 bg-muted rounded-full text-base font-medium">Fase Local (Mock & LocalStorage)</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <DomainProvider>
      <AppContent />
    </DomainProvider>
  );
}
