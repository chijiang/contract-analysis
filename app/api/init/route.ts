import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/init-db"

export async function POST() {
  try {
    console.log("开始数据库初始化...")

    await initializeDatabase()

    return NextResponse.json({
      message: "数据库初始化成功",
      adminAccount: {
        username: "admin",
        password: "admin123",
        note: "请及时修改默认密码！",
      },
    })
  } catch (error) {
    console.error("数据库初始化失败:", error)
    return NextResponse.json(
      {
        error: "数据库初始化失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
