import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Upload, Trash2, Copy, Check, Lock, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface FileRow {
  id: string
  originalName: string
  storedName: string
  mimeType: string
  sizeBytes: number
  isPublic: boolean
  createdAt: string
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

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
      title="Copy URL"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function UploadDialog({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("isPublic", String(isPublic))
    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("File uploaded")
      setOpen(false)
      setFile(null)
      onUploaded()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) setFile(f)
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-sm">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to select
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="public-toggle" className="text-sm">
              Public access
            </Label>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? "Accessible at /uploads/public/{filename} without auth"
              : "Requires API key with Files Read permission"}
          </p>
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function FileManager() {
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = () => {
    setLoading(true)
    fetch("/api/files/list")
      .then((r) => r.json())
      .then((d) => setFiles(d.data ?? []))
      .catch(() => toast.error("Failed to load files"))
      .finally(() => setLoading(false))
  }

  useEffect(fetchFiles, [])

  const deleteFile = async (id: string) => {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" })
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== id))
      toast.success("File deleted")
    } else {
      toast.error("Delete failed")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage uploaded files
          </p>
        </div>
        <UploadDialog onUploaded={fetchFiles} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-75">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No files uploaded yet
                </TableCell>
              </TableRow>
            ) : (
              files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.id}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">
                    {f.originalName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {f.mimeType}
                  </TableCell>
                  <TableCell className="text-xs">{formatBytes(f.sizeBytes)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={f.isPublic ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {f.isPublic ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {f.isPublic ? "Public" : "Private"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {f.isPublic && (
                        <CopyButton
                          text={`${window.location.origin}/uploads/public/${f.storedName}`}
                        />
                      )}
                      <button
                        onClick={() => deleteFile(f.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
