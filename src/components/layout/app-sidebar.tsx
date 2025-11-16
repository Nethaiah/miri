"use client"

import * as React from "react"
import {
  SquareKanban,
  BookHeart,
  Frame,
  Map,
  PieChart,
  Settings2,
  NotepadText,
  LayoutDashboard,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavProjects } from "@/components/layout/nav-projects"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { client } from "@/lib/api-client"

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
      title: "Notes",
      url: "/notes",
      icon: NotepadText,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Journals",
      url: "/journals",
      icon: BookHeart,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Kanbans",
      url: "/kanbans",
      icon: SquareKanban,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<{
    name: string
    email: string
    avatar?: string
  } | null>(null)

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await (client as any).session.$get()
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser({
              name: data.user.name || data.user.email || "User",
              email: data.user.email || "",
              avatar: data.user.image || data.user.avatar || undefined,
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch user session:", error)
      }
    }

    fetchUser()
  }, [])

  return (
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
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
