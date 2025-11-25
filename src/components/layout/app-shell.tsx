"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

interface AppShellProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    avatar?: string
  } | null
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname()

  const isAuthRoute = pathname === "/sign-in" || pathname === "/sign-up"

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
