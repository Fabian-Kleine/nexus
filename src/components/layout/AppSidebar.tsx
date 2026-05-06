import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Mail,
  FileBox,
  Database,
  KeyRound,
  Zap,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Emails", href: "/emails", icon: Mail },
  { label: "Files", href: "/files", icon: FileBox },
  { label: "Database", href: "/database", icon: Database },
  { label: "API Keys", href: "/api-keys", icon: KeyRound },
]

interface Props {
  currentPath: string
}

export function AppSidebar({ currentPath }: Props) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <a href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Zap className="h-5 w-5 text-primary" />
          <span>Nexus</span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  currentPath === item.href ||
                  (item.href !== "/dashboard" && currentPath.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
