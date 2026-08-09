import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Graph, MagnifyingGlass, Folder, Cpu, BookmarkSimple, Gear, Database } from "@phosphor-icons/react"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'explorer' | 'workspace' | 'pipelines') => void;
}

export function AppSidebar({ activeTab, setActiveTab, ...props }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-border" {...props}>
      <SidebarHeader className="border-b border-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent">
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Graph size={24} weight="duotone" />
              </div>
              <div className="grid flex-1 text-left text-base leading-tight ml-2">
                <span className="truncate font-bold text-foreground">OptimusKG</span>
                <span className="truncate text-base text-muted-foreground">Graph Platform</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-6">
        {/* Navegación Principal */}
        <div className="space-y-1">
          <p className="px-3 text-base font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Exploración
          </p>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-base transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Graph size={22} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-base transition-colors ${
              activeTab === 'explorer'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <MagnifyingGlass size={22} />
            <span>Navegador de Grafo</span>
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-base transition-colors ${
              activeTab === 'workspace'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Folder size={22} />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-base transition-colors ${
              activeTab === 'pipelines'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Cpu size={22} />
            <span>Pipelines & Jobs</span>
          </button>
        </div>

        {/* Acceso Rápido a Colecciones */}
        <div className="space-y-1 pt-2 border-t border-border">
          <p className="px-3 text-base font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Accesos Rápidos
          </p>

          <div className="px-3 py-2 rounded-lg bg-muted/40 text-foreground flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <BookmarkSimple size={18} />
              Favoritos
            </span>
            <span className="px-2 py-0.5 bg-background border border-border rounded text-base font-semibold">Local</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-muted/40 text-foreground flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Database size={18} />
              OptimusKGDB
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-base font-semibold">190k Nodos</span>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="p-2 bg-secondary rounded-lg text-secondary-foreground">
            <Gear size={20} />
          </div>
          <div className="grid text-left text-base">
            <span className="font-semibold text-foreground">Modo Desarrollo</span>
            <span className="text-base text-muted-foreground">Mock & LocalStorage</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
