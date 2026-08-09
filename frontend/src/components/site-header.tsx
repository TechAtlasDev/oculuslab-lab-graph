import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { SidebarSimple, Graph } from "@phosphor-icons/react"

interface SiteHeaderProps {
  activeTab: string;
}

export function SiteHeader({ activeTab }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar()

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Resumen';
      case 'explorer': return 'Navegador de Grafo (Canvas Engine)';
      case 'workspace': return 'Workspace & Colecciones';
      case 'pipelines': return 'Pipelines de Análisis';
      default: return 'OptimusKG';
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center border-b border-border bg-card px-4">
      <div className="flex w-full items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-foreground hover:bg-muted"
        >
          <SidebarSimple size={22} />
        </Button>
        <Separator
          orientation="vertical"
          className="h-6"
        />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <span className="flex items-center gap-1.5 text-base text-muted-foreground">
                <Graph size={18} />
                OptimusKG
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-base font-semibold text-foreground">
                {getPageTitle(activeTab)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
