import postgres from "postgres"

export function createTempConnection(dbUrl: string): postgres.Sql {
  let parsed: URL
  try {
    parsed = new URL(dbUrl)
  } catch {
    throw new Error("Invalid connection string: could not parse URL")
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Invalid connection string: must use postgres:// or postgresql:// scheme")
  }

  return postgres(dbUrl, { max: 1 })
}

export async function closeTempConnection(client: postgres.Sql): Promise<void> {
  await client.end()
}
