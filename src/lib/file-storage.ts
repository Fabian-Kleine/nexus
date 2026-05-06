import { join, extname } from "path"
import { mkdir, writeFile, unlink, readFile } from "fs/promises"

function uploadsDir(): string {
  const base = (import.meta.env.UPLOADS_DIR as string | undefined) ?? "./uploads"
  return base.startsWith(".") ? join(process.cwd(), base) : base
}

export function getStorageDir(isPublic: boolean): string {
  return join(uploadsDir(), isPublic ? "public" : "private")
}

export async function saveFile(
  id: string,
  buffer: Buffer,
  originalName: string,
  isPublic: boolean,
): Promise<string> {
  const ext = extname(originalName) || ""
  const storedName = `${id}${ext}`
  const dir = getStorageDir(isPublic)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, storedName), buffer)
  return storedName
}

export function getFilePath(storedName: string, isPublic: boolean): string {
  return join(getStorageDir(isPublic), storedName)
}

export async function readFileBuffer(
  storedName: string,
  isPublic: boolean,
): Promise<Buffer> {
  return readFile(getFilePath(storedName, isPublic))
}

export async function deleteFile(
  storedName: string,
  isPublic: boolean,
): Promise<void> {
  await unlink(getFilePath(storedName, isPublic))
}
