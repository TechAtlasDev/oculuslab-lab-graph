import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DomainProvider } from './context/DomainProvider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { PipelinesPage } from './pages/PipelinesPage';
import { TooltipProvider } from '@/components/ui/tooltip';

function AppContent() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
          <SiteHeader />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/explorer" element={<ExplorerPage />} />
              <Route path="/workspace" element={<WorkspacePage initialTab="all" />} />
              <Route path="/workspace/collections" element={<WorkspacePage initialTab="collections" />} />
              <Route path="/workspace/collections/:collectionId" element={<WorkspacePage initialTab="collections" />} />
              <Route path="/workspace/annotations" element={<WorkspacePage initialTab="annotations" />} />
              <Route path="/pipelines" element={<PipelinesPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DomainProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </DomainProvider>
    </BrowserRouter>
  );
}
