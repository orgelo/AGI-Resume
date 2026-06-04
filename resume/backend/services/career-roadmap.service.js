/**
 * Career Roadmap 服务
 * 分析用户当前能力与目标岗位的差距，生成 3/6/12 个月成长路线
 */
const { safeJsonParse, arkExtractMessageContent } = require('./analysis.service');

async function generateRoadmap({ resumeText, targetRole, targetCompany }, { arkPostJson, textModel }) {
  const prompt = [
    '你是一位资深职业规划师和技术专家。请分析以下简历和求职目标，生成一份详细的职业成长路线图。',
    '',
    '## 任务',
    '1. 分析候选人当前能力水平',
    '2. 识别与目标岗位的技能差距',
    '3. 生成 3个月、6个月、12个月 三个阶段的成长路线',
    '',
    '## 目标岗位',
    targetRole || '（未指定）',
    '',
    '## 目标公司',
    targetCompany || '（未指定）',
    '',
    '## 简历内容',
    resumeText || '（空）',
    '',
    '## 输出要求',
    '必须只输出JSON，格式如下：',
    '{',
    '  "currentLevel": "当前能力评估（1-2句话）",',
    '  "skillGaps": ["技能缺口1", "技能缺口2", "技能缺口3"],',
    '  "industryRequirements": ["行业要求1", "行业要求2"],',
    '  "roadmap": {',
    '    "threeMonth": {',
    '      "title": "3个月目标",',
    '      "milestones": [',
    '        { "name": "里程碑名称", "weeks": 2, "description": "具体描述" }',
    '      ],',
    '      "learning": ["学习内容1", "学习内容2"],',
    '      "projects": ["推荐项目1", "推荐项目2"],',
    '      "certifications": ["推荐证书1"],',
    '      "books": ["推荐书籍1", "推荐书籍2"],',
    '      "courses": ["推荐课程1"]',
    '    },',
    '    "sixMonth": {',
    '      "title": "6个月目标",',
    '      "milestones": [',
    '        { "name": "里程碑名称", "weeks": 3, "description": "具体描述" }',
    '      ],',
    '      "learning": ["学习内容1", "学习内容2"],',
    '      "projects": ["推荐项目1"],',
    '      "certifications": ["推荐证书1"],',
    '      "books": ["推荐书籍1"],',
    '      "courses": ["推荐课程1"]',
    '    },',
    '    "twelveMonth": {',
    '      "title": "12个月目标",',
    '      "milestones": [',
    '        { "name": "里程碑名称", "weeks": 4, "description": "具体描述" }',
    '      ],',
    '      "learning": ["学习内容1", "学习内容2"],',
    '      "projects": ["推荐项目1"],',
    '      "certifications": ["推荐证书1"],',
    '      "books": ["推荐书籍1"],',
    '      "courses": ["推荐课程1"]',
    '    }',
    '  },',
    '  "overallAdvice": "总体建议（2-3句话）"',
    '}',
  ].join('\n');

  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const respJson = await arkPostJson(url, {
    model: textModel,
    messages: [
      { role: 'system', content: '你只输出合法JSON，不要Markdown，不要多余文字。' },
      { role: 'user', content: prompt },
    ],
  });

  const raw = arkExtractMessageContent(respJson);
  const parsed = safeJsonParse(raw);

  if (parsed && parsed.roadmap) {
    return parsed;
  }

  return {
    currentLevel: '根据简历分析，您具备一定的基础开发能力，但需要在深度和广度上进一步提升。',
    skillGaps: ['系统设计能力', '性能优化经验', '团队协作与项目管理'],
    industryRequirements: ['熟练掌握主流技术栈', '具备项目从0到1的经验', '良好的工程化思维'],
    roadmap: {
      threeMonth: {
        title: '3个月：夯实基础，补齐短板',
        milestones: [
          { name: '核心技术深化', weeks: 4, description: '深入学习目标岗位核心技术栈，完成至少2个专项练习' },
          { name: '算法与数据结构', weeks: 4, description: '系统刷题，达到中等难度水平' },
          { name: '项目实战', weeks: 4, description: '完成一个完整的个人项目，覆盖前后端' },
        ],
        learning: ['目标岗位核心技术栈', '常用设计模式', 'Git 高级用法'],
        projects: ['个人博客/作品集网站', '开源项目贡献'],
        certifications: [],
        books: ['《代码整洁之道》', '《重构：改善既有代码的设计》'],
        courses: ['极客时间/慕课网相关专栏'],
      },
      sixMonth: {
        title: '6个月：进阶提升，系统化学习',
        milestones: [
          { name: '系统设计能力', weeks: 6, description: '学习分布式系统基础，完成系统设计练习' },
          { name: '性能优化', weeks: 6, description: '学习性能分析与优化方法论' },
          { name: '深度项目', weeks: 6, description: '主导或参与一个中等复杂度项目' },
        ],
        learning: ['分布式系统基础', '数据库优化', 'CI/CD 流程'],
        projects: ['仿大型项目功能模块', '技术博客持续输出'],
        certifications: ['AWS/Azure 云认证', '相关技术认证'],
        books: ['《设计数据密集型应用》', '《程序员修炼之道》'],
        courses: ['系统设计面试课程', '云原生技术课程'],
      },
      twelveMonth: {
        title: '12个月：全面突破，达到目标岗位要求',
        milestones: [
          { name: '架构能力', weeks: 8, description: '掌握架构设计方法论，能够独立完成技术方案设计' },
          { name: '技术影响力', weeks: 8, description: '在团队/社区建立技术影响力' },
          { name: '面试冲刺', weeks: 8, description: '针对性准备目标公司面试' },
        ],
        learning: ['架构设计模式', '技术管理基础', '业务理解能力'],
        projects: ['主导一个开源项目', '技术分享/演讲'],
        certifications: ['高级技术认证'],
        books: ['《架构整洁之道》', '《人月神话》'],
        courses: ['技术管理课程', '目标公司面试专项课程'],
      },
    },
    overallAdvice: '建议按照3-6-12个月的节奏稳步推进，每个阶段聚焦1-2个核心目标，避免贪多嚼不烂。',
  };
}

module.exports = { generateRoadmap };