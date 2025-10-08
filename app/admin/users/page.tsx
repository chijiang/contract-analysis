"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, UserPlus, Shield, Settings, Trash2, Edit, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: string
  username: string
  role: string
  roleId: string
  isPasswordChanged: boolean
  createdAt: string
  updatedAt: string
}

interface Role {
  id: string
  name: string
  description: string | null
  userCount: number
  createdAt: string
  updatedAt: string
}

interface Permission {
  id: string
  urlPattern: string
  roleId: string
  roleName: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // 创建用户对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    roleId: "",
  })

  // 编辑用户对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // 创建权限对话框
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [newPermission, setNewPermission] = useState({
    urlPattern: "",
    roleId: "",
    description: "",
  })

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles"),
        fetch("/api/permissions"),
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData.roles)
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json()
        setPermissions(permissionsData.permissions)
      }
    } catch (error) {
      setError("加载数据失败")
    } finally {
      setLoading(false)
    }
  }

  // 创建用户
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.roleId) {
      setError("用户名和角色不能为空")
      return
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        setCreateDialogOpen(false)
        setNewUser({ username: "", roleId: "" })
        loadData()
      } else {
        const data = await response.json()
        setError(data.error || "创建用户失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  // 更新用户
  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: editingUser.roleId,
        }),
      })

      if (response.ok) {
        setEditDialogOpen(false)
        setEditingUser(null)
        loadData()
      } else {
        const data = await response.json()
        setError(data.error || "更新用户失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      } else {
        const data = await response.json()
        setError(data.error || "删除用户失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  // 创建权限
  const handleCreatePermission = async () => {
    if (!newPermission.urlPattern || !newPermission.roleId) {
      setError("URL 模式和角色不能为空")
      return
    }

    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPermission),
      })

      if (response.ok) {
        setPermissionDialogOpen(false)
        setNewPermission({ urlPattern: "", roleId: "", description: "" })
        loadData()
      } else {
        const data = await response.json()
        setError(data.error || "创建权限失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  // 删除权限
  const handleDeletePermission = async (permissionId: string) => {
    try {
      const response = await fetch(`/api/permissions?id=${permissionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      } else {
        const data = await response.json()
        setError(data.error || "删除权限失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8" />
            用户管理
          </h1>
          <p className="text-gray-600 mt-2">管理系统用户、角色和权限</p>
        </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            权限配置
          </TabsTrigger>
        </TabsList>

        {/* 用户管理 */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>用户列表</CardTitle>
                  <CardDescription>管理系统中的所有用户账户</CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      新建用户
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>创建新用户</DialogTitle>
                      <DialogDescription>
                        新用户将使用默认密码 123456，首次登录后需要修改密码。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">用户名</Label>
                        <Input
                          id="username"
                          value={newUser.username}
                          onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="输入用户名"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">角色</Label>
                        <Select value={newUser.roleId} onValueChange={(value) => setNewUser(prev => ({ ...prev, roleId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择角色" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name} - {role.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleCreateUser}>创建</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>密码状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isPasswordChanged ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            已修改
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            未修改
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={editDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                            setEditDialogOpen(open)
                            if (open) setEditingUser(user)
                            else setEditingUser(null)
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>编辑用户</DialogTitle>
                                <DialogDescription>修改用户角色</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>用户名</Label>
                                  <Input value={editingUser?.username} disabled />
                                </div>
                                <div>
                                  <Label htmlFor="edit-role">角色</Label>
                                  <Select
                                    value={editingUser?.roleId}
                                    onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, roleId: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {roles.map(role => (
                                        <SelectItem key={role.id} value={role.id}>
                                          {role.name} - {role.description}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                    取消
                                  </Button>
                                  <Button onClick={handleUpdateUser}>保存</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除用户 "{user.username}" 吗？此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 角色管理 */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>角色列表</CardTitle>
              <CardDescription>系统中的角色定义</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>用户数量</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <Badge variant={role.name === "admin" ? "default" : "secondary"}>
                          {role.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>{role.userCount}</TableCell>
                      <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 权限配置 */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>URL 权限配置</CardTitle>
                  <CardDescription>配置不同角色可以访问的 URL 模式</CardDescription>
                </div>
                <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Settings className="w-4 h-4 mr-2" />
                      添加权限
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加 URL 权限</DialogTitle>
                      <DialogDescription>
                        为指定角色添加可访问的 URL 模式。支持通配符 * 匹配。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="urlPattern">URL 模式</Label>
                        <Input
                          id="urlPattern"
                          value={newPermission.urlPattern}
                          onChange={(e) => setNewPermission(prev => ({ ...prev, urlPattern: e.target.value }))}
                          placeholder="例如: /contracts/*, /admin/*"
                        />
                      </div>
                      <div>
                        <Label htmlFor="perm-role">角色</Label>
                        <Select value={newPermission.roleId} onValueChange={(value) => setNewPermission(prev => ({ ...prev, roleId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择角色" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name} - {role.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="description">描述</Label>
                        <Input
                          id="description"
                          value={newPermission.description}
                          onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="权限描述（可选）"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleCreatePermission}>添加</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL 模式</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map(permission => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-mono text-sm">{permission.urlPattern}</TableCell>
                      <TableCell>
                        <Badge variant={permission.roleName === "admin" ? "default" : "secondary"}>
                          {permission.roleName}
                        </Badge>
                      </TableCell>
                      <TableCell>{permission.description}</TableCell>
                      <TableCell>{new Date(permission.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除此权限配置吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePermission(permission.id)} className="bg-red-600 hover:bg-red-700">
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </main>
    </div>
  )
}
