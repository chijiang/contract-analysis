import { createHash } from "crypto"

/**
 * 计算文件的SHA-256哈希值
 * @param file File对象或Buffer
 * @returns Promise<string> 哈希值的十六进制字符串
 */
export async function calculateFileHash(file: File | Buffer): Promise<string> {
  const hash = createHash('sha256')
  
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    hash.update(buffer)
  } else {
    hash.update(file)
  }
  
  return hash.digest('hex')
}

/**
 * 从ArrayBuffer计算SHA-256哈希值
 * @param buffer ArrayBuffer
 * @returns string 哈希值的十六进制字符串
 */
export function calculateBufferHash(buffer: ArrayBuffer): string {
  const hash = createHash('sha256')
  hash.update(Buffer.from(buffer))
  return hash.digest('hex')
}
