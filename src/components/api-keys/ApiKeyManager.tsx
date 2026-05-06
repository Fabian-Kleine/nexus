import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ApiKeyServices } from "@/lib/db/schema"

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  services: ApiKeyServices
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

const SERVICE_LABELS: { key: keyof ApiKeyServices; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "filesRead", label: "Files: Read" },
  { key: "filesWrite", label: "Files: Write" },
  { key: "dbRead", label: "DB: Read" },
  { key: "corsProxy", label: "CORS Proxy" },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function CreateKeyDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [services, setServices] = useState<ApiKeyServices>({
    email: true,
    filesRead: true,
    filesWrite: true,
    dbRead: false,
    corsProxy: false,
  })
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), services }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreatedKey(data.key)
      onCreated()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create key")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => {
      setName("")
      setCreatedKey(null)
      setServices({ email: true, filesRead: true, filesWrite: true, dbRead: false, corsProxy: false })
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
        </DialogHeader>
        {createdKey ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy your key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm break-all">
              <span className="flex-1">{createdKey}</span>
              <CopyButton text={createdKey} />
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="My Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Enabled Services</Label>
              {SERVICE_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={services[key]}
                    onCheckedChange={(v) => setServices((s) => ({ ...s, [key]: v }))}
                  />
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={loading || !name.trim()}
            >
              {loading ? "Creating…" : "Create Key"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  const fetchKeys = () => {
    setLoading(true)
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.data ?? []))
      .catch(() => toast.error("Failed to load API keys"))
      .finally(() => setLoading(false))
  }

  useEffect(fetchKeys, [])

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive } : k)))
  }

  const toggleService = async (
    id: string,
    services: ApiKeyServices,
    key: keyof ApiKeyServices,
    value: boolean,
  ) => {
    const updated = { ...services, [key]: value }
    await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services: updated }),
    })
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, services: updated } : k)),
    )
  }

  const deleteKey = async (id: string) => {
    await fetch(`/api/keys/${id}`, { method: "DELETE" })
    setKeys((prev) => prev.filter((k) => k.id !== id))
    toast.success("Key deleted")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage access keys and their service permissions
          </p>
        </div>
        <CreateKeyDialog onCreated={fetchKeys} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No API keys yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    <Badge variant={k.isActive ? "default" : "secondary"}>
                      {k.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {k.keyPrefix}••••••••
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && (
                      <> · Last used {new Date(k.lastUsedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${k.id}`} className="text-sm">
                      Enabled
                    </Label>
                    <Switch
                      id={`active-${k.id}`}
                      checked={k.isActive}
                      onCheckedChange={(v) => toggleActive(k.id, v)}
                    />
                  </div>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SERVICE_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <Switch
                      checked={k.services[key]}
                      onCheckedChange={(v) => toggleService(k.id, k.services, key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
