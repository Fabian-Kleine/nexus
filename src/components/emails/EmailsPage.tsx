import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailHistoryTable } from "./EmailHistoryTable"
import { TemplateList } from "./TemplateList"

export function EmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Emails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sent email history and templates
        </p>
      </div>
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4">
          <EmailHistoryTable />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplateList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
