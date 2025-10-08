import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { verifyAuth } from "@/lib/auth"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "当前密码和新密码不能为空" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码长度不能少于6位" },
        { status: 400 }
      )
    }

    // 获取用户完整信息
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 如果用户已经修改过密码，需要验证当前密码
    if (user.isPasswordChanged) {
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValidCurrentPassword) {
        return NextResponse.json(
          { error: "当前密码错误" },
          { status: 400 }
        )
      }
    } else {
      // 首次修改密码，currentPassword 应该是默认密码
      const isValidDefaultPassword = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValidDefaultPassword) {
        return NextResponse.json(
          { error: "当前密码错误" },
          { status: 400 }
        )
      }
    }

    // 哈希新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // 更新用户密码
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedNewPassword,
        isPasswordChanged: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: "密码修改成功",
    })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
