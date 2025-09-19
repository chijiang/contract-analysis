import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

export type StorageSaveResult = {
  provider: "local" | "s3"
  filePath: string
  originalName: string
}

export interface StorageAdapter {
  save(file: File, options?: { originalName?: string }): Promise<StorageSaveResult>
  getDownloadUrl(filePath: string): Promise<string>
  delete(filePath: string): Promise<void>
}

export const resolvedLocalStorageRoot = (() => {
  const root = process.env.LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), "storage/uploads")
  return path.isAbsolute(root) ? root : path.join(process.cwd(), root)
})()

class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolvePath(relativePath: string) {
    return path.join(this.root, relativePath)
  }

  async save(file: File, options?: { originalName?: string }): Promise<StorageSaveResult> {
    const fileExtension = path.extname(options?.originalName ?? file.name ?? "") || ".pdf"
    const relativePath = path.join(new Date().toISOString().slice(0, 10), `${randomUUID()}${fileExtension}`)
    const absolutePath = this.resolvePath(relativePath)

    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(absolutePath, Buffer.from(arrayBuffer))

    return {
      provider: "local",
      filePath: relativePath,
      originalName: options?.originalName ?? file.name ?? relativePath,
    }
  }

  async getDownloadUrl(filePath: string): Promise<string> {
    return path.join("/api/files", filePath)
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = this.resolvePath(filePath)
    await fs.rm(absolutePath, { force: true })
  }
}

class S3StorageAdapter implements StorageAdapter {
  async save(): Promise<StorageSaveResult> {
    throw new Error("S3 存储尚未实现，请切换 FILE_STORAGE_PROVIDER=local")
  }

  async getDownloadUrl(): Promise<string> {
    throw new Error("S3 存储尚未实现")
  }

  async delete(): Promise<void> {
    throw new Error("S3 存储尚未实现")
  }
}

function createStorageAdapter(): StorageAdapter {
  const provider = (process.env.FILE_STORAGE_PROVIDER ?? "local").toLowerCase()

  if (provider === "s3") {
    return new S3StorageAdapter()
  }

  return new LocalStorageAdapter(resolvedLocalStorageRoot)
}

export const storageAdapter = createStorageAdapter()
