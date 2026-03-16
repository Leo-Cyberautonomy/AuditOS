# AuditAI Demo Video Script / 演示视频脚本

**Track**: Gemini Live Agent Challenge, Track 3: UI Navigator
**Duration**: ≤ 4 minutes
**Strategy**: 你先在 Landing Page 讲宏观（架构+数字），然后进平台让 AI 接管具体演示。
**Live URL**: https://auditai-frontend-342109712917.us-central1.run.app

---

## Pre-Recording Checklist / 录制前检查清单

- [ ] Chrome 打开 frontend URL，停在 Landing Page（不要进平台）
- [ ] 戴耳机，麦克风正常
- [ ] OBS: Window Capture + Audio Output Capture + Audio Input Capture
- [ ] 关闭无关标签和通知
- [ ] 先和 AI 对话一次预热 Cloud Run（进平台连一次再回来）
- [ ] 浏览器另一个标签打开 architecture-diagram.html

---

## Part 1: Landing Page 宏观介绍 (0:00 - 0:40)

**画面**: Landing Page，从上往下滚动

**你说**:
> "This is AuditAI — a voice-controlled audit platform built for the Gemini Live Agent Challenge, Track 3: UI Navigator."

**中文**: "这是 AuditAI — 为 Gemini Live Agent Challenge Track 3: UI Navigator 构建的语音控制审计平台。"

**滚到 "Navigate → Inspect → Report" 部分，你说**:
> "The core idea: an AI companion that navigates the entire application by voice — clicking buttons, reading screens, filtering data, generating reports — completely hands-free."

**中文**: "核心理念：一个 AI 伴侣，用语音导航整个应用 — 点击按钮、阅读屏幕、筛选数据、生成报告 — 完全免手动。"

**滚到 Domains 部分，你说**:
> "It works across 8 audit domains — energy, food safety, workplace safety, construction, environmental, fire safety, manufacturing, and facility management — backed by 55 international standards."

**中文**: "覆盖 8 个审计领域 — 能源、食品安全、职业安全、建筑、环境、消防、制造、设施管理 — 支持 55 项国际标准。"

**滚到 Architecture 部分，你说**:
> "Under the hood: Next.js frontend connects via WebSocket to a FastAPI backend on Google Cloud Run. Google ADK with Runner.run_live streams bidirectionally to Gemini 2.5 Flash Native Audio. 14 AI tools registered via function calling — when a tool like navigate_to fires, the result flows back through the WebSocket as a UI command and the browser executes it. All audit data — cases, findings, measures, reports, and the full audit trail — persists in Cloud Firestore across 9 collections."

**中文**: "底层架构：Next.js 前端通过 WebSocket 连接 Cloud Run 上的 FastAPI 后端。Google ADK 的 run_live 与 Gemini Native Audio 双向流式通信。14 个 AI 工具通过 function calling 注册 — 当 navigate_to 这样的工具触发时，结果通过 WebSocket 作为 UI 命令返回，浏览器执行。所有审计数据 — 案例、发现、措施、报告和完整审计轨迹 — 持久化在 Cloud Firestore 的 9 个集合中。"

**点击 "Enter Platform"**

---

## Part 2: 连接 AI + 自我介绍 (0:40 - 1:00)

**画面**: Dashboard 或 Cases 列表页

**你说**:
> "Now let me activate the AI companion and let it show you what it can do."

**中文**: "现在让我激活 AI 伴侣，让它自己展示能力。"

**点击 AI 按钮连接，对 AI 说**:
> 🎤 "Hey, briefly introduce yourself."

**预期**: AI 简短自我介绍（2-3 句）

---

## Part 3: Voice Navigation + Screen Reading (1:00 - 1:30)

**对 AI 说**:
> 🎤 "Take me to Case 1 overview."

**预期**: AI 调用 `navigate_to(page="overview", case_id="CASE-001")` → 浏览器跳转

**对 AI 说**:
> 🎤 "Give me a summary of this case."

**预期**: AI 调用 `read_summary(scope="case")` → 朗读公司信息、状态、发现数量

---

## Part 4: Navigate + Filter + Highlight (1:30 - 2:10)

**对 AI 说**:
> 🎤 "Go to the review page."

**预期**: AI 导航到 `/cases/CASE-001/review`

**对 AI 说**:
> 🎤 "Show me only the critical findings."

**预期**: AI 调用 `filter_findings(severity="critical")` → 描述实际结果

**对 AI 说**:
> 🎤 "Highlight the first one."

**预期**: AI 调用 `highlight_finding()` → 页面滚动 + 高亮动画

---

## Part 5: Regulation + Click Button (2:10 - 2:50)

**对 AI 说**:
> 🎤 "What does ISO 50001 say about energy performance indicators?"

**预期**: AI 调用 `show_regulation()` → 朗读标准条款

**对 AI 说**:
> 🎤 "Go to the report page and click Generate Report."

**预期**: AI 连锁 `navigate_to` → `click_element` → 报告开始生成

---

## Part 6: Field Mode (2:50 - 3:30)

**对 AI 说**:
> 🎤 "Go to the live audit page."

**预期**: 导航到 live-audit，摄像头激活

**对着摄像头（对准设备照片）说**:
> 🎤 "I'm looking at an HVAC unit, Carrier 30XA, rated 500 kilowatts. Condition is fair, some corrosion on pipes."

**预期**: AI 调用 `record_equipment()` → 新发现卡片出现

**对 AI 说**:
> 🎤 "Flag an issue. Pipe insulation is damaged, severity high."

**预期**: AI 调用 `flag_issue()` → 新问题卡片出现

---

## Part 7: Closing (3:30 - 3:50)

**你说**:
> "That's AuditAI — a voice-controlled audit platform with 14 AI tools, 8 domains, and 55 standards. Navigate, inspect, and report — all by voice. Built with Google ADK, Gemini Native Audio, and Cloud Firestore. Fully deployed on Google Cloud Run."

**中文**: "这就是 AuditAI — 14 个 AI 工具、8 个领域、55 项标准的语音控制审计平台。导航、检查、报告 — 全部语音完成。基于 Google ADK、Gemini Native Audio 和 Cloud Firestore。完全部署在 Google Cloud Run 上。"

---

## Backup Plans / 备用方案

| 情况 | 应对 |
|------|------|
| AI 响应慢 | 旁白填充："Cloud Run cold start, sub-second in production with min instances." |
| 语音识别错 | "Let me rephrase that" — 自然重说 |
| 导航失败 | 手动点击，"Let me show you directly." |
| 报告生成慢 | "Here's one generated earlier." |
