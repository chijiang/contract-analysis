import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyAuth } from "@/lib/auth"

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params
    const { roleId, isActive } = await request.json()

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 不允许修改自己的角色或状态
    if (userId === authResult.user.id) {
      return NextResponse.json(
        { error: "不能修改自己的账户" },
        { status: 400 }
      )
    }

    // 检查角色是否存在
    if (roleId) {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
      })

      if (!role) {
        return NextResponse.json(
          { error: "角色不存在" },
          { status: 400 }
        )
      }
    }

    // 更新用户信息
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (roleId !== undefined) {
      updateData.roleId = roleId
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
      },
    })

    return NextResponse.json({
      message: "用户信息更新成功",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role.name,
        roleId: updatedUser.roleId,
        isPasswordChanged: updatedUser.isPasswordChanged,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 不允许删除自己的账户
    if (userId === authResult.user.id) {
      return NextResponse.json(
        { error: "不能删除自己的账户" },
        { status: 400 }
      )
    }

    // 软删除用户（设置为非活跃状态）
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: "用户删除成功",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
