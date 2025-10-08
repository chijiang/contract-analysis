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

    // 获取权限列表
    const permissions = await prisma.uRLPermission.findMany({
      include: {
        role: true,
      },
      orderBy: [
        { role: { name: "asc" } },
        { urlPattern: "asc" },
      ],
    })

    const permissionList = permissions.map(permission => ({
      id: permission.id,
      urlPattern: permission.urlPattern,
      roleId: permission.roleId,
      roleName: permission.role.name,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    }))

    return NextResponse.json({
      permissions: permissionList,
    })
  } catch (error) {
    console.error("Get permissions error:", error)
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

    const { urlPattern, roleId, description } = await request.json()

    if (!urlPattern || !roleId) {
      return NextResponse.json(
        { error: "URL 模式和角色不能为空" },
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

    // 检查权限是否已存在
    const existingPermission = await prisma.uRLPermission.findUnique({
      where: {
        urlPattern_roleId: {
          urlPattern,
          roleId,
        },
      },
    })

    if (existingPermission) {
      return NextResponse.json(
        { error: "该角色的此 URL 权限已存在" },
        { status: 400 }
      )
    }

    // 创建权限
    const newPermission = await prisma.uRLPermission.create({
      data: {
        urlPattern,
        roleId,
        description,
      },
      include: {
        role: true,
      },
    })

    return NextResponse.json({
      message: "权限创建成功",
      permission: {
        id: newPermission.id,
        urlPattern: newPermission.urlPattern,
        roleId: newPermission.roleId,
        roleName: newPermission.role.name,
        description: newPermission.description,
        createdAt: newPermission.createdAt,
      },
    })
  } catch (error) {
    console.error("Create permission error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const permissionId = searchParams.get("id")

    if (!permissionId) {
      return NextResponse.json(
        { error: "权限 ID 不能为空" },
        { status: 400 }
      )
    }

    // 检查权限是否存在
    const permission = await prisma.uRLPermission.findUnique({
      where: { id: permissionId },
    })

    if (!permission) {
      return NextResponse.json(
        { error: "权限不存在" },
        { status: 404 }
      )
    }

    // 删除权限
    await prisma.uRLPermission.delete({
      where: { id: permissionId },
    })

    return NextResponse.json({
      message: "权限删除成功",
    })
  } catch (error) {
    console.error("Delete permission error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
