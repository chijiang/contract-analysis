import { NextResponse } from "next/server"

export async function POST() {
  try {
    // 创建登出响应
    const response = NextResponse.json({
      message: "登出成功",
    })

    // 清除认证 cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}