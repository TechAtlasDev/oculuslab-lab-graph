"use client"


import { Graph } from "@phosphor-icons/react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Graph size={20} weight="duotone" />
          </div>
          <div className="grid flex-1 text-left text-base leading-tight">
            <span className="truncate font-semibold text-foreground">OptimusKG</span>
            <span className="truncate text-base text-muted-foreground">Graph Platform</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
