# ResumeMind Frontend

ResumeMind 前端项目 — 基于 Angular 21 的智能简历教练平台。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Angular | 21.2.0 | 前端框架 |
| TypeScript | 5.9.2 | 开发语言 |
| SCSS | — | 样式预处理 |
| RxJS | 7.8 | 响应式编程 |
| Compodoc | 1.2.1 | 文档生成 |

## 开发启动

```bash
npm install
npm start
```

服务将运行在 `http://localhost:4200/`，并自动打开浏览器。

## 项目结构

```
src/
├── app/
│   ├── core/              # 核心模块（服务、模型）
│   │   ├── services/
│   │   │   └── resume-api.service.ts
│   │   └── models/
│   │       ├── analysis.model.ts
│   │       ├── interview.model.ts
│   │       └── dashboard.model.ts
│   ├── features/          # 功能页面
│   │   ├── analyze/       # 竞争力分析首页
│   │   ├── interview/     # 模拟面试
│   │   ├── career-roadmap/# 职业路线
│   │   ├── tailor/        # 简历精修
│   │   ├── dashboard/     # 数据看板
│   │   ├── history/       # 历史记录列表
│   │   └── page-history-detail/  # 记录详情
│   ├── shared/            # 共享组件
│   │   ├── components/
│   │   │   ├── result-panel/     # 分析结果面板
│   │   │   └── result-card/      # 结果卡片
│   │   └── pipes/
│   │       ├── truncate.pipe.ts
│   │       ├── score-color.pipe.ts
│   │       └── keyword-count.pipe.ts
│   └── app.config.ts      # 应用配置
├── environments/          # 环境配置
├── styles.scss            # 全局样式
└── index.html
```

## 核心页面

| 页面 | 路由 | 说明 |
|------|------|------|
| AnalyzePage | `/` | 首页，文件上传 + AI 分析 |
| InterviewPage | `/interview` | AI 模拟面试 |
| CareerRoadmapPage | `/career-roadmap` | 职业发展规划 |
| TailorPage | `/tailor` | 简历精修 |
| DashboardPage | `/dashboard` | 数据看板 |
| HistoryPage | `/history` | 分析历史 |
| PageHistoryDetail | `/history/:id` | 历史详情 |

## 构建

```bash
# 开发构建
ng build --configuration development

# 生产构建
ng build --configuration production
```

## 文档生成 (Compodoc)

```bash
npx compodoc -d dist/docs -p tsconfig.doc.json -s -w --language zh-CN
```

文档将生成在 `dist/docs` 目录，通过 `http://localhost:8080` 访问。

## 后端依赖

前端需要后端服务运行在 `http://localhost:3000`，详见 [后端 README](../backend/README.md)。
