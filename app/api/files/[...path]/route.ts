import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { resolvedLocalStorageRoot } from "@/lib/storage"

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<NextResponse> {
  const relativePath = params.path.join("/")
  const absolutePath = path.join(resolvedLocalStorageRoot, relativePath)

  try {
    const file = await fs.readFile(absolutePath)
    const arrayBuffer = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("File not found", { status: 404 })
    }

    console.error("Failed to read local file", error)
    return new NextResponse("Failed to read file", { status: 500 })
  }
}
