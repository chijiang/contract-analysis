import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function initializeDatabase() {
  try {
    console.log("开始初始化数据库...")

    // 1. 创建角色
    console.log("创建角色...")
    const adminRole = await prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: {
        name: "admin",
        description: "管理员，可以访问所有功能",
      },
    })

    const userRole = await prisma.role.upsert({
      where: { name: "user" },
      update: {},
      create: {
        name: "user",
        description: "普通用户，只能访问基本功能",
      },
    })

    console.log("角色创建完成")

    // 2. 创建初始管理员用户
    console.log("创建初始管理员用户...")
    const adminPassword = await bcrypt.hash("admin123", 12)

    const adminUser = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        passwordHash: adminPassword,
        roleId: adminRole.id,
        isPasswordChanged: false,
        isActive: true,
      },
    })

    console.log("初始管理员用户创建完成")

    // 3. 创建基础 URL 权限
    console.log("创建基础 URL 权限...")

    // Admin 权限
    const adminPermissions = [
      { urlPattern: "/", description: "主页" },
      { urlPattern: "/service-plans", description: "服务计划管理" },
      { urlPattern: "/service-plans/*", description: "服务计划详情" },
      { urlPattern: "/standard-terms", description: "审核标准管理" },
      { urlPattern: "/logs", description: "处理日志" },
      { urlPattern: "/admin/*", description: "管理员页面" },
      { urlPattern: "/settings", description: "个人设置" },
      { urlPattern: "/contracts/*", description: "合同详情页面" },
    ]

    // User 权限
    const userPermissions = [
      { urlPattern: "/", description: "主页" },
      { urlPattern: "/contracts/*", description: "合同详情页面" },
      { urlPattern: "/settings", description: "个人设置" },
    ]

    // 创建 admin 权限
    for (const perm of adminPermissions) {
      await prisma.uRLPermission.upsert({
        where: {
          urlPattern_roleId: {
            urlPattern: perm.urlPattern,
            roleId: adminRole.id,
          },
        },
        update: {},
        create: {
          urlPattern: perm.urlPattern,
          roleId: adminRole.id,
          description: perm.description,
        },
      })
    }

    // 创建 user 权限
    for (const perm of userPermissions) {
      await prisma.uRLPermission.upsert({
        where: {
          urlPattern_roleId: {
            urlPattern: perm.urlPattern,
            roleId: userRole.id,
          },
        },
        update: {},
        create: {
          urlPattern: perm.urlPattern,
          roleId: userRole.id,
          description: perm.description,
        },
      })
    }

    console.log("基础 URL 权限创建完成")

    console.log("数据库初始化完成！")
    console.log("初始管理员账户:")
    console.log("用户名: admin")
    console.log("密码: admin123")
    console.log("请及时修改默认密码！")

  } catch (error) {
    console.error("数据库初始化失败:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log("初始化脚本执行完成")
      process.exit(0)
    })
    .catch((error) => {
      console.error("初始化脚本执行失败:", error)
      process.exit(1)
    })
}
