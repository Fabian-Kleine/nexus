import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Database, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const LS_KEY = "nexus_db_conn"

interface TableInfo {
  schema: string
  name: string
  row_estimate: number
}

interface DataResult {
  data: Record<string, unknown>[]
  total: number
  page: number
  limit: number
}

interface SelectedTable {
  schema: string
  name: string
}

export function TableExplorer() {
  const [connInput, setConnInput] = useState("")
  const [connectionString, setConnectionString] = useState<string | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null)
  const [result, setResult] = useState<DataResult | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tablesLoading, setTablesLoading] = useState(false)

  const LIMIT = 25

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      setConnInput(stored)
      setConnectionString(stored)
    }
  }, [])

  useEffect(() => {
    if (connectionString) fetchTables(connectionString)
  }, [connectionString])

  const fetchTables = (dbUrl: string) => {
    setTablesLoading(true)
    fetch("/api/database/tables", { headers: { "x-db-url": dbUrl } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setTables(d.tables ?? [])
      })
      .catch((e: Error) => {
        toast.error(e.message ?? "Failed to load tables")
        disconnect()
      })
      .finally(() => setTablesLoading(false))
  }

  const fetchTableData = (schema: string, table: string, p: number) => {
    if (!connectionString) return
    setLoading(true)
    fetch(`/api/database/${table}?schema=${encodeURIComponent(schema)}&page=${p}&limit=${LIMIT}`, {
      headers: { "x-db-url": connectionString },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setResult(d)
      })
      .catch((e: Error) => toast.error(e.message ?? "Failed to load data"))
      .finally(() => setLoading(false))
  }

  const connect = () => {
    const trimmed = connInput.trim()
    if (!trimmed) return
    localStorage.setItem(LS_KEY, trimmed)
    setConnectionString(trimmed)
    setSelectedTable(null)
    setResult(null)
  }

  const disconnect = () => {
    localStorage.removeItem(LS_KEY)
    setConnectionString(null)
    setConnInput("")
    setTables([])
    setSelectedTable(null)
    setResult(null)
  }

  const selectTable = (schema: string, name: string) => {
    setSelectedTable({ schema, name })
    setPage(1)
    fetchTableData(schema, name, 1)
  }

  const columns = result && result.data.length > 0 ? Object.keys(result.data[0]) : []
  const totalPages = result ? Math.ceil(result.total / LIMIT) : 0

  const schemaGroups = tables.reduce<Record<string, TableInfo[]>>((acc, t) => {
    if (!acc[t.schema]) acc[t.schema] = []
    acc[t.schema].push(t)
    return acc
  }, {})
  const multipleSchemas = Object.keys(schemaGroups).length > 1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Database</h1>
        <div className="flex items-center gap-2 ml-auto">
          {connectionString ? (
            <Button variant="outline" size="sm" onClick={disconnect}>
              <LogOut className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          ) : (
            <>
              <Input
                placeholder="postgres://user:pass@host/dbname"
                value={connInput}
                onChange={(e) => setConnInput(e.target.value)}
                className="h-8 w-80 font-mono text-xs"
                type="password"
                onKeyDown={(e) => e.key === "Enter" && connect()}
              />
              <Button size="sm" onClick={connect} disabled={!connInput.trim() || tablesLoading}>
                Connect
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* Table list */}
        <div className="w-56 shrink-0 rounded-lg border">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tables</span>
          </div>
          <ScrollArea className="h-[calc(100%-40px)]">
            {tablesLoading ? (
              <p className="text-xs text-muted-foreground p-3">Loading…</p>
            ) : tables.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">
                {connectionString ? "No tables found" : "Connect to view tables"}
              </p>
            ) : (
              <div className="p-1">
                {Object.entries(schemaGroups).map(([schema, schemaTables]) => (
                  <div key={schema}>
                    {multipleSchemas && (
                      <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {schema}
                      </p>
                    )}
                    {schemaTables.map((t) => {
                      const isSelected =
                        selectedTable?.schema === t.schema && selectedTable?.name === t.name
                      return (
                        <button
                          key={`${t.schema}.${t.name}`}
                          onClick={() => selectTable(t.schema, t.name)}
                          className={`w-full text-left rounded px-2 py-1.5 text-sm flex items-center justify-between gap-2 ${
                            isSelected ? "bg-muted" : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="truncate font-mono text-xs">{t.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {Number(t.row_estimate).toLocaleString()}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Data grid */}
        <div className="flex-1 flex flex-col rounded-lg border overflow-hidden">
          {!selectedTable ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              {connectionString
                ? "Select a table to view its data"
                : "Connect to a database to get started"}
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <>
              <div className="border-b px-3 py-2 text-sm font-mono flex items-center justify-between">
                <span>
                  {selectedTable.schema !== "public"
                    ? `${selectedTable.schema}.${selectedTable.name}`
                    : selectedTable.name}
                </span>
                {result && (
                  <span className="text-muted-foreground text-xs">
                    {result.total.toLocaleString()} rows
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col} className="font-mono text-xs whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result?.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-center text-muted-foreground"
                        >
                          No rows
                        </TableCell>
                      </TableRow>
                    ) : (
                      result?.data.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell
                              key={col}
                              className="font-mono text-xs whitespace-nowrap max-w-xs truncate"
                              title={String(row[col] ?? "")}
                            >
                              {row[col] === null ? (
                                <span className="text-muted-foreground italic">null</span>
                              ) : typeof row[col] === "object" ? (
                                JSON.stringify(row[col])
                              ) : (
                                String(row[col])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {result && (
                <div className="border-t px-3 py-2 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => {
                      const p = page - 1
                      setPage(p)
                      fetchTableData(selectedTable.schema, selectedTable.name, p)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => {
                      const p = page + 1
                      setPage(p)
                      fetchTableData(selectedTable.schema, selectedTable.name, p)
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


