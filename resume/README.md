# ResumeMind — 智能简历教练

基于 Angular 前端 + Node 微服务 + SQLite 的简历分析平台，集成 DeepSeek AI 提供简历竞争力分析、模拟面试、职业路线规划、简历精修等功能。

## 功能特性

| 功能模块 | 路由 | 说明 |
|----------|------|------|
| 竞争力分析 | `/analyze` | 上传 PDF/DOCX 简历，结合岗位描述进行智能分析 |
| 模拟面试 | `/interview` | AI 面试官实时追问，技术/项目/行为三轮全覆盖 |
| 职业路线 | `/career-roadmap` | 个性化技能规划与成长路径 |
| 简历精修 | `/tailor` | AI 改写优化，Before/After 对比，版本管理 |
| 数据看板 | `/dashboard` | 投递追踪、分数趋势、转化漏斗 |
| 历史记录 | `/history` | 分析历史列表（数据持久化存储） |
| 记录详情 | `/history/:id` | 查看单次分析详情 |

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      ResumeMind                             │
├────────────────────┬────────────────────────────────────────┤
│    前端 (Angular)   │          后端 (Node.js)                 │
│  ┌──────────────┐  │  ┌──────────────┐  ┌────────────────┐  │
│  │ AnalyzePage  │  │  │ Express API  │  │ DeepSeek AI    │  │
│  │ InterviewPage│  │  │ - /api/analy│  │ (火山引擎 Ark)  │  │
│  │ DashboardPage│──┼─→│ - /api/inter│──┼─→               │  │
│  │ HistoryPage  │  │  │ - /api/caree│  │                │  │
│  │ ResultPanel  │  │  │ - /api/tailo│  │                │  │
│  │ ResultCard   │  │  │ - /api/dashb│  │                │  │
│  └──────────────┘  │  └──────────────┘  └────────────────┘  │
│                    │  ┌──────────────┐                       │
│  ResumeApiService  │  │ SQLite 数据库 │                       │
│  - analyze()       │  │ - 分析记录   │                       │
│  - interviewChat() │  │ - 面试历史   │                       │
│  - getDashboard()  │  │ - 统计数据   │                       │
│                    │  └──────────────┘                       │
└────────────────────┴────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Angular | 21.2.0 |
| **前端语言** | TypeScript | 5.9.2 |
| **构建工具** | Angular CLI | 21.2.4 |
| **样式** | SCSS + CSS 变量 | — |
| **后端框架** | Express | 5.2.1 |
| **数据库** | SQLite (better-sqlite3) | 11.10.0 |
| **AI 服务** | 火山引擎 Ark API | DeepSeek 模型 |
| **文档生成** | @compodoc/compodoc | 1.2.1 |
| **PDF 处理** | pdf-parse / pdf2pic / pdftoppm | — |
| **DOCX 处理** | mammoth / docx | — |

## 项目结构

```
resume/
├── frontend/                  # Angular 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # 核心模块（服务、模型）
│   │   │   │   ├── services/
│   │   │   │   │   └── resume-api.service.ts
│   │   │   │   └── models/
│   │   │   ├── features/     # 功能页面
│   │   │   │   ├── analyze/
│   │   │   │   ├── interview/
│   │   │   │   ├── career-roadmap/
│   │   │   │   ├── tailor/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── history/
│   │   │   │   └── page-history-detail/
│   │   │   └── shared/       # 共享组件（管道）
│   │   └── environments/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
├── backend/                   # Node.js 后端
│   ├── server.js             # Express 主服务
│   ├── routes/               # API 路由
│   ├── services/             # 业务逻辑
│   ├── db/                   # 数据库相关
│   │   ├── database.js       # 连接与初始化
│   │   └── schema.sql        # 表结构
│   ├── uploads/              # 上传文件临时目录
│   └── .env                  # 环境变量
└── README.md
```

## 快速启动

### 环境要求

- Node.js >= 20
- npm >= 11
- Git
- (可选) Poppler（PDF 扫描件处理，`pdftoppm` 需在 PATH 中）

### 后端启动

```powershell
cd e:\AGI\resume\backend
npm install
# 创建 .env 文件，填入以下内容：
# ARK_API_KEY=你的火山引擎API密钥
npm run dev
```

**端口占用处理：**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm run dev
```

### 前端启动

```powershell
cd e:\AGI\resume\frontend
npm install
npm start
```

浏览器将自动打开 `http://localhost:4200/`。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analyze` | 上传简历分析 |
| POST | `/api/interview/start` | 启动面试会话 |
| POST | `/api/interview/chat` | 面试对话 |
| POST | `/api/career-roadmap` | 生成职业路线 |
| POST | `/api/tailor` | 精修简历 |
| POST | `/api/dashboard/add` | 添加投递记录 |
| GET  | `/api/dashboard` | 获取看板数据 |
| GET  | `/api/history` | 获取分析历史列表 |
| GET  | `/api/history/:id` | 获取单次分析详情 |
| GET  | `/health` | 健康检查 |

## 文档生成

### 前端 API 文档 (Compodoc)

```bash
cd frontend
npx compodoc -d dist/docs -p tsconfig.doc.json -s -w --language zh-CN
```

### Git 代码统计 (gitstats)

```bash
python gitstats.py ../resume/ ./gitstats-result
```

## 核心功能说明

- **简历文本提取**：支持 DOCX 和 PDF 格式，PDF 扫描件自动 OCR
- **岗位匹配度分析**：AI 对比简历与 JD，输出五维度评分
- **简历结构诊断**：完整性、表达质量、量化程度、ATS 兼容性
- **优化建议生成**：针对性的改进建议和关键词补充
- **分析历史管理**：SQLite 持久化存储，支持分页查询

## 开发团队

| 姓名 | 学号 | 负责模块 |
|------|------|----------|
| (待填写) | (待填写) | 前端页面开发 |
| (待填写) | (待填写) | 后端 API 开发 |
| (待填写) | (待填写) | AI 提示词设计 |

## 许可证

ISC
