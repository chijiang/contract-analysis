import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyAuth } from "@/lib/auth"

const prisma = new PrismaClient()

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

    // 获取角色列表
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const roleList = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }))

    return NextResponse.json({
      roles: roleList,
    })
  } catch (error) {
    console.error("Get roles error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
