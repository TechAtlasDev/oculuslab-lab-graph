import { useState } from 'react';
import { DomainProvider } from './context/DomainProvider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { PipelinesPage } from './pages/PipelinesPage';
import { TooltipProvider } from '@/components/ui/tooltip';

type Tab = 'dashboard' | 'explorer' | 'workspace' | 'pipelines';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <SiteHeader activeTab={activeTab} />
          <main className="flex-1 overflow-y-auto">
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'explorer' && <ExplorerPage />}
            {activeTab === 'workspace' && <WorkspacePage />}
            {activeTab === 'pipelines' && <PipelinesPage />}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <DomainProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </DomainProvider>
  );
}
