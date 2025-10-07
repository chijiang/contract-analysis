"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { FileText, Search, BookOpen, Archive, Menu, Scale, ScrollText, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "合同分析",
    href: "/",
    icon: FileText,
    description: "PDF合同预览和条款分析",
  },
  {
    name: "Service Plan管理",
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

export function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">合同审核管理系统</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => (
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
              <span className="font-bold">合同审核管理系统</span>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                {navigation.map((item) => (
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
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button
              variant="outline"
              className="inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
            >
              <Search className="mr-2 h-4 w-4" />
              搜索合同...
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
