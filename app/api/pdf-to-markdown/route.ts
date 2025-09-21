import { NextRequest, NextResponse } from "next/server"

import { buildBackendUrl } from "@/lib/backend-service"

export async function POST(req: NextRequest) {
  let upstreamUrl: string
  try {
    upstreamUrl = buildBackendUrl("/api/v1/pdf_to_markdown")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ message }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (error) {
    return NextResponse.json({ message: "请求格式不正确，无法解析表单数据" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ message: "请上传 PDF 文件" }, { status: 400 })
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal: req.signal,
      // @ts-expect-error Node.js 18 需要显式声明 duplex 才能发送 FormData
      duplex: "half",
    })

    const contentType = upstreamResponse.headers.get("content-type") ?? ""
    const buffer = await upstreamResponse.arrayBuffer()

    if (contentType.includes("application/json")) {
      try {
        const decoded = new TextDecoder().decode(buffer)
        const payload = JSON.parse(decoded) as unknown
        return NextResponse.json(payload, { status: upstreamResponse.status })
      } catch (error) {
        console.warn("无法解析上游 JSON 响应，将返回原始内容", error)
      }
    }

    const headers = contentType
      ? {
          "Content-Type": contentType,
        }
      : undefined

    return new NextResponse(buffer, {
      status: upstreamResponse.status,
      headers,
    })
  } catch (error) {
    console.error("Failed to proxy pdf_to_markdown request", error)

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ message: "PDF 转换请求已被取消" }, { status: 499 })
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ message: "PDF 转换请求超时，请稍后重试" }, { status: 504 })
    }

    const message = error instanceof Error ? error.message : "PDF 转换服务调用失败"
    return NextResponse.json({ message: `PDF 转换服务调用失败：${message}` }, { status: 502 })
  }
}
