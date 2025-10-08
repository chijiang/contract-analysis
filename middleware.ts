import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 不需要认证的路径
const publicPaths = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 跳过 API 路径
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }
  
  // 跳过公开路径
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }
  
  // 检查是否有 auth-token cookie
  const token = request.cookies.get("auth-token")?.value
  
  if (!token) {
    // 未登录，重定向到登录页面
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // 有token，允许访问
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (favicon 文件)
     * - public 文件夹
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}