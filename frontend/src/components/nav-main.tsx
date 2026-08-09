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
import type { Tab } from "@/App"

export function NavMain({
  items,
  activeTab,
  setActiveTab,
}: {
  items: {
    title: string
    key: Tab
    icon: React.ElementType
    items?: {
      title: string
      subKey?: Tab
      url?: string
    }[]
  }[]
  activeTab?: Tab
  setActiveTab?: (tab: Tab) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-base font-semibold text-muted-foreground mb-2">
        Exploración
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key || item.items?.some(s => s.subKey === activeTab)

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
                      <SidebarMenuSubButton
                        onClick={() => {
                          if (subItem.subKey) {
                            setActiveTab?.(subItem.subKey);
                          }
                        }}
                        isActive={activeTab === subItem.subKey}
                        className="text-base cursor-pointer"
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
