import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider, useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

interface Props {
  currentPath: string
  children: ReactNode
}

export function AppLayout({ currentPath, children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar currentPath={currentPath} />
          <main className="flex flex-1 flex-col min-h-svh">
            <header className="flex h-12 items-center border-b px-4 gap-2">
              <SidebarTrigger />
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </header>
            <div className="flex-1 p-6">{children}</div>
          </main>
          <Toaster richColors position="bottom-right" />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
