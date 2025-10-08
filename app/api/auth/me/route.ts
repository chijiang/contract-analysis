import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: authResult.user,
    })
  } catch (error) {
    console.error("Get current user error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
