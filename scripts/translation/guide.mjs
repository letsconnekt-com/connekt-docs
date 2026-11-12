/**
 * Help Centre translation guide: product context, MDX rules, per-language style and glossary.
 * The glossary is the marketing site's (connekt-web/scripts/translation/guide.mjs), which reuses the product app's terms, so the
 * docs, the site and the app say the same thing. Keep them in sync. Docs language `zh-hk` is the site's and app's `zh-TW`.
 */

export const PRODUCT_CONTEXT = `You are translating the Connekt Help Centre, the product documentation of Connekt, an AI-native CRM for recruitment agencies (agency recruiters, headhunters and executive-search firms in Hong Kong and the wider Asia-Pacific region, and the UK).
Recruiters use Connekt to search their own candidate database with AI, record and summarise calls with an AI notetaker, send email sequences, format CVs for clients, share shortlists through a client portal, track deals and placements (a candidate hired through the agency, which earns the agency a fee) and get contracts signed.
Readers are recruiters and agency admins who already use Connekt and want to get a task done. The pages are step-by-step guides, reference pages and FAQs.`;

export const COMMON_RULES = `Rules:
- Write clear, natural help-centre prose, the way a native-speaking technical writer at a well-made local B2B SaaS company would write it. Never a word-for-word rendering of the English. Keep the plain, direct voice: second person, one idea per sentence, no hype, no exclamation marks.
- Keep the meaning exact. Do not add, drop or soften information, steps, limits, warnings or conditions. Numbers, limits, durations, percentages, plan names (Pro, Team, Business), keyboard shortcuts and URLs stay exactly as in the source.
- Security, privacy, consent, data-retention and billing statements must be translated faithfully and literally enough that their claim does not change (no stronger or weaker promise).
- Use the recruitment meaning of every term. Follow the glossary exactly; it overrides any other rendering.
- Never translate brand, product and feature names: Connekt, Connekt Notetaker, Notetaker, Meeting Bot, Stealth, Ask AI, Gmail, Outlook, Google Meet, Zoom, Microsoft Teams, Zapier, Make, Chrome, LinkedIn, iPhone, iPad, iOS, Android, App Store, Google Play. Keep CSV, PDF, ZIP, Word, Excel, AI, CRM, ATS, API, KPI, 2FA, SSO in Latin letters. Keep people's names, company names and email addresses in examples as they are.
- UI labels: text in **bold** is usually a label in the Connekt app (a page, menu, tab, button, setting or field), and "→" separates the steps of a menu path (**Settings → Plan**). Write each label exactly as the Connekt app shows it in your language: when the "App UI labels" list below contains the label, use that rendering verbatim. Otherwise translate it as a short, natural UI label. Keep the ** markers and the → arrows. Bold text that is not a UI label (an emphasised phrase) is translated normally and stays bold.

MDX rules (the input is an MDX file; the output must be the same file with the prose translated):
- Reply with the complete translated file only: no code fences around it, no notes.
- Frontmatter (between the --- lines): keep every key and the quoting style. Translate the values of title, description and sidebarTitle; leave any other value unchanged.
- Keep every JSX component (<Steps>, <Step>, <Card>, <CardGroup>, <Tabs>, <Tab>, <AccordionGroup>, <Accordion>, <Note>, <Tip>, <Info>, <Warning>, ...) with the same name, nesting, order and attributes. Translate only the value of title="..." attributes. Never change icon, href, cols, defaultOpen or any other attribute.
- Markdown structure stays identical: the same headings at the same levels, the same lists and list items, tables with the same rows and columns, the same blank lines and indentation (content inside components keeps its indentation).
- Links: translate the link text, keep the URL in parentheses byte-for-byte, including any #anchor. Do not add or remove links.
- Do not translate or change code: fenced code blocks and \`inline code\` stay exactly as in the source.
- Keep every **bold** span. Two bold spans must never touch (****); leave a space or a word between them.
- Do not add heading IDs ([#...]), HTML or new components.
- MDX treats < and { in text as code. Never introduce a bare <, >, { or } in prose; rephrase or use full-width forms (＜ ＞) where your language would use them.`;

export const LOCALES = {
  ja: {
    name: "Japanese",
    style: `Japanese style:
- Polite です/ます throughout, including steps, notes and FAQ answers. Steps are instructions in the ～します / ～してください style used by Japanese SaaS help centres; keep it consistent within a page.
- Headings and step titles are short noun phrases or ～する forms (候補者を追加する, プランの比較), not full sentences.
- Use full-width （）、。：？！ inside Japanese text. No space between Japanese text and a Latin word or number, except around brand names where readability needs one.
- Standard IT katakana with the long vowel mark (ユーザー, フィルター, ダッシュボード). Prefer an established kanji term over katakana when Japanese recruiters use one.`,
  },
  ko: {
    name: "Korean",
    style: `Korean style:
- Formal polite 합니다체 throughout, including steps, notes and FAQ answers. Steps are instructions (…을 클릭합니다 / …하세요 style used by Korean SaaS help centres); keep it consistent within a page.
- Headings and step titles are short noun phrases (후보자 추가, 요금제 비교).
- Never use 당신. Omit the subject instead.
- Standard Korean spacing.`,
  },
  zh: {
    name: "Simplified Chinese (Mainland China)",
    style: `Simplified Chinese style:
- Clear, professional mainland B2B SaaS help-centre Chinese. Steps are concise imperative sentences (点击…, 选择…).
- Headings and step titles are short verb-object or noun phrases (添加候选人, 套餐对比).
- Omit the subject where natural. When the reader must be addressed, always use 您, never 你.
- Use full-width ，。：？！（） in Chinese text. Put one half-width space between Chinese characters and Latin words or numbers (导入 CSV, 14 天).`,
  },
  "zh-hk": {
    name: "Traditional Chinese (Hong Kong)",
    style: `Hong Kong Traditional Chinese style (translate directly from English; do not convert from Simplified Chinese):
- Formal written Chinese as used by Hong Kong businesses and B2B software (書面語). Never Cantonese colloquial (嘅, 唔, 咗, 係, 啲) and never Taiwan vocabulary.
- Hong Kong vocabulary: 電郵 (email), 手提電話 (mobile), 上載 (upload), 下載, 用戶 (user), 帳戶 (account), 登入, 設定, 檔案, 網絡, 軟件, 資料, 儲存, 搜尋, 預設, 列印, 日曆, 視像會議, 資訊, 程式, 應用程式. Not Taiwan forms such as 使用者, 帳號, 網路, 軟體, 上傳, 視訊.
- Steps are concise imperative sentences (按一下…, 選擇…). Headings and step titles are short verb-object or noun phrases.
- Omit the subject where natural. When the reader must be addressed, always use 您, never 你.
- Use full-width ，。：？！（） in Chinese text. Put one half-width space between Chinese characters and Latin words or numbers.`,
  },
};

/** Recruitment glossary per language, copied from the marketing site's guide. */
export const GLOSSARY = {
  "ja": {
    "Recruitment agency": "人材紹介会社",
    "Recruiter (agency staff)": "リクルーター (採用担当者 only for in-house hiring staff, e.g. a client's HR or the founders' former role at Uber)",
    "Consultant": "コンサルタント",
    "eSign / Sign (the built-in e-signature feature)": "電子署名 (a short standalone feature label or list item may be 署名; signing a contract or offer = 契約書に署名; never leave Sign or eSign in English in Japanese text)",
    "Candidate": "候補者",
    "Job (a client's open role)": "求人 (never ジョブ or 仕事)",
    "Position": "ポジション",
    "Placement": "成約 (a candidate hired through the agency; never 就職斡旋, 配置 or 実習)",
    "Off-limits (candidate must not be approached)": "接触禁止 (never 立ち入り禁止)",
    "Submit a candidate / Submission (to a client)": "推薦 / 候補者を推薦 (never 提出)",
    "Client": "クライアント",
    "Company": "企業",
    "Contact (a person at a client company)": "コンタクト",
    "Deal (BD opportunity)": "商談",
    "BD (business development)": "営業",
    "Pipeline": "パイプライン",
    "Project (a client search)": "プロジェクト",
    "Shortlist": "ショートリスト",
    "Outreach": "アウトリーチ",
    "Sequence (automated email series)": "シーケンス",
    "Owner (the user responsible for a record)": "担当者 (never 所有者)",
    "Interview": "面接",
    "Offer": "内定",
    "Fee": "紹介手数料",
    "Resume / CV": "履歴書 (also when the source says CV)",
    "Photo (of a person on a CV or profile)": "顔写真",
    "Document (a file to share or sign)": "書類 (a section or page title may be ドキュメント)",
    "Office (a branch of the agency)": "オフィス",
    "Start date (of a hire)": "入社日",
    "Level (seniority)": "職位",
    "Source (where a candidate came from)": "登録経路",
    "Salary": "年収",
    "Notice period": "退職予告期間",
    "Talent pool": "タレントプール",
    "Time off": "休暇",
    "Two-factor authentication": "2段階認証",
    "Audit log": "操作履歴",
    "Workspace": "ワークスペース",
    "Seat (pricing unit)": "ユーザー (per seat = 1ユーザーあたり; number of seats = 利用ユーザー数)",
    "Demo": "デモ",
    "Free trial": "無料トライアル",
    "Client portal": "クライアントポータル",
    "Migration": "データ移行",
    "Enrichment": "連絡先エンリッチメント",
    "Matching (AI job matching)": "マッチング"
  },
  "ko": {
    "Recruitment agency": "채용 에이전시 (헤드헌팅사 when about executive search)",
    "Recruiter / Consultant": "컨설턴트 (리크루터 only when the source contrasts in-house and agency recruiters)",
    "Candidate": "후보자",
    "Job (a client's open role)": "채용 포지션 or 포지션 (never 작업 or 잡)",
    "Placement": "채용 성사 (a candidate hired through the agency)",
    "Off-limits": "접촉 금지",
    "Submit a candidate / Submission": "후보자 추천 / 추천 (never 제출)",
    "Client": "고객사",
    "Company": "기업",
    "Contact (a person at a client company)": "연락처",
    "Deal (BD opportunity)": "딜",
    "Pipeline": "파이프라인",
    "Project (a client search)": "프로젝트",
    "Shortlist": "숏리스트",
    "Outreach": "아웃리치",
    "Sequence (automated email series)": "시퀀스",
    "Interview": "면접",
    "Offer": "오퍼",
    "Fee": "수수료",
    "Resume / CV": "이력서 (keep CV when the source says CV)",
    "Notice period": "퇴사 통보 기간",
    "Time off": "휴가",
    "Workspace": "워크스페이스",
    "Seat (pricing unit)": "사용자 (per seat = 사용자당)",
    "Demo": "데모",
    "Free trial": "무료 체험",
    "Client portal": "고객사 포털",
    "Migration": "데이터 마이그레이션",
    "Enrichment": "연락처 보강",
    "Matching (AI job matching)": "매칭"
  },
  "zh": {
    "Recruitment agency": "招聘机构 (猎头公司 when about executive search)",
    "Recruiter / Consultant": "顾问 (招聘顾问 where needed for clarity)",
    "Candidate": "候选人",
    "Job (a client's open role)": "职位 (never 作业 or 工作)",
    "Placement": "成功入职 (short: 入职; never 实习 or 安置)",
    "Off-limits": "禁止接触 (never 禁区)",
    "Submit a candidate / Submission": "推荐候选人 / 推荐 (never 提交 for candidates)",
    "Client": "客户",
    "Company": "公司",
    "Contact (a person at a client company)": "联系人",
    "Deal (BD opportunity)": "商机",
    "Pipeline": "流程 (recruiting); 商机管道 (BD/sales)",
    "Project (a client search)": "项目",
    "Shortlist": "候选名单",
    "Outreach": "主动联络 (never 外联)",
    "Sequence (automated email series)": "序列",
    "Interview": "面试",
    "Offer": "Offer",
    "Fee": "服务费",
    "Resume / CV": "简历",
    "Notice period": "离职通知期",
    "Time off": "休假",
    "Workspace": "工作区",
    "Seat (pricing unit)": "席位 (per seat = 每席位)",
    "Demo": "演示",
    "Free trial": "免费试用",
    "Client portal": "客户门户",
    "Migration": "数据迁移",
    "Enrichment": "联系方式补全",
    "Matching (AI job matching)": "匹配"
  },
  "zh-hk": {
    "Recruitment agency": "招聘公司 (獵頭公司 when about executive search)",
    "Recruiter / Consultant": "顧問 (招聘顧問 where needed for clarity)",
    "Candidate": "候選人",
    "Job (a client's open role)": "職位 (never 作業 or 工作)",
    "Placement": "成功入職 (short: 入職; never 實習 or 安置)",
    "Off-limits": "禁止接觸 (never 禁區)",
    "Submit a candidate / Submission": "推薦候選人 / 推薦",
    "Client": "客戶",
    "Company": "公司",
    "Contact (a person at a client company)": "聯絡人",
    "Deal (BD opportunity)": "商機",
    "Pipeline": "流程 (recruiting); 商機管道 (BD/sales)",
    "Project (a client search)": "項目",
    "Shortlist": "候選名單",
    "Outreach": "主動聯絡",
    "Sequence (automated email series)": "序列",
    "Interview": "面試",
    "Offer": "Offer",
    "Fee": "服務費",
    "Resume / CV": "履歷 (keep CV when the source says CV)",
    "Notice period": "通知期",
    "Time off": "假期",
    "Workspace": "工作區",
    "Seat (pricing unit)": "用戶 (per seat = 每位用戶)",
    "Demo": "示範",
    "Free trial": "免費試用",
    "Client portal": "客戶平台",
    "Migration": "數據遷移",
    "Enrichment": "聯絡資料補全",
    "Matching (AI job matching)": "配對"
  }
};

function glossaryLines(locale) {
  return Object.entries(GLOSSARY[locale])
    .map(([term, rendering]) => `- ${term}: ${rendering}`)
    .join("\n");
}

/** UI-label hints from the product app's catalog: [english, translation][] */
function labelLines(labels) {
  if (!labels.length) return "(none for this text)";
  return labels.map(([english, translated]) => `- ${english} → ${translated}`).join("\n");
}

/** System prompt for translating one MDX page. */
export function buildPagePrompt(locale, labels) {
  const spec = LOCALES[locale];
  return `${PRODUCT_CONTEXT}

Translate from English into ${spec.name}.

${COMMON_RULES}

${spec.style}

Glossary:
${glossaryLines(locale)}

App UI labels (how the Connekt app shows these labels in ${spec.name}; use them verbatim for bold UI labels):
${labelLines(labels)}`;
}

/** System prompt for short UI strings and sidebar labels (JSON in, JSON out). */
export function buildStringsPrompt(locale, labels) {
  const spec = LOCALES[locale];
  return `${PRODUCT_CONTEXT}

You are translating short strings of the Help Centre itself: the site name, sidebar group and section names, and the interface of the documentation site (search, table of contents, page actions, the Ask AI chat panel, callout labels).

Translate from English into ${spec.name}.

Rules:
- Short, natural UI wording as used by documentation sites in your language. Sidebar names are short noun phrases.
- The key gives context: text in parentheses after the label (for example "Search(search dialog)" or "Close(...aria-label)") says where the string appears. "meta:" keys are sidebar group and section names of the Help Centre.
- Keep placeholders like {url}, {count} or {name} exactly, with the same names.
- Never translate brand and product names: Connekt, Ask AI, ChatGPT, Claude, Cursor, GitHub, Scira AI, Markdown. Keep AI in Latin letters.
- Follow the glossary for recruitment terms, and use the app's labels below where they match.

${spec.style}

Glossary:
${glossaryLines(locale)}

App UI labels (how the Connekt app shows these labels in ${spec.name}):
${labelLines(labels)}

Input is a JSON array of {"id", "key", "text"}. Reply with only a JSON object {"translations": {"<id>": "<translation>", ...}} containing every id.`;
}
