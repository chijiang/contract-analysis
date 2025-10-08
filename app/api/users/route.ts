import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { verifyAuth } from "@/lib/auth"

const prisma = new PrismaClient()
const DEFAULT_PASSWORD = "123456" // 默认密码

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    if (authResult.user.role !== "admin") {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      )
    }

    // 获取用户列表
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      include: {
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role.name,
      roleId: user.roleId,
      isPasswordChanged: user.isPasswordChanged,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({
      users: userList,
    })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    if (authResult.user.role !== "admin") {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      )
    }

    const { username, roleId } = await request.json()

    if (!username || !roleId) {
      return NextResponse.json(
        { error: "用户名和角色不能为空" },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 400 }
      )
    }

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 400 }
      )
    }

    // 哈希默认密码
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        roleId,
        isPasswordChanged: false,
        isActive: true,
      },
      include: {
        role: true,
      },
    })

    return NextResponse.json({
      message: "用户创建成功",
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role.name,
        roleId: newUser.roleId,
        isPasswordChanged: newUser.isPasswordChanged,
        createdAt: newUser.createdAt,
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
