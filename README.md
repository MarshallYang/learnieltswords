# 雅思词汇训练 · Learn IELTS Words

面向冲刺 IELTS Band 7-8 的中文学习者本地词汇训练器：约 7500 个核心/学术词，基于简化 SM-2 间隔重复，进度保存在浏览器，纯前端（适合 Cloudflare Pages 静态部署）。

目标仓库：https://github.com/MarshallYang/learnieltswords

## 技术栈

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- 完全客户端运行（含 Web Speech API 朗读，无需音频托管）

## 快速开始

```bash
cd learnieltswords
bun install
bun run dev
bun run build
bun run preview
```

也可用 Node 包管理器安装依赖后执行同样的 script 名称。

## 功能

| 模块 | 说明 |
|------|------|
| 今日学习 | 先到期复习，再学新词；默认可调每日新词 10/15/20/30/**40/50/60/70** |
| 单词本 | 搜索、按分层/学习状态筛选；点开可看雅思例句；支持朗读 |
| 统计 | 掌握度、今日评分分布、近两周归档 |
| 设置 | 新词量、浅色/深色/跟随系统、重置进度 |
| 引导页 | 三条学习要点后开始背单词 |
| 朗读 | 学习卡与单词本旁的喇叭按钮，使用浏览器 `speechSynthesis`（en-US/en-GB） |

键盘：空格显示释义；数字 1-4 对应 忘记/困难/认识/简单。

## 学习逻辑（SM-2 简化）

卡片状态：new -> learning -> review -> mastered。

| 评分 | 行为概要 |
|------|----------|
| 1 忘记 | 重置 repetitions，约 10 分钟后再看，ease 下降 |
| 2 困难 | 较短间隔，ease 略降 |
| 3 认识 | 正常 SM-2 增长 |
| 4 简单 | 更长间隔，ease 上升 |

当 interval 达到 21 天且 repetitions 达到 5 时标记为已掌握。连续打卡按自然日计算。

## 词库数据 Schema

文件：src/data/words.json

```ts
type Tier = "foundation" | "core" | "advanced"

interface Word {
  id: number
  word: string
  phonetic?: string
  meaningZh: string
  pos?: string
  exampleEn?: string
  audioUrl?: string // optional remote pronunciation
  tier: Tier
}
```

- foundation 约 Band 5-6
- core 约 6.5-7
- advanced 约 7-8

词库已统一校对为 **IELTS 考试向中文释义**（精简主义项）与 **雅思学术例句**（阅读/写作/讲座语气）。可用脚本再生成：

```bash
bun run enrich:words   # 或 node scripts/enrich-ielts-examples.mjs
bun run build:words    # 从源表重建（scripts/build-words.mjs）
```

数据来源：qwerty-learner 雅思相关词表、LynnShaw vocabulary_for_ielts、CET-6、TOEFL 公开列表（去重合并）。

## 进度存储

浏览器本地键名：learnieltswords:v1。设置页可重置进度。

## 声明

词库来自公开学习列表，非剑桥官方词表，仅供个人备考。
