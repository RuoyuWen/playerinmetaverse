/**
 * Survey i18n — zh / en strings, questions, tasks, AI prompts.
 */
(function () {
  'use strict';

  const OPT = { NONE: 'none', OTHER: 'other' };

  const STR = {
    zh: {
      pageTitle: 'AI 辅助决策调查',
      headerTitle: 'AI 辅助决策行为调查',
      langSwitch: 'EN',
      progress: ['开始', '基本信息', 'AI 使用', '实操任务', '完成'],
      welcomeLabel: 'AI 辅助决策行为调查',
      welcomeTitle: '欢迎参与本次匿名问卷',
      welcomeDesc:
        '本研究关注年轻群体（学生）如何使用 AI 辅助日常决策。问卷约需 20–25 分钟，包含基本信息、AI 使用习惯，以及三个真实的 AI 实操决策任务。',
      privacyNote:
        '<strong>隐私声明：</strong>本问卷完全匿名，不收集姓名、学号或任何可识别身份的信息。数据仅用于学术研究，不会对外公开个体回答。',
      btnStart: '开始填写 →',
      part1Label: '第一部分 · 基本信息',
      part1Title: '关于你',
      part1Error: '请完成所有必答题。',
      part2Label: '第二部分 · AI 使用情况',
      part2Title: '你如何使用 AI',
      part2Error: '请完成所有必答题。',
      part3Label: '第三部分 · 实操任务',
      part3Title: '两种 AI，两种用法',
      part3Desc: '接下来你会完成<strong>三个决策任务</strong>，每个任务都用下面两种 AI 模式。请先了解它们的区别：',
      conceptChatTitle: 'A. 对话式 AI（Copilot）',
      conceptChatDesc: '像 ChatGPT 网页版、Claude、豆包——你和它来回聊、追问、让它帮你分析利弊。',
      conceptSearchTitle: 'B. AI 搜索',
      conceptSearchDesc: '像 Perplexity、秘塔、夸克 AI——你输入一个问题，它快速给你带来源的答案摘要。',
      btnStartTask: '开始第一个任务 →',
      taskLabel: '你的任务',
      taskN: '任务',
      chatTitle: '对话式 AI',
      chatSub: '来回对话 · 可追问 · 帮你权衡',
      chatInputPh: '输入问题，回车发送…',
      chatSend: '发送',
      searchTitle: 'AI 搜索',
      searchSub: '一问一答 · 带来源 · 快速摘要',
      searchInputPh: '搜索一个问题，回车…',
      searchBtn: '搜索',
      postTaskTitle: '用完之后，告诉我们：',
      preferredQ: '1. 这次任务里，你觉得哪个工具更帮到你？',
      trustChatQ: '2. 你对「对话式 AI」回答的信任度？（1 完全不信 — 5 完全信任）',
      trustSearchQ: '3. 你对「AI 搜索」回答的信任度？（1 完全不信 — 5 完全信任）',
      trustLow: '完全不信',
      trustHigh: '完全信任',
      reasonQ: '5. 为什么这么选？（说说哪个工具帮你想清楚了）',
      part3Error: '请完成以上所有问题后再提交。',
      btnNextTask: '完成此项，继续下一项 →',
      btnSubmitAll: '提交全部问卷 ✓',
      completeLabel: '感谢参与',
      completeTitle: '问卷已完成 ✓',
      entriesTitle: '输入内容明细（研究分析用）',
      btnDownload: '↓ 下载本次数据 (JSON)',
      btnBack: '← 返回',
      btnNext: '下一步 →',
      otherPh: '如选「其他」，请说明…',
      chatTurns: '轮',
      searchTimes: '次',
      thinking: '思考中…（首次约 15–30 秒，请稍候）',
      searching: '检索中…（首次约 15–30 秒，请稍候）',
      demoChat: '（演示模式：输入已记录，请继续填写下方问题。）',
      demoSearch: '（演示模式：搜索词已记录，请继续填写下方问题。）',
      noReply: '（无回复）',
      uploadOk: '✓ 数据已上传至研究后端',
      uploadFail: '⚠ 自动上传失败，请用下方按钮下载并发给研究者',
      uploadLocal: '（未连接后端，当前为本地模式——请下载数据）',
      summarySession: '会话 ID',
      summaryLocale: '填写语言',
      summaryTaskCount: '完成任务数',
      summaryPart3Time: '第三部分总耗时',
      summarySeconds: '秒',
      summaryFirstUsed: '首次选用',
      summaryChatTurns: '对话轮次',
      summarySearchCount: '搜索次数',
      summaryDuration: '耗时',
      summaryPreferred: '更偏好',
      summaryTrustChat: '对话式 AI 信任度',
      summaryTrustSearch: 'AI 搜索信任度',
      summaryDecision: '最终决定',
      summaryReason: '理由',
      toolChat: '对话式 AI',
      toolSearch: 'AI 搜索',
      toolChatShort: '对话',
      toolSearchShort: '搜索',
      dash: '—',
      apiBackendErr: '无法连接研究后端（HTTP {status}）。请确认 Render 服务在线且 BACKEND_URL 正确。',
      apiKeyErr: '后端已连接，但 AI Key 尚未配置。请在 Render 添加 RELAY_API_KEY。',
      apiConnectErr: '无法连接研究后端。请检查 survey/config.js 中的 BACKEND_URL。',
      apiDemo: 'AI 服务暂未配置。第三部分将以演示模式运行，输入仍会被记录。',
      errNetwork: '（网络错误：请用 https://playerinmetaverse.tech/survey/ 打开；首次请求需等待 15–30 秒）',
      errRelay: '（AI 中转出错：{msg}…请稍后重试）',
      errGeneric: '（请求出错了：{msg}）',
      searchSystem:
        '你是一个 AI 搜索引擎，特点是：一次性给出简洁、客观、带信息来源的答案摘要，不与用户多轮对话。用中文。',
      searchUserPrefix:
        '请像 AI 搜索引擎那样，针对以下问题给出一段简洁的答案摘要，并在结尾用【参考来源】列出 3 个看起来可信的信息来源名称（如媒体/评测站/官网，无需真实链接）。问题：',
    },
    en: {
      pageTitle: 'AI-Assisted Decision Survey',
      headerTitle: 'AI-Assisted Decision Behavior Survey',
      langSwitch: '中文',
      progress: ['Start', 'Basics', 'AI Use', 'Tasks', 'Done'],
      welcomeLabel: 'AI-Assisted Decision Survey',
      welcomeTitle: 'Welcome to this anonymous survey',
      welcomeDesc:
        'This study explores how students use AI for everyday decisions. The survey takes about 20–25 minutes and includes background questions, AI usage habits, and three hands-on decision tasks with AI tools.',
      privacyNote:
        '<strong>Privacy:</strong> This survey is fully anonymous. We do not collect names, student IDs, or any identifying information. Data is used for academic research only.',
      btnStart: 'Begin →',
      part1Label: 'Part 1 · Background',
      part1Title: 'About you',
      part1Error: 'Please answer all required questions.',
      part2Label: 'Part 2 · AI usage',
      part2Title: 'How you use AI',
      part2Error: 'Please answer all required questions.',
      part3Label: 'Part 3 · Hands-on tasks',
      part3Title: 'Two kinds of AI',
      part3Desc:
        'You will complete <strong>three decision tasks</strong>. Each uses the two AI modes below. First, understand the difference:',
      conceptChatTitle: 'A. Conversational AI (Copilot)',
      conceptChatDesc:
        'Like ChatGPT, Claude, or Doubao — you chat back and forth, ask follow-ups, and weigh pros and cons together.',
      conceptSearchTitle: 'B. AI Search',
      conceptSearchDesc:
        'Like Perplexity or Metaso — you ask one question and get a concise, source-backed summary.',
      btnStartTask: 'Start first task →',
      taskLabel: 'Your task',
      taskN: 'Task',
      chatTitle: 'Conversational AI',
      chatSub: 'Multi-turn · Follow-ups · Trade-offs',
      chatInputPh: 'Type a question, press Enter…',
      chatSend: 'Send',
      searchTitle: 'AI Search',
      searchSub: 'One-shot · Sources · Quick summary',
      searchInputPh: 'Search a question, press Enter…',
      searchBtn: 'Search',
      postTaskTitle: 'After using both tools, tell us:',
      preferredQ: '1. Which tool helped you more in this task?',
      trustChatQ: '2. How much do you trust the conversational AI responses? (1 = not at all — 5 = completely)',
      trustSearchQ: '3. How much do you trust the AI search responses? (1 = not at all — 5 = completely)',
      trustLow: 'Not at all',
      trustHigh: 'Completely',
      reasonQ: '5. Why did you choose that? (Which tool helped you think it through?)',
      part3Error: 'Please complete all questions before continuing.',
      btnNextTask: 'Finish & next task →',
      btnSubmitAll: 'Submit survey ✓',
      completeLabel: 'Thank you',
      completeTitle: 'Survey complete ✓',
      entriesTitle: 'Input log (for analysis)',
      btnDownload: '↓ Download data (JSON)',
      btnBack: '← Back',
      btnNext: 'Next →',
      otherPh: 'If you chose Other, please specify…',
      chatTurns: 'turns',
      searchTimes: 'searches',
      thinking: 'Thinking… (first request may take 15–30 s)',
      searching: 'Searching… (first request may take 15–30 s)',
      demoChat: '(Demo mode: input recorded. Please complete the questions below.)',
      demoSearch: '(Demo mode: query recorded. Please complete the questions below.)',
      noReply: '(No response)',
      uploadOk: '✓ Data uploaded to research server',
      uploadFail: '⚠ Upload failed — please download and send to the researcher',
      uploadLocal: '(Offline mode — please download your data)',
      summarySession: 'Session ID',
      summaryLocale: 'Language',
      summaryTaskCount: 'Tasks completed',
      summaryPart3Time: 'Part 3 total time',
      summarySeconds: 's',
      summaryFirstUsed: 'First tool used',
      summaryChatTurns: 'Chat turns',
      summarySearchCount: 'Search queries',
      summaryDuration: 'Duration',
      summaryPreferred: 'Preferred tool',
      summaryTrustChat: 'Trust in conversational AI',
      summaryTrustSearch: 'Trust in AI search',
      summaryDecision: 'Final decision',
      summaryReason: 'Reason',
      toolChat: 'Conversational AI',
      toolSearch: 'AI Search',
      toolChatShort: 'Chat',
      toolSearchShort: 'Search',
      dash: '—',
      apiBackendErr: 'Cannot reach backend (HTTP {status}). Check Render and BACKEND_URL.',
      apiKeyErr: 'Backend connected but AI key not set. Add RELAY_API_KEY on Render.',
      apiConnectErr: 'Cannot reach backend. Check BACKEND_URL in survey/config.js.',
      apiDemo: 'AI not configured. Part 3 runs in demo mode; inputs are still logged.',
      errNetwork:
        '(Network error: use https://playerinmetaverse.tech/survey/ ; first request may take 15–30 s)',
      errRelay: '(Relay error: {msg}… please retry)',
      errGeneric: '(Request failed: {msg})',
      searchSystem:
        'You are an AI search engine: give a concise, objective summary with sources in one response — no multi-turn chat. Respond in English.',
      searchUserPrefix:
        'As an AI search engine, give a concise answer summary with 【Sources】 listing 3 plausible source names (no URLs needed). Question: ',
    },
  };

  const PREFERRED = [
    { value: 'strong_chat', zh: '明显是对话式 AI', en: 'Clearly conversational AI' },
    { value: 'lean_chat', zh: '偏对话式', en: 'Somewhat conversational' },
    { value: 'same', zh: '差不多', en: 'About the same' },
    { value: 'lean_search', zh: '偏 AI 搜索', en: 'Somewhat search' },
    { value: 'strong_search', zh: '明显是 AI 搜索', en: 'Clearly AI search' },
  ];

  function part1Data(lang) {
    const L = lang === 'en';
    return [
      {
        id: 'age',
        label: L ? '1. Your age range?' : '1. 你的年龄段是？',
        type: 'radio',
        options: [
          { value: 'under18', zh: '18 岁以下', en: 'Under 18' },
          { value: '18-22', zh: '18–22', en: '18–22' },
          { value: '23-26', zh: '23–26', en: '23–26' },
          { value: '27-30', zh: '27–30', en: '27–30' },
          { value: 'over30', zh: '30 岁以上', en: 'Over 30' },
        ],
      },
      {
        id: 'identity',
        label: L ? '2. Your current status?' : '2. 你目前的身份是？',
        type: 'radio',
        options: [
          { value: 'undergrad', zh: '本科在读', en: 'Undergraduate' },
          { value: 'grad', zh: '研究生在读', en: 'Graduate student' },
          { value: 'recent_grad', zh: '刚毕业（3 年内）', en: 'Recent graduate (within 3 years)' },
          { value: 'other', zh: '其他', en: 'Other' },
        ],
      },
      {
        id: 'major',
        label: L ? '3. Your field of study?' : '3. 你的专业大类是？',
        type: 'radio',
        options: [
          { value: 'stem', zh: '理工', en: 'STEM' },
          { value: 'humanities', zh: '人文社科', en: 'Humanities & social sciences' },
          { value: 'business', zh: '商科经管', en: 'Business & economics' },
          { value: 'medicine', zh: '医学', en: 'Medicine' },
          { value: 'arts', zh: '艺术设计', en: 'Arts & design' },
          { value: 'other', zh: '其他', en: 'Other' },
        ],
      },
      {
        id: 'techAdoption',
        label: L ? '4. How do you adopt new technology?' : '4. 你对新科技的接受程度？',
        type: 'radio',
        options: [
          { value: 'early', zh: '总是第一批尝鲜', en: 'Always an early adopter' },
          { value: 'willing', zh: '比较愿意试', en: 'Usually willing to try' },
          { value: 'wait', zh: '看大家用了再用', en: 'Wait until others use it' },
          { value: 'reluctant', zh: '不太爱折腾', en: 'Prefer not to tinker' },
        ],
      },
    ];
  }

  function part2Data(lang) {
    const L = lang === 'en';
    return [
      {
        id: 'toolsUsed',
        label: L ? '5. Which AI tools have you used? (multi-select)' : '5. 你用过哪些 AI 工具？（可多选）',
        type: 'checkbox',
        hasOther: true,
        options: [
          { value: 'chatgpt', zh: 'ChatGPT', en: 'ChatGPT' },
          { value: 'claude', zh: 'Claude', en: 'Claude' },
          { value: 'gemini', zh: 'Gemini', en: 'Gemini' },
          { value: 'doubao', zh: '豆包', en: 'Doubao' },
          { value: 'kimi', zh: 'Kimi', en: 'Kimi' },
          { value: 'ernie', zh: '文心一言', en: 'ERNIE Bot' },
          { value: 'deepseek', zh: 'DeepSeek', en: 'DeepSeek' },
          { value: 'perplexity', zh: 'Perplexity', en: 'Perplexity' },
          { value: 'metaso', zh: '秘塔搜索', en: 'Metaso' },
          { value: 'quark', zh: '夸克 AI', en: 'Quark AI' },
          { value: 'bing', zh: '必应 AI', en: 'Bing AI' },
          { value: OPT.OTHER, zh: '其他', en: 'Other' },
          { value: OPT.NONE, zh: '都没用过', en: 'None of these' },
        ],
      },
      {
        id: 'frequency',
        label: L ? '6. Overall usage frequency?' : '6. 总体使用频率？',
        type: 'radio',
        options: [
          { value: 'many_daily', zh: '每天好几次', en: 'Several times a day' },
          { value: 'daily', zh: '基本每天', en: 'Daily' },
          { value: 'weekly', zh: '每周几次', en: 'A few times a week' },
          { value: 'occasional', zh: '偶尔', en: 'Occasionally' },
          { value: 'rarely', zh: '几乎不用', en: 'Rarely' },
        ],
      },
      {
        id: 'tenure',
        label: L ? '7. How long have you used AI tools?' : '7. 你使用 AI 工具有多久了？',
        type: 'radio',
        options: [
          { value: 'lt3m', zh: '不到 3 个月', en: 'Less than 3 months' },
          { value: '3-6m', zh: '3–6 个月', en: '3–6 months' },
          { value: '6-12m', zh: '半年到一年', en: '6 months to 1 year' },
          { value: '1-2y', zh: '1–2 年', en: '1–2 years' },
          { value: 'gt2y', zh: '2 年以上', en: 'Over 2 years' },
        ],
      },
      {
        id: 'devices',
        label: L ? '8. Where do you mainly use AI? (multi-select)' : '8. 你主要在哪使用 AI？（可多选）',
        type: 'checkbox',
        options: [
          { value: 'mobile', zh: '手机 App', en: 'Mobile app' },
          { value: 'web', zh: '电脑网页', en: 'Desktop web' },
          { value: 'extension', zh: '浏览器插件', en: 'Browser extension' },
          { value: 'wechat', zh: '微信小程序', en: 'WeChat mini program' },
          { value: 'voice', zh: '语音助手', en: 'Voice assistant' },
        ],
      },
      {
        id: 'useCases',
        label: L ? '9. What do you mainly use AI for? (multi-select)' : '9. 你主要用 AI 做什么？（可多选）',
        type: 'checkbox',
        hasOther: true,
        options: [
          { value: 'homework', zh: '写作业论文', en: 'Homework & papers' },
          { value: 'research', zh: '查资料', en: 'Research' },
          { value: 'coding', zh: '写代码', en: 'Coding' },
          { value: 'decisions', zh: '做生活决定', en: 'Life decisions' },
          { value: 'planning', zh: '规划安排', en: 'Planning' },
          { value: 'emotional', zh: '情感倾诉', en: 'Emotional support' },
          { value: 'entertainment', zh: '闲聊娱乐', en: 'Chat & fun' },
          { value: OPT.OTHER, zh: '其他', en: 'Other' },
        ],
      },
      {
        id: 'trust',
        label: L
          ? '10. Trust in AI advice? (1 = not at all — 5 = completely)'
          : '10. 你对 AI 建议的信任度？（1 完全不信 — 5 完全信任）',
        type: 'scale',
        options: ['1', '2', '3', '4', '5'].map((v) => ({ value: v, zh: v, en: v })),
      },
      {
        id: 'changedDecisions',
        label: L
          ? '11. Times you changed a decision because of AI in the past month?'
          : '11. 过去一个月，你因 AI 建议而改变决定的次数？',
        type: 'radio',
        options: [
          { value: '0', zh: '0 次', en: '0 times' },
          { value: '1-2', zh: '1–2 次', en: '1–2 times' },
          { value: '3-5', zh: '3–5 次', en: '3–5 times' },
          { value: '6+', zh: '6 次以上', en: '6+ times' },
        ],
      },
    ];
  }

  const TASKS = {
    laptop: {
      id: 'laptop',
      zh: {
        title: '帮自己挑一台笔记本电脑',
        scenario:
          '你最近想换一台笔记本电脑，预算 6000 元左右，主要用来写论文、跑代码、偶尔剪点视频。请用下面两个 AI 工具去研究一下，最后告诉我们你倾向于买什么、以及为什么。',
        chatSystem:
          '你是一个对话式 AI 助手，正在帮一位学生做购买决策。可以追问、分析利弊、给出权衡建议。回答自然、有条理，鼓励对方继续追问。用中文。',
        chatPlaceholder:
          '试着问我，比如：<br>「6000 预算，写代码 + 剪视频，买 Mac 还是 Windows？」<br>然后你可以继续追问细节。',
        searchPlaceholder:
          '试着搜：<br>「6000 元价位 适合编程剪辑的笔记本推荐」<br>它会给你带来源的答案摘要。',
        decisionLabel: '你最终倾向于买什么？',
        decisionPlaceholder: '例如：MacBook Air M3 / 某款 Windows 轻薄本…',
      },
      en: {
        title: 'Choose a laptop for yourself',
        scenario:
          'You want a new laptop (~CNY 6,000 / ~USD 850) for papers, coding, and light video editing. Use both AI tools below to research, then tell us what you would buy and why.',
        chatSystem:
          'You are a conversational AI helping a student choose a laptop. Ask follow-ups, compare pros/cons, and give balanced advice. Be natural and encourage further questions. Respond in English.',
        chatPlaceholder:
          'Try asking:<br>“Budget ~6000 CNY, coding + light video — Mac or Windows?”<br>Then follow up with details.',
        searchPlaceholder:
          'Try searching:<br>“Best laptops around 6000 CNY for coding and video editing”',
        decisionLabel: 'What would you buy?',
        decisionPlaceholder: 'e.g. MacBook Air M3 / a Windows ultrabook…',
      },
    },
    course: {
      id: 'course',
      zh: {
        title: '帮自己选下学期的选修课',
        scenario:
          '下学期要选一门通识选修课，你在几个方向之间犹豫：心理学、哲学、编程入门、艺术史。你想选一门既轻松好过、又能真正学到点东西的。请用下面两个 AI 工具研究一下，最后告诉我们你倾向于选哪门、以及为什么。',
        chatSystem:
          '你是一个对话式 AI 助手，正在帮一位学生做选课决策。可以追问对方的偏好、顾虑（如怕考试、想实用），分析各选项利弊。回答自然、有条理，鼓励继续追问。用中文。',
        chatPlaceholder:
          '试着聊：<br>「我比较怕考试，又想学点实用的，心理学和编程入门怎么选？」<br>然后继续说说你的顾虑。',
        searchPlaceholder: '试着搜：<br>「大学通识课 心理学 vs 编程入门 哪个好过 学到什么」',
        decisionLabel: '你最终倾向于选哪门课？',
        decisionPlaceholder: '例如：心理学 / 编程入门…',
      },
      en: {
        title: 'Choose an elective for next semester',
        scenario:
          'You must pick one general elective among Psychology, Philosophy, Intro to Programming, and Art History. You want something manageable but still worthwhile. Use both AI tools, then tell us which course you would pick and why.',
        chatSystem:
          'You are a conversational AI helping a student choose a course. Probe preferences and worries (exams, practicality), compare options. Be natural and encourage follow-ups. Respond in English.',
        chatPlaceholder:
          'Try:<br>“I fear exams but want something practical — Psychology vs Intro to Programming?”<br>Share your concerns.',
        searchPlaceholder:
          'Try searching:<br>“Psychology vs intro programming elective which is easier what do you learn”',
        decisionLabel: 'Which course would you pick?',
        decisionPlaceholder: 'e.g. Psychology / Intro to Programming…',
      },
    },
    internship: {
      id: 'internship',
      zh: {
        title: '帮自己决定接不接这份实习',
        scenario:
          '你拿到一份实习 offer：大厂、薪资不错，但通勤要 1.5 小时、而且和你想做的方向不太一样。同时你还在等另一家小公司的结果，方向更对口但不确定能不能拿到。请用下面两个 AI 工具帮你理一理，最后告诉我们你倾向于怎么做、以及为什么。',
        chatSystem:
          '你是一个对话式 AI 助手，正在帮一位学生做实习 offer 取舍。可以多轮追问，帮对方梳理不确定性、机会成本、短期与长期权衡。回答自然、有条理，鼓励继续展开。用中文。',
        chatPlaceholder:
          '试着聊：<br>「大厂 offer 通勤远、方向不对口，小公司还在等，我该怎么选？」<br>把你的纠结和顾虑都说出来。',
        searchPlaceholder:
          '试着搜：<br>「实习选择 大厂品牌 vs 小公司对口味 通勤成本 怎么权衡」',
        decisionLabel: '你最终倾向于怎么做？',
        decisionPlaceholder: '例如：先接大厂 / 等小公司 / 两家都谈再决定…',
      },
      en: {
        title: 'Decide whether to take this internship offer',
        scenario:
          'You have an offer from a big company — good pay, but a 1.5-hour commute and not quite your target field. You are waiting on a smaller company that fits better but may not come through. Use both AI tools, then tell us what you would do and why.',
        chatSystem:
          'You are a conversational AI helping a student weigh internship offers. Explore uncertainty, opportunity cost, short vs long term. Be natural and encourage follow-ups. Respond in English.',
        chatPlaceholder:
          'Try:<br>“Big-company offer with long commute vs waiting on a smaller fit — what should I do?”<br>Share your trade-offs.',
        searchPlaceholder:
          'Try searching:<br>“internship choice big company brand vs startup fit commute opportunity cost”',
        decisionLabel: 'What would you do?',
        decisionPlaceholder: 'e.g. Accept big co. / wait / negotiate both…',
      },
    },
  };

  const TASK_ORDER = ['laptop', 'course', 'internship'];

  const api = {
    lang: 'zh',
    OPT,

    t(key, vars) {
      let s = STR[this.lang][key] || STR.zh[key] || key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          s = s.replace('{' + k + '}', vars[k]);
        });
      }
      return s;
    },

    label(opt) {
      return typeof opt === 'object' ? opt[this.lang] || opt.zh : opt;
    },

    getPart1() {
      return part1Data(this.lang);
    },

    getPart2() {
      return part2Data(this.lang);
    },

    getTasks() {
      return TASK_ORDER.map((id) => {
        const t = TASKS[id];
        return { id, ...t[this.lang] };
      });
    },

    getTaskByIndex(i) {
      return this.getTasks()[i];
    },

    getPreferred() {
      return PREFERRED.map((p) => ({
        value: p.value,
        label: p[this.lang],
      }));
    },

    preferredLabel(value) {
      const p = PREFERRED.find((x) => x.value === value);
      return p ? p[this.lang] : value;
    },

    setLang(lang) {
      this.lang = lang === 'en' ? 'en' : 'zh';
      document.documentElement.lang = this.lang === 'en' ? 'en' : 'zh-CN';
      document.title = this.t('pageTitle');
    },

    toggleLang() {
      this.setLang(this.lang === 'zh' ? 'en' : 'zh');
    },
  };

  window.SurveyI18n = api;
})();
