"use client"

import * as React from "react"
import { Graph, MagnifyingGlass, Folder, Cpu, BookmarkSimple, Database } from "@phosphor-icons/react"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { Tab } from "@/App"

const data = {
  user: {
    name: "Usuario Optimus",
    email: "desarrollo@optimuskg.bio",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      key: "dashboard" as const,
      icon: Graph,
    },
    {
      title: "Navegador de Grafo",
      key: "explorer" as const,
      icon: MagnifyingGlass,
    },
    {
      title: "Workspace",
      key: "workspace" as const,
      icon: Folder,
      items: [
        {
          title: "Colecciones",
          subKey: "workspace-collections" as const,
        },
        {
          title: "Anotaciones",
          subKey: "workspace-annotations" as const,
        },
      ],
    },
    {
      title: "Pipelines & Jobs",
      key: "pipelines" as const,
      icon: Cpu,
      items: [
        {
          title: "Ejecuciones",
          subKey: "pipelines" as const,
        },
      ],
    },
  ],
  projects: [
    {
      name: "Favoritos (Local)",
      url: "#",
      icon: BookmarkSimple,
    },
    {
      name: "OptimusKGDB (190k Nodos)",
      url: "#",
      icon: Database,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export function AppSidebar({ activeTab, setActiveTab, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} activeTab={activeTab} setActiveTab={setActiveTab} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
