import { useLocation } from "react-router-dom"
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

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const location = useLocation()

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/explorer')) return 'Navegador de Grafo (Canvas Engine)';
    if (pathname.startsWith('/workspace')) return 'Workspace & Colecciones';
    if (pathname.startsWith('/pipelines')) return 'Pipelines de Análisis';
    return 'Dashboard Resumen';
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
                {getPageTitle(location.pathname)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
