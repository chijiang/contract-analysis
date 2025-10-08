"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
// 使用自定义下拉菜单，避免定位问题
import { FileText, Search, BookOpen, Archive, Menu, Scale, ScrollText, Layers, Users, Settings, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

const navigation = [
  {
    name: "合同分析",
    href: "/",
    icon: FileText,
    description: "PDF合同预览和条款分析",
  },
  {
    name: "服务计划管理",
    href: "/service-plans",
    icon: Layers,
    description: "维护服务组合与条款配置",
  },
  {
    name: "审核标准管理",
    href: "/standard-terms",
    icon: BookOpen,
    description: "管理审核标准条款库",
  },
  // {
  //   name: "已处理合同",
  //   href: "/processed-contracts",
  //   icon: Archive,
  //   description: "查看已审核的合同",
  // },
  {
    name: "处理日志",
    href: "/logs",
    icon: ScrollText,
    description: "追踪合同处理历史记录",
  },
]

interface User {
  id: string
  username: string
  role: string
  isPasswordChanged: boolean
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)

  // 加载用户信息
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          
          // 如果是首次登录（密码未修改），显示修改密码对话框
          if (data.user && !data.user.isPasswordChanged) {
            setShowChangePasswordDialog(true)
          }
        }
      } catch (error) {
        // 用户未登录
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      setUser(null)
      router.push("/login")
    } catch (error) {
      router.push("/login")
    }
  }

  // 过滤导航项基于用户权限
  const filteredNavigation = navigation.filter(item => {
    if (!user) return false

    // admin 可以访问所有页面
    if (user.role === "admin") return true

    // user 只允许访问主页和 contracts/* 页面（通过中间件控制）
    if (user.role === "user") {
      return item.href === "/"
    }

    return false
  })

  // 如果正在加载或未登录，不显示导航
  if (loading || !user) {
    return null
  }

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">合同分析管理系统</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {filteredNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60",
                )}
              >
                {item.name}
              </Link>
            ))}
            {/* Admin 用户显示用户管理链接 */}
            {user.role === "admin" && (
              <Link
                href="/admin/users"
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === "/admin/users" ? "text-foreground" : "text-foreground/60",
                )}
              >
                用户管理
              </Link>
            )}
          </nav>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">切换菜单</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link href="/" className="flex items-center space-x-2" onClick={() => setIsOpen(false)}>
              <Scale className="h-6 w-6 text-primary" />
              <span className="font-bold">合同分析管理系统</span>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href ? "bg-accent text-accent-foreground" : "text-foreground/60",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </Link>
                ))}

                {/* Admin 用户显示用户管理链接 */}
                {user.role === "admin" && (
                  <Link
                    href="/admin/users"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      pathname === "/admin/users" ? "bg-accent text-accent-foreground" : "text-foreground/60",
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <div>
                      <div>用户管理</div>
                      <div className="text-xs text-muted-foreground">管理系统用户和权限</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button
              variant="outline"
              className="inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
            >
              <Search className="mr-2 h-4 w-4" />
              搜索合同...
            </Button>
          </div> */}

          {/* 用户菜单（自定义实现，稳定定位） */}
          <UserMenu
            username={user.username}
            role={user.role}
            onChangePassword={() => setShowChangePasswordDialog(true)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>

    {/* 首次登录修改密码对话框 */}
    <ChangePasswordDialog
      open={showChangePasswordDialog}
      onOpenChange={setShowChangePasswordDialog}
      isFirstLogin={user ? !user.isPasswordChanged : false}
    />
  </>
  )
}

// 自定义用户菜单组件，避免 Radix Popper 在特定环境中的定位异常
function UserMenu({
  username,
  role,
  onChangePassword,
  onLogout,
}: {
  username: string
  role: string
  onChangePassword: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        className="relative h-8 w-8 rounded-full"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="用户菜单"
          className="absolute right-0 mt-2 z-[60] w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <div className="px-2 py-1.5 text-sm font-medium">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{username}</p>
              <p className="text-xs leading-none text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <div className="-mx-1 my-1 h-px bg-border" />
          <Link href="/settings" className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
            <User className="h-4 w-4" />
            <span>个人设置</span>
          </Link>
          <button
            onClick={onChangePassword}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-4 w-4" />
            <span>修改密码</span>
          </button>
          <div className="-mx-1 my-1 h-px bg-border" />
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-red-600 hover:bg-accent hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span>退出登录</span>
          </button>
        </div>
      )}
    </div>
  )
}
