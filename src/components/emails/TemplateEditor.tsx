import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import { toast } from "sonner"
import { Save, Eye, Code2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  extractTemplateVariables,
  renderTemplateVariables,
} from "@/lib/template-variables"

interface Props {
  templateId?: string
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; }
    h1 { color: #111; }
  </style>
</head>
<body>
  <h1>Hello, {{name}}!</h1>
  <p>{{message}}</p>
</body>
</html>`

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function TemplateEditor({ templateId }: Props) {
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"editor" | "preview">("editor")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  // Queues content to be applied once Monaco mounts (handles load-before-mount race)
  const pendingHtmlRef = useRef<string | null>(null)

  const debouncedHtml = useDebounce(html, 300)
  const debouncedSubject = useDebounce(subject, 300)

  // Stable derived list of variable names from both editor content and subject
  const vars = useMemo(
    () => extractTemplateVariables(`${debouncedHtml} ${debouncedSubject}`),
    [debouncedHtml, debouncedSubject],
  )

  // Sync previewValues whenever the detected variable set changes.
  // Keeps existing user-entered values; adds empty entries for new vars;
  // removes entries for vars that no longer exist in the template.
  useEffect(() => {
    setPreviewValues((prev) => {
      // bail out early when nothing has changed
      if (
        vars.length === Object.keys(prev).length &&
        vars.every((v) => v in prev)
      ) {
        return prev
      }
      const next: Record<string, string> = {}
      vars.forEach((v) => {
        next[v] = prev[v] ?? ""
      })
      return next
    })
  }, [vars.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing template
  useEffect(() => {
    if (!templateId) return
    fetch(`/api/templates/${templateId}`)
      .then((r) => r.json())
      .then((t) => {
        setName(t.name ?? "")
        setSubject(t.subject ?? "")
        const content: string = t.htmlContent ?? DEFAULT_HTML
        setHtml(content)
        // Update Monaco content directly (uncontrolled mode)
        if (editorRef.current) {
          editorRef.current.setValue(content)
        } else {
          pendingHtmlRef.current = content
        }
      })
      .catch(() => toast.error("Failed to load template"))
  }, [templateId])

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor
    // Apply content that arrived before Monaco was ready
    if (pendingHtmlRef.current !== null) {
      editor.setValue(pendingHtmlRef.current)
      pendingHtmlRef.current = null
    }
  }

  // Render preview HTML: replace {{var}} with current preview values
  const renderedHtml = useCallback(
    () => renderTemplateVariables(debouncedHtml, previewValues),
    [debouncedHtml, previewValues],
  )

  // Write to the preview iframe whenever preview is active or content/values change
  useEffect(() => {
    if (tab !== "preview" || !iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(renderedHtml())
    doc.close()
  }, [tab, renderedHtml])

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required")
      return
    }
    setSaving(true)
    try {
      const url = templateId ? `/api/templates/${templateId}` : "/api/templates"
      const method = templateId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, htmlContent: html }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Template saved")
      if (!templateId) {
        window.location.href = `/emails/templates/${data.id}`
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Top toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <a href="/emails">
            <ArrowLeft />
            Emails
          </a>
        </Button>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1">
            <Input
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Subject (supports {{vars}})"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8"
            />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: Editor / Preview */}
        <div className="flex flex-col flex-1 min-w-0 rounded-lg border overflow-hidden">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <button
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${tab === "editor" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setTab("editor")}
            >
              <Code2 className="h-3.5 w-3.5" /> Editor
            </button>
            <button
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${tab === "preview" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setTab("preview")}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>

          {tab === "editor" ? (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <Editor
                height="100%"
                defaultLanguage="html"
                defaultValue={html}
                onChange={(v) => setHtml(v ?? "")}
                onMount={handleEditorMount}
                loading={
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading editor…
                  </div>
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
                theme="vs-dark"
              />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              className="flex-1 w-full"
              sandbox="allow-same-origin"
              title="Template Preview"
            />
          )}
        </div>

        {/* Right: Variables panel */}
        <div className="w-56 shrink-0 flex flex-col rounded-lg border p-4 gap-4">
          <div>
            <h3 className="text-sm font-medium">Variables</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-detected from{" "}
              <code className="font-mono bg-muted px-0.5 rounded">{"{{var}}"}</code>{" "}
              in the template
            </p>
          </div>
          <Separator />
          {vars.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No variables yet. Add{" "}
              <code className="font-mono bg-muted px-0.5 rounded">{"{{name}}"}</code>{" "}
              anywhere in the HTML or subject.
            </p>
          ) : (
            <div className="space-y-3 overflow-y-auto">
              {vars.map((v) => (
                <div key={v} className="space-y-1">
                  <Label className="text-xs">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  </Label>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Preview value"
                    value={previewValues[v] ?? ""}
                    onChange={(e) =>
                      setPreviewValues((p) => ({ ...p, [v]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
