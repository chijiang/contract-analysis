"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface MarkdownViewerProps {
  content: string
  className?: string
}

export interface MarkdownViewerRef {
  highlightAndScrollTo: (text: string) => boolean
  clearHighlight: () => void
}

const MarkdownViewer = forwardRef<MarkdownViewerRef, MarkdownViewerProps>(
  ({ content, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const [highlightedContent, setHighlightedContent] = useState<string>(content)
    const [currentHighlight, setCurrentHighlight] = useState<string | null>(null)

    const normalizeForMatch = (text: string): string => {
      return text.replace(/\s+/g, "").toLowerCase()
    }

    const tokeniseForFallback = (text: string): string[] => {
      return text
        .split(/[\s,，。；;:：、\n\r()（）【】『』「」“”"'<>《》]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1)
    }

    const { normalizedContent, normalizedIndexMap } = useMemo(() => {
      const chars: string[] = []
      const indexMap: number[] = []

      for (let i = 0; i < content.length; i++) {
        const char = content[i]
        if (!char.match(/\s/)) {
          chars.push(char.toLowerCase())
          indexMap.push(i)
        }
      }

      return {
        normalizedContent: chars.join(""),
        normalizedIndexMap: indexMap,
      }
    }, [content])

    // 查找文本在内容中的位置并高亮
    const highlightAndScrollTo = (searchText: string): boolean => {
      if (!searchText || !content) return false

      let normalizedTarget = normalizeForMatch(searchText)
      if (!normalizedTarget) return false

      let normalizedIndex = normalizedContent.indexOf(normalizedTarget)

      if (normalizedIndex === -1) {
        const tokens = tokeniseForFallback(searchText)
        let bestLength = 0
        let bestIndex = -1

        for (const token of tokens) {
          const normalizedToken = normalizeForMatch(token)
          if (!normalizedToken) continue

          const tokenIndex = normalizedContent.indexOf(normalizedToken)
          if (tokenIndex !== -1) {
            const contextRadius = 50
            const start = Math.max(0, tokenIndex - contextRadius)
            const end = Math.min(normalizedContent.length, tokenIndex + normalizedToken.length + contextRadius)
            const candidateLength = end - start

            if (candidateLength > bestLength) {
              bestLength = candidateLength
              bestIndex = start
              normalizedTarget = normalizedContent.slice(start, end)
            }
          }
        }

        if (bestIndex !== -1) {
          normalizedIndex = bestIndex
        }
      }

      if (normalizedIndex === -1) return false

      const highlightStart = normalizedIndexMap[normalizedIndex]
      const highlightEndIndex = normalizedIndex + normalizedTarget.length - 1
      const highlightEnd = normalizedIndexMap[Math.min(highlightEndIndex, normalizedIndexMap.length - 1)]

      if (highlightStart === undefined || highlightEnd === undefined) return false

      const beforeText = content.slice(0, highlightStart)
      const matchedText = content.slice(highlightStart, highlightEnd + 1)
      const afterText = content.slice(highlightEnd + 1)

      const highlighted = `${beforeText}<mark class="bg-yellow-200 px-1 py-0.5 rounded animate-pulse" id="highlight-target">${matchedText}</mark>${afterText}`
      
      setHighlightedContent(highlighted)
      setCurrentHighlight(matchedText)

      // 滚动到高亮位置
      setTimeout(() => {
        const highlightElement = containerRef.current?.querySelector('#highlight-target')
        if (highlightElement) {
          // 尝试找到ScrollArea的滚动容器
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
          
          if (scrollContainer) {
            // 计算元素在容器中的位置
            const elementRect = highlightElement.getBoundingClientRect()
            const containerRect = scrollContainer.getBoundingClientRect()
            const scrollTop = scrollContainer.scrollTop
            
            // 计算目标滚动位置（将元素置于容器中心）
            const targetScrollTop = scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2)
            
            // 平滑滚动
            scrollContainer.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            })
          } else {
            // 备用方案：使用标准的scrollIntoView
            highlightElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
          }
          
          // 添加闪烁效果
          highlightElement.classList.add('animate-bounce')
          setTimeout(() => {
            highlightElement.classList.remove('animate-bounce')
          }, 1000)
        }
      }, 200)

      return true
    }

    // 清除高亮
    const clearHighlight = () => {
      setHighlightedContent(content)
      setCurrentHighlight(null)
    }

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      highlightAndScrollTo,
      clearHighlight
    }))

    // 当内容变化时重置高亮
    useEffect(() => {
      setHighlightedContent(content)
      setCurrentHighlight(null)
    }, [content])

    return (
      <ScrollArea className={cn("h-full", className)} ref={scrollAreaRef}>
        <div className="p-6" ref={containerRef}>
          <pre 
            className="whitespace-pre-wrap text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </div>
      </ScrollArea>
    )
  }
)

MarkdownViewer.displayName = "MarkdownViewer"

export { MarkdownViewer }
