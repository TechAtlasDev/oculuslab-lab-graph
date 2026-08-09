"use client"

import { ChevronRight } from "lucide-react"
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

export function NavMain({
  items,
  activeTab,
  setActiveTab,
}: {
  items: {
    title: string
    key: 'dashboard' | 'explorer' | 'workspace' | 'pipelines'
    icon: React.ElementType
    items?: {
      title: string
      url?: string
    }[]
  }[]
  activeTab?: string
  setActiveTab?: (tab: 'dashboard' | 'explorer' | 'workspace' | 'pipelines') => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Exploración
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key

          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  onClick={() => setActiveTab?.(item.key)}
                  className="text-base font-medium"
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
                onClick={() => setActiveTab?.(item.key)}
                className="text-base font-medium flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon size={20} />
                  <span>{item.title}</span>
                </div>
                <CollapsibleTrigger render={<button type="button" className="p-1 hover:bg-muted rounded" />}>
                  <ChevronRight size={16} className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarMenuButton>

              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton className="text-base">
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
