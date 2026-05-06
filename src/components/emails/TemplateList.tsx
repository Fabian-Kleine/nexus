import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Template {
  id: string
  name: string
  subject: string
  variables: string[]
  createdAt: string
  updatedAt: string
}

export function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.data ?? []))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false))
  }

  useEffect(fetchTemplates, [])

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/templates/${id}`, { method: "DELETE" })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    toast.success("Template deleted")
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" asChild>
          <a href="/emails/templates/new">
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </a>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No templates yet.{" "}
          <a href="/emails/templates/new" className="underline underline-offset-4">
            Create one
          </a>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyId(t.id)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Copy template ID"
                  >
                    {copiedId === t.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <a
                    href={`/emails/templates/${t.id}`}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {t.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.variables.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Updated {new Date(t.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
