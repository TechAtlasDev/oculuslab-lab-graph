import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { DotsThreeVertical, FolderSimple, ShareNetwork, Trash } from "@phosphor-icons/react"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: React.ElementType
  }[]
}) {
  const { isMobile } = useSidebar()
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-base font-semibold text-muted-foreground mb-2">
        Accesos Rápidos
      </SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const Icon = item.icon
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton className="text-base font-medium">
                <Icon size={20} />
                <span>{item.name}</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuAction
                      showOnHover
                      className="aria-expanded:bg-muted"
                    />
                  }
                >
                  <DotsThreeVertical size={18} />
                  <span className="sr-only">Más opciones</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 text-base"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem className="text-base">
                    <FolderSimple size={18} className="text-muted-foreground mr-2" />
                    <span>Ver Detalles</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-base">
                    <ShareNetwork size={18} className="text-muted-foreground mr-2" />
                    <span>Compartir</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-base text-destructive">
                    <Trash size={18} className="mr-2" />
                    <span>Eliminar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
