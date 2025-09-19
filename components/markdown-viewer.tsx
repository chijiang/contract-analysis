"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
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

    // 清理文本用于匹配（移除多余空白字符）
    const cleanText = (text: string): string => {
      return text.replace(/\s+/g, ' ').trim()
    }

    // 查找文本在内容中的位置并高亮
    const highlightAndScrollTo = (searchText: string): boolean => {
      if (!searchText || !content) return false

      let cleanedSearchText = cleanText(searchText)
      const cleanedContent = cleanText(content)
      
      // 在清理后的内容中查找位置
      let index = cleanedContent.toLowerCase().indexOf(cleanedSearchText.toLowerCase())
      if (index === -1) {
        // 如果找不到完全匹配，尝试查找部分匹配
        const words = cleanedSearchText.split(' ').filter(word => word.length > 2)
        let bestMatch = ''
        let bestIndex = -1
        
        for (const word of words) {
          const wordIndex = cleanedContent.toLowerCase().indexOf(word.toLowerCase())
          if (wordIndex !== -1) {
            // 找到单词后，尝试扩展匹配范围
            const start = Math.max(0, wordIndex - 50)
            const end = Math.min(cleanedContent.length, wordIndex + word.length + 50)
            const contextText = cleanedContent.slice(start, end)
            
            if (contextText.length > bestMatch.length) {
              bestMatch = contextText
              bestIndex = start
            }
          }
        }
        
        if (bestIndex === -1) return false
        
        // 使用最佳匹配
        cleanedSearchText = bestMatch
        index = bestIndex
      }

      // 在原始内容中找到对应位置
      let originalIndex = -1
      let cleanIndex = 0
      
      for (let i = 0; i < content.length && cleanIndex < index; i++) {
        if (content[i].match(/\s/)) {
          // 跳过连续空白字符
          while (i < content.length && content[i].match(/\s/)) {
            i++
          }
          i-- // 回退一位，因为for循环会自动+1
          cleanIndex++
        } else {
          if (cleanIndex === index) {
            originalIndex = i
            break
          }
          cleanIndex++
        }
      }

      if (originalIndex === -1) {
        // 如果精确匹配失败，使用模糊匹配
        originalIndex = content.toLowerCase().indexOf(cleanedSearchText.toLowerCase())
      }

      if (originalIndex === -1) return false

      // 创建高亮的HTML内容
      const beforeText = content.slice(0, originalIndex)
      const matchedText = content.slice(originalIndex, originalIndex + cleanedSearchText.length)
      const afterText = content.slice(originalIndex + cleanedSearchText.length)

      const highlighted = `${beforeText}<mark class="bg-yellow-200 px-1 py-0.5 rounded animate-pulse" id="highlight-target">${matchedText}</mark>${afterText}`
      
      setHighlightedContent(highlighted)
      setCurrentHighlight(cleanedSearchText)

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
