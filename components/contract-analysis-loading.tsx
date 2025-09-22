"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { FileText, Search, CheckCircle2, Brain, Scale, AlertTriangle, Sparkles } from "lucide-react"

const analysisSteps = [
  {
    text: "正在解析合同文档结构...",
    icon: FileText,
    color: "text-blue-600"
  },
  {
    text: "智能识别合同章节内容...",
    icon: Search,
    color: "text-green-600"
  },
  {
    text: "深度分析关键条款条文...",
    icon: Brain,
    color: "text-purple-600"
  },
  {
    text: "比对标准条款库数据...",
    icon: Scale,
    color: "text-orange-600"
  },
  {
    text: "检测潜在法律风险点...",
    icon: AlertTriangle,
    color: "text-red-600"
  },
  {
    text: "生成智能分析建议...",
    icon: Sparkles,
    color: "text-indigo-600"
  },
  {
    text: "整理合规性评估报告...",
    icon: CheckCircle2,
    color: "text-emerald-600"
  }
]

interface ContractAnalysisLoadingProps {
  className?: string
}

export function ContractAnalysisLoading({ className }: ContractAnalysisLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      
      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % analysisSteps.length)
        setIsVisible(true)
      }, 300) // 淡出时间
      
    }, 4000) // 每4秒切换一次

    return () => clearInterval(interval)
  }, [])

  const currentStepData = analysisSteps[currentStep]
  const Icon = currentStepData.icon

  return (
    <div className={cn("flex h-[600px] flex-col items-center justify-center space-y-8", className)}>
      {/* 主要动画区域 */}
      <div className="relative flex flex-col items-center space-y-6">
        {/* 旋转的外圈 */}
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "transition-all duration-300 ease-in-out",
              isVisible ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}>
              <Icon className={cn("h-8 w-8", currentStepData.color)} />
            </div>
          </div>
        </div>

        {/* 滚动文字 */}
        <div className="h-16 flex items-center justify-center">
          <div className={cn(
            "text-center text-lg font-medium transition-all duration-300 ease-in-out transform",
            isVisible 
              ? "translate-y-0 opacity-100" 
              : "translate-y-4 opacity-0"
          )}>
            <span className={currentStepData.color}>
              {currentStepData.text}
            </span>
          </div>
        </div>

        {/* 进度指示器 */}
        <div className="flex space-x-2">
          {analysisSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "bg-blue-600 scale-125"
                  : index < currentStep
                  ? "bg-green-500"
                  : "bg-gray-300"
              )}
            />
          ))}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="max-w-md text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          AI正在深度分析您的合同内容
        </p>
        <p className="text-xs text-muted-foreground/70">
          这通常需要2-5分钟，请耐心等待...
        </p>
      </div>

      {/* 装饰性动画元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 浮动的小圆点 */}
        <div className="absolute top-1/4 left-1/4 h-2 w-2 bg-blue-400/30 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 h-1 w-1 bg-purple-400/40 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 h-1.5 w-1.5 bg-green-400/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 h-1 w-1 bg-orange-400/40 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  )
}
