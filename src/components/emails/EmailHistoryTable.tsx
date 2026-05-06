import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SentEmail {
  id: string
  toEmail: string
  fromEmail: string
  subject: string
  bodyHtml: string
  status: string
  errorMessage: string | null
  sentAt: string
  templateId: string | null
}

export function EmailHistoryTable() {
  const [emails, setEmails] = useState<SentEmail[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<SentEmail | null>(null)

  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    fetch(`/api/emails?page=${page}&limit=${LIMIT}`)
      .then((r) => r.json())
      .then((d) => {
        setEmails(d.data ?? [])
        setHasMore((d.data ?? []).length === LIMIT)
      })
      .catch(() => toast.error("Failed to load emails"))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No emails sent yet
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => (
                <TableRow
                  key={email.id}
                  className="cursor-pointer"
                  onClick={() => setPreview(email)}
                >
                  <TableCell className="font-mono text-xs">{email.toEmail}</TableCell>
                  <TableCell className="max-w-xs truncate">{email.subject}</TableCell>
                  <TableCell>
                    <Badge variant={email.status === "sent" ? "default" : "destructive"}>
                      {email.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {email.templateId ? (
                      <Badge variant="outline">template</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(email.sentAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.subject}</DialogTitle>
          </DialogHeader>
          {preview?.status === "failed" && preview.errorMessage && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {preview.errorMessage}
            </div>
          )}
          {preview?.bodyHtml && (
            <iframe
              srcDoc={preview.bodyHtml}
              className="w-full rounded border"
              style={{ height: "400px" }}
              sandbox="allow-same-origin"
              title="Email Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
