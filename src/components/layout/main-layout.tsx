import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ReactNode } from "react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface MainLayoutProps {
  breadcrumbItems?: BreadcrumbItem[]
  children: ReactNode
  requireAuth?: boolean
}

export default async function MainLayout({ 
  breadcrumbItems = [], 
  children,
  requireAuth = true 
}: MainLayoutProps) {
  // Handle authentication if required
  let user = null
  if (requireAuth) {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    
    if (!session) {
      redirect("/sign-in")
    }

    // Extract user data from session
    if (session.user) {
      user = {
        name: session.user.name || session.user.email || "User",
        email: session.user.email || "",
        avatar: session.user.image || undefined,
      }
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            
            {/* Breadcrumb - only render if items exist */}
            {breadcrumbItems.length > 0 && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbItems.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <BreadcrumbItem className="hidden md:block">
                        {item.href ? (
                          <BreadcrumbLink href={item.href}>
                            {item.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbItems.length - 1 && (
                        <BreadcrumbSeparator className="hidden md:block" />
                      )}
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}