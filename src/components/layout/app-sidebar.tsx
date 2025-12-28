"use client"

import * as React from "react"
import {
  FolderOpen,
  LayoutDashboard,
  Settings2,
  Calendar,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavBoards } from "@/components/layout/nav-boards"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import localFont from "next/font/local";

const oughter = localFont({
  src: "../../fonts/Oughter.woff2",
});

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: Calendar,
    },
    {
      title: "Folders",
      url: "/folders",
      icon: FolderOpen,
      isFolderable: true,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar?: string
  } | null
}

// Create a context to persist nav state across navigations
const NavStateContext = React.createContext<{
  openItems: Set<string>
  toggleItem: (title: string) => void
} | null>(null)

export function useNavState() {
  const context = React.useContext(NavStateContext)
  if (!context) {
    throw new Error('useNavState must be used within NavStateProvider')
  }
  return context
}

function NavStateProvider({ children }: { children: React.ReactNode }) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    // Initialize with Dashboard open by default
    return new Set(['Dashboard'])
  })

  const toggleItem = React.useCallback((title: string) => {
    setOpenItems(prev => {
      // If the item is already open, close it
      if (prev.has(title)) {
        return new Set()
      }
      // Otherwise, close all items and open only this one
      return new Set([title])
    })
  }, [])

  return (
    <NavStateContext.Provider value={{ openItems, toggleItem }}>
      {children}
    </NavStateContext.Provider>
  )
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <NavStateProvider>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div 
                data-slot="sidebar-menu-button"
                data-sidebar="menu-button"
                data-size="lg"
                className={`peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden h-12 group-data-[collapsible=icon]:p-0! [&>span:last-child]:truncate`}
              >
                <div className={`grid flex-1 text-left text-xl leading-tight ${oughter.className}`}>
                  MiriNote
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
          <NavBoards />
        </SidebarContent>
        <SidebarFooter>
          {user && <NavUser user={user} />}
        </SidebarFooter>
      </Sidebar>
    </NavStateProvider>
  )
}