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

const data = {
  user: {
    name: "Usuario Optimus",
    email: "desarrollo@optimuskg.bio",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Graph,
    },
    {
      title: "Navegador de Grafo",
      url: "/explorer",
      icon: MagnifyingGlass,
    },
    {
      title: "Workspace",
      url: "/workspace",
      icon: Folder,
      items: [
        {
          title: "Colecciones",
          url: "/workspace/collections",
        },
        {
          title: "Anotaciones",
          url: "/workspace/annotations",
        },
      ],
    },
    {
      title: "Pipelines & Jobs",
      url: "/pipelines",
      icon: Cpu,
      items: [
        {
          title: "Ejecuciones",
          url: "/pipelines",
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
