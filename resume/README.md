# ResumeMind — 智能简历教练

基于 Angular 前端 + Node 微服务 + SQLite 的简历分析平台。

## 功能页面

| 路由 | 说明 |
|------|------|
| `/analyze` | 上传 PDF/DOCX 简历，结合岗位描述进行智能分析 |
| `/history` | 分析历史列表（数据持久化存储） |
| `/history/:id` | 查看单次分析详情 |
| `/dashboard` | 数据看板（累计分析次数、平均得分、近期统计） |

## 快速启动

### 后端

```powershell
cd e:\AGI\resume\backend
npm.cmd install
# 配置 .env：ARK_API_KEY=你的密钥
npm.cmd run dev
```

**若 nodemon 报 `app crashed` 且提示端口占用：** 说明 3000 端口已有旧进程，先结束再启动：

```powershell
netstat -ano | findstr :3000
taskkill /PID 这里填PID /F
npm.cmd run dev
```

PDF 扫描件需安装 [Poppler](https://poppler.freedesktop.org/)（`pdftoppm` 在 PATH 中）。

### 前端

```powershell
cd e:\AGI\resume\frontend
npm.cmd start
```

**说明：** 命令执行后终端会一直运行（不是卡死）。看到 `Local: http://localhost:4200/` 后，在浏览器打开该地址；已配置 `--open` 会自动弹出浏览器。

若页面空白，等终端出现 `√ Building...` 完成后再刷新。

## 技术架构

- **前端框架**: Angular 17 + TypeScript
- **后端服务**: Node.js + Express
- **数据库**: SQLite（关系型数据存储）
- **AI 服务**: 火山引擎 Ark API（DeepSeek 模型）

## 核心功能

- 简历文本提取（支持 DOCX 和 PDF）
- 岗位匹配度分析
- 简历结构诊断
- 优化建议生成
- 分析历史管理