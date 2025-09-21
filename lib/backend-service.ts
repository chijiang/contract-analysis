const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const resolveBackendBaseUrl = (...preferred: Array<string | null | undefined>) => {
  for (const candidate of preferred) {
    if (isNonEmptyString(candidate)) {
      return stripTrailingSlash(candidate.trim())
    }
  }

  const fallbacks = [
    process.env.INTERNAL_BACKEND_URL,
    process.env.BACKEND_SERVICE_BASE_URL,
    process.env.PYTHON_BACKEND_BASE_URL,
  ]

  for (const candidate of fallbacks) {
    if (isNonEmptyString(candidate)) {
      return stripTrailingSlash(candidate.trim())
    }
  }

  throw new Error(
    "未配置后端服务地址，请在环境变量中设置 INTERNAL_BACKEND_URL 或 BACKEND_SERVICE_BASE_URL",
  )
}

export const buildBackendUrl = (path: string, ...preferred: Array<string | null | undefined>) => {
  const baseUrl = resolveBackendBaseUrl(...preferred)
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
