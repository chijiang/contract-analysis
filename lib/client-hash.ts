/**
 * 在浏览器端计算文件的SHA-256哈希值
 * @param file File对象
 * @returns Promise<string> 哈希值的十六进制字符串
 */
export async function calculateClientFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
