import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, FileBox, KeyRound, Database } from "lucide-react"
import { useEffect, useState } from "react"

interface Stats {
  emailsSent: number
  filesStored: number
  activeKeys: number
  dbTables: number
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const cards = [
    { label: "Emails Sent", value: stats?.emailsSent, icon: Mail },
    { label: "Files Stored", value: stats?.filesStored, icon: FileBox },
    { label: "Active API Keys", value: stats?.activeKeys, icon: KeyRound },
    { label: "DB Tables", value: stats?.dbTables, icon: Database },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats === null ? (
                  <span className="text-muted-foreground animate-pulse">—</span>
                ) : (
                  card.value
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
