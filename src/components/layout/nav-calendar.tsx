"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavCalendar() {
  const pathname = usePathname()
  const isActive = pathname === "/calendar"

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive} tooltip="Calendar">
            <Link href="/calendar">
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
