import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface AuthUser {
  id: string
  username: string
  role: string
  roleId: string
  isPasswordChanged: boolean
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return { success: false, error: "No token provided" }
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any

    // 验证用户是否仍然存在且活跃
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
      },
      include: {
        role: true,
      },
    })

    if (!user) {
      return { success: false, error: "User not found or inactive" }
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name,
        roleId: user.roleId,
        isPasswordChanged: user.isPasswordChanged,
      },
    }
  } catch (error) {
    return { success: false, error: "Invalid token" }
  }
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const result = await verifyAuth(request)
  return result.success ? result.user || null : null
}

// 检查用户是否有权限访问指定的 URL
export async function checkPermission(user: AuthUser, pathname: string): Promise<boolean> {
  const prisma = new PrismaClient()

  try {
    // 从数据库中获取用户角色的所有权限
    const permissions = await prisma.uRLPermission.findMany({
      where: {
        roleId: user.roleId,
      },
    })

    // 检查是否有匹配的权限
    for (const permission of permissions) {
      if (matchesPattern(permission.urlPattern, pathname)) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Permission check error:", error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// 通配符匹配函数
function matchesPattern(pattern: string, pathname: string): boolean {
  // 将通配符转换为正则表达式
  const regexPattern = pattern
    .replace(/\*/g, ".*") // 将 * 替换为 .*
    .replace(/\//g, "\\/") // 转义 /

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(pathname)
}
