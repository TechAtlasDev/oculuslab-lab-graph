"use client"

import { ChevronRight } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-base font-semibold text-muted-foreground mb-2">
        Exploración
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.url || item.items?.some(s => currentPath === s.url)

          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  className="text-base font-medium"
                  render={<Link to={item.url} />}
                >
                  <Icon size={20} />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isActive}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive}
                className="text-base font-medium flex items-center justify-between"
                render={<Link to={item.url} />}
              >
                <div className="flex items-center gap-2">
                  <Icon size={20} />
                  <span>{item.title}</span>
                </div>
                <CollapsibleTrigger render={<button type="button" className="p-1 hover:bg-muted rounded" onClick={(e) => e.stopPropagation()} />}>
                  <ChevronRight size={16} className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarMenuButton>

              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        isActive={currentPath === subItem.url}
                        className="text-base cursor-pointer"
                        render={<Link to={subItem.url} />}
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
