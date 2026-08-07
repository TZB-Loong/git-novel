import { describe, it, expect } from 'vitest';
import { notesSchema, resumeSchema, generateId } from './config';

describe('notesSchema', () => {
  it('accepts note with cover', () => {
    const r = notesSchema.safeParse({
      title: 'Note',
      pubDate: new Date('2024-03-15'),
      cover: 'notes/sample.jpg',
    });
    expect(r.success).toBe(true);
  });

  it('accepts note without cover', () => {
    const r = notesSchema.safeParse({
      title: 'Note',
      pubDate: new Date('2024-03-15'),
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing title', () => {
    const r = notesSchema.safeParse({ pubDate: new Date('2024-03-15') });
    expect(r.success).toBe(false);
  });
});

describe('resumeSchema', () => {
  const fullResume = {
    name: '李诗苹',
    tagline: '采购 / 生产计划(PMC)专员 · 4 年供应链经验',
    emailUser: '1932299702',
    emailDomain: 'qq.com',
    objective: '采购专员 / PMC 生产计划专员 / 供应链专员',
    summary: '4 年制造业供应链实战经验。',
    strengths: [{ title: '复合型供应链背景', detail: '全链路覆盖。' }],
    skills: [{ name: '数据分析', detail: 'Excel / Power Query / Power BI' }],
    experience: [
      {
        company: '贝肽斯集团',
        period: '2025.02 – 至今',
        role: '生产计划专员(PMC)',
        points: ['产能规划:统筹 6 家工厂产能排产。'],
      },
    ],
    education: {
      school: '江西科技师范大学理工学院',
      period: '2018.09 – 2022.07',
      degree: '财务管理(本科)',
      major: '主修:财务管理、经济法、税法、会计学',
    },
    certificates: ['初级会计职称证书'],
  };

  it('accepts a complete resume entry', () => {
    const r = resumeSchema.safeParse(fullResume);
    expect(r.success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...withoutName } = fullResume;
    const r = resumeSchema.safeParse(withoutName);
    expect(r.success).toBe(false);
  });

  it('rejects experience without points array', () => {
    const bad = {
      ...fullResume,
      experience: [{ company: '某公司', period: '2020', role: '专员' }],
    };
    const r = resumeSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('accepts a resume with optional frontend fields (projects, industry)', () => {
    const r = resumeSchema.safeParse({
      name: '徐全龙',
      tagline: '前端开发 · 8 年经验',
      emailUser: 'xu1490344098',
      emailDomain: '163.com',
      objective: '前端开发',
      experience: [
        {
          company: '华勤技术',
          period: '2022.5-2025.12',
          role: '前端开发',
          industry: '电子设备制造',
          summary: '负责部门 MAS 生态系统架构设计。',
          points: ['架构升级与工程化建设。'],
        },
      ],
      projects: [
        {
          name: '企业级多端通用前端底座',
          period: '2022.5-2023.4',
          role: '核心架构师',
          sections: [
            {
              title: '项目背景',
              points: ['部门内 10+ 业务系统技术栈混乱。'],
            },
          ],
        },
      ],
      education: {
        school: '江西理工大学',
        period: '2013.7-2017.9',
        degree: '软件开发',
      },
      skills: [{ name: '核心框架与语言', detail: '精通 JavaScript (ES6+)。' }],
    });
    expect(r.success).toBe(true);
  });
});

describe('generateId', () => {
  it('converts entry name to a URL-safe slug', () => {
    expect(generateId({ entry: 'hello.md' })).toBe('hello');
  });

  it('strips .mdx extension', () => {
    expect(generateId({ entry: 'my-post.mdx' })).toBe('my-post');
  });

  it('converts Chinese filenames to pinyin slug', () => {
    expect(generateId({ entry: '你好.md' })).toBe('ni-hao');
  });
});
