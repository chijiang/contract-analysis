"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, XCircle, BarChart3, Scale, Target } from "lucide-react"

// 模拟分析数据
const mockAnalysisData = {
  overallScore: 78,
  riskDistribution: {
    high: 2,
    medium: 4,
    low: 9,
  },
  categoryAnalysis: [
    {
      category: "付款条款",
      score: 85,
      status: "良好",
      issues: 1,
      recommendations: ["建议明确逾期付款的利息计算方式"],
    },
    {
      category: "违约责任",
      score: 65,
      status: "需关注",
      issues: 2,
      recommendations: ["违约金比例过高，建议调整至合理范围", "增加不可抗力条款"],
    },
    {
      category: "知识产权",
      score: 90,
      status: "优秀",
      issues: 0,
      recommendations: ["条款完善，无需修改"],
    },
    {
      category: "争议解决",
      score: 70,
      status: "一般",
      issues: 1,
      recommendations: ["建议增加调解程序"],
    },
  ],
  complianceCheck: [
    {
      regulation: "《合同法》",
      compliance: 85,
      violations: [
        {
          article: "第114条",
          description: "违约金过高",
          severity: "medium",
          suggestion: "建议将违约金调整至合同总额的20%以内",
        },
      ],
    },
    {
      regulation: "《民法典》",
      compliance: 92,
      violations: [],
    },
    {
      regulation: "《劳动合同法》",
      compliance: 88,
      violations: [
        {
          article: "第25条",
          description: "试用期约定不当",
          severity: "low",
          suggestion: "试用期应与合同期限匹配",
        },
      ],
    },
  ],
  riskFactors: [
    {
      factor: "违约金条款",
      riskLevel: "high",
      impact: "可能面临法院调减风险",
      probability: 75,
      mitigation: "调整违约金比例至合理范围",
    },
    {
      factor: "管辖权约定",
      riskLevel: "medium",
      impact: "争议解决成本较高",
      probability: 45,
      mitigation: "选择双方都便利的管辖法院",
    },
    {
      factor: "不可抗力条款",
      riskLevel: "medium",
      impact: "特殊情况下责任不明确",
      probability: 30,
      mitigation: "完善不可抗力条款定义和处理程序",
    },
  ],
}

const getScoreColor = (score: number) => {
  if (score >= 85) return "text-green-600"
  if (score >= 70) return "text-yellow-600"
  return "text-red-600"
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "优秀":
      return "default"
    case "良好":
      return "secondary"
    case "一般":
      return "secondary"
    case "需关注":
      return "destructive"
    default:
      return "default"
  }
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "high":
      return "destructive"
    case "medium":
      return "warning"
    case "low":
      return "success"
    default:
      return "default"
  }
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "high":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "medium":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case "low":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    default:
      return <CheckCircle className="h-4 w-4" />
  }
}

export function ContractAnalysisPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* 总体评分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            合同分析概览
          </CardTitle>
          <CardDescription>基于标准条款库的智能分析结果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-2">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - mockAnalysisData.overallScore / 100)}`}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{mockAnalysisData.overallScore}</span>
                </div>
              </div>
              <p className="text-sm font-medium">总体评分</p>
              <p className="text-xs text-muted-foreground">综合合规性评估</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{mockAnalysisData.riskDistribution.high}</div>
              <p className="text-sm font-medium">高风险条款</p>
              <p className="text-xs text-muted-foreground">需要重点关注</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{mockAnalysisData.riskDistribution.medium}</div>
              <p className="text-sm font-medium">中风险条款</p>
              <p className="text-xs text-muted-foreground">建议优化</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{mockAnalysisData.riskDistribution.low}</div>
              <p className="text-sm font-medium">低风险条款</p>
              <p className="text-xs text-muted-foreground">符合标准</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细分析 */}
      <Tabs defaultValue="category" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="category">分类分析</TabsTrigger>
          <TabsTrigger value="compliance">合规检查</TabsTrigger>
          <TabsTrigger value="risk">风险评估</TabsTrigger>
          <TabsTrigger value="recommendations">建议报告</TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>条款分类分析</CardTitle>
              <CardDescription>按条款类别进行的详细分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAnalysisData.categoryAnalysis.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{category.category}</h4>
                        <Badge variant={getStatusColor(category.status)}>{category.status}</Badge>
                        {category.issues > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {category.issues} 个问题
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getScoreColor(category.score)}`}>{category.score}</span>
                        <span className="text-sm text-muted-foreground">分</span>
                      </div>
                    </div>
                    <Progress value={category.score} className="mb-3" />
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">改进建议：</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {category.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                法规合规性检查
              </CardTitle>
              <CardDescription>对照相关法律法规进行合规性分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockAnalysisData.complianceCheck.map((check, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{check.regulation}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getScoreColor(check.compliance)}`}>{check.compliance}%</span>
                        <span className="text-sm text-muted-foreground">合规</span>
                      </div>
                    </div>
                    <Progress value={check.compliance} className="mb-4" />
                    {check.violations.length > 0 ? (
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-red-600">发现的问题：</h5>
                        {check.violations.map((violation, vIndex) => (
                          <div key={vIndex} className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-start gap-2 mb-2">
                              {getSeverityIcon(violation.severity)}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{violation.article}</p>
                                <p className="text-sm text-muted-foreground">{violation.description}</p>
                              </div>
                            </div>
                            <div className="mt-2 pl-6">
                              <p className="text-sm">
                                <span className="font-medium">建议：</span>
                                {violation.suggestion}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">完全符合该法规要求</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                风险因素分析
              </CardTitle>
              <CardDescription>识别潜在风险并提供缓解措施</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAnalysisData.riskFactors.map((risk, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{risk.factor}</h4>
                        <Badge variant={getRiskColor(risk.riskLevel)}>
                          {risk.riskLevel === "high" ? "高风险" : risk.riskLevel === "medium" ? "中风险" : "低风险"}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{risk.probability}%</p>
                        <p className="text-xs text-muted-foreground">发生概率</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">潜在影响：</p>
                        <p className="text-sm text-muted-foreground">{risk.impact}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">缓解措施：</p>
                        <p className="text-sm text-green-700 bg-green-50 p-2 rounded">{risk.mitigation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                优化建议报告
              </CardTitle>
              <CardDescription>基于分析结果的具体改进建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    高优先级修改建议
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">1.</span>
                      <span>
                        <strong>违约金条款：</strong>
                        当前违约金比例为50%，超出法律规定的合理范围，建议调整至20%以内，避免被法院调减的风险。
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">2.</span>
                      <span>
                        <strong>不可抗力条款：</strong>
                        缺少明确的不可抗力定义和处理程序，建议增加详细的不可抗力条款以降低争议风险。
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    中优先级优化建议
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">1.</span>
                      <span>
                        <strong>争议解决条款：</strong>
                        建议在诉讼前增加调解程序，有助于降低争议解决成本和时间。
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">2.</span>
                      <span>
                        <strong>付款条款：</strong>
                        建议明确逾期付款的利息计算方式和标准，避免后续争议。
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    表现良好的条款
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>
                        <strong>知识产权条款：</strong>
                        权利归属明确，保护措施完善，完全符合相关法律规定。
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>
                        <strong>保密条款：</strong>
                        保密范围和期限约定合理，违约责任明确。
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">总结建议</h4>
                  <p className="text-sm text-blue-700">
                    该合同整体结构完整，主要条款基本符合法律要求。建议重点关注违约金条款的调整和不可抗力条款的完善，这将显著降低合同执行过程中的法律风险。完成上述修改后，合同的整体合规性预计可提升至90%以上。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
