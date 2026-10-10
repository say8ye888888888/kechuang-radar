# 工银科创雷达 — 企业搜索与自动评估交互功能方案

## Context

当前项目是一个只读演示工作台：6 家虚构企业的数据写死在内存中，用户只能浏览，没有输入企业名称进行查询的交互。比赛演示时缺乏"动手感"。

本方案为项目增加完整的交互链路：用户输入企业名称 → 先查数据库 → 没有则由 LLM 收集信息 → 调用现有评分引擎 → 存入 SQLite → 展示在复用的详情页上。LLM 先做 Mock 层（完整架构+接口），比赛前替换真实 API 只需改一个文件。

## 架构设计

### 核心思路

1. **Evaluation Store 模式**：LLM 收集的企业评估结果（完整 Evaluation JSON）直接持久化到 SQLite。`getEvaluation(id)` 先查 SQLite，命中则直接返回；未命中则回退到现有 demo 数据实时计算路径。demo 企业行为完全不变。

2. **绕过 AS_OF 限制**：LLM 企业的评估时点用当天日期（由 search-service 控制），不经过 `validAsOf()` 校验。`snapshotCompany`（score.ts:1073）对 `dataset !== "demo"` 的企业不过滤权利的 verificationState，证据的 asOf/observedAt 设为当天即可通过 `<= asOf` 过滤。

3. **复用防自报机制**：Mock LLM 生成的每条专利证据带 `sourceUrl`（Google Patents 链接）和 `status: "verified"`。`evaluateSubmittedCompany`（evaluation-service.ts:49-81）验证 sourceUrl 通过后，权利保持 verified 状态，进入正常评分路径。

4. **财务 synthetic 标记**：有公开财报的用真实值（synthetic 不设），LLM 估算的标 `synthetic: true`。score.ts:356 已处理：synthetic 为 true 时生成提示 note，不影响分数。

## 新增文件

### 1. `src/server/db/database.ts` — SQLite 管理
- 使用 `better-sqlite3`，数据库文件 `./data/kechuang-radar.db`
- 导出 `getDb()` 单例，模块加载时建表

**Schema**：
```sql
CREATE TABLE IF NOT EXISTS collected_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  company_json TEXT NOT NULL,      -- CompanyInput JSON
  evaluation_json TEXT NOT NULL,   -- 预计算 Evaluation JSON
  as_of TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_name TEXT NOT NULL,
  company_id TEXT,
  status TEXT NOT NULL,            -- found_demo | found_collected | collected_by_llm | failed
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2. `src/server/repositories/sqlite-evaluation-store.ts` — 评估存储
```typescript
export interface EvaluationStore {
  save(company: CompanyInput, evaluation: Evaluation, asOf: string): Promise<void>
  findEvaluation(companyId: string): Promise<Evaluation | null>
  findByName(name: string): Promise<{ companyId: string; company: CompanyInput } | null>
  listEvaluations(): Promise<Evaluation[]>
}
```
- save 用 `INSERT OR REPLACE`；findByName 按 name/short_name 大小写不敏感查询

### 3. `src/server/services/llm-collector.ts` — LLM 集成层（Mock）
```typescript
export interface CompanyInfoCollector {
  collectCompanyInfo(name: string): Promise<CollectionResult>
}
```
Mock 策略：
- 确定性 ID：`llm-{sha256(name).slice(0,8)}`
- 企业名关键词→产业映射（半导体→第三代半导体材料，软件→工业软件，生物→生物医药…）
- 生成 3-8 件专利（至少 3 件有效发明，IPC 对应产业，remainingYears 8-18）
- 每件权利对应一条证据：`type:"patent"`, `status:"verified"`, `sourceUrl:"https://patents.google.com/patent/CN{hash}"`
- 财务数据全字段填入合理值，`synthetic:true`
- 所有证据 `asOf`/`observedAt` = 当天日期
- Mock 数据必须通过 `validateCompanyInput` 校验
- 导出 `collector` 单例

### 4. `src/server/services/search-service.ts` — 搜索编排
```typescript
export async function searchCompany(name: string): Promise<SearchResult>
```
调用链：`evaluationStore.findByName` → `companyRepository.findByName` → `collector.collectCompanyInfo` → `evaluateSubmittedCompany(company, { asOf: today })` → `evaluationStore.save` → 返回 companyId

### 5. `src/app/api/search/route.ts` — 搜索 API
- `POST /api/search { name }` → 调用 searchCompany → `{ data: { status, companyId, source? } }`
- 空名称返回 422

### 6. `src/app/search/page.tsx` — 搜索页面（Server Component）
### 7. `src/components/company-search.tsx` — 搜索交互组件（Client Component）
- 输入框 + 提交 → `POST /api/search` → `router.push(/company/{id})`
- 加载态："正在收集企业信息..."
- 错误态：显示失败原因

## 修改现有文件

### `src/server/repositories/company-repository.ts`
- `CompanyRepository` 接口新增 `findByName(name: string): Promise<CompanyInput | null>`
- `DemoCompanyRepository` 实现：遍历内存 `companies`，按 name/shortName 大小写不敏感匹配

### `src/server/services/evaluation-service.ts`
- `getEvaluation(id)`：先查 `evaluationStore.findEvaluation(id)`，命中直接返回；未命中回退 demo 路径
- `listEvaluations()`：合并 demo 企业（实时计算）+ SQLite 存储评估（直接返回），demo 在前

### `src/lib/display.ts`
- 正则扩展支持 `LLM-` 前缀：`/^(?:DEMO|LLM)-(INV|UM|SW|DES)-([A-Z]+)-(\d+)$/`

### `src/components/site-frame.tsx`
- header 新增导航：待预审(`/`)、搜索企业(`/search`)、方法(`/method`)

### `src/app/page.tsx`
- 标题区新增"搜索新企业"入口链接

### `package.json`
- 添加 `better-sqlite3` + `@types/better-sqlite3`

### `.gitignore`
- 添加 `/data/`

## 不需修改的文件（自动受益）

- `src/lib/score.ts` — `evaluate()` 纯函数，直接复用
- `src/app/company/[id]/page.tsx` — 调用 `getEvaluation(id)`，修改后自动支持 LLM 企业
- `src/components/company-desk.tsx` — 接收 Evaluation，结构一致直接复用
- `src/components/queue.tsx` — 接收 Evaluation[]，LLM 企业自动出现在队列
- `src/server/services/graph-service.ts` — 从 evaluation.company 派生图谱
- `src/server/validation/company-input.ts` — 校验逻辑不变

## 实现步骤

### Step 1: 依赖安装
- `package.json` 添加 better-sqlite3，`.gitignore` 添加 /data/
- 验证：`npm install` 成功

### Step 2: SQLite 数据库模块
- 新建 `src/server/db/database.ts`
- 验证：模块导入后 `./data/kechuang-radar.db` 生成，表结构正确

### Step 3: EvaluationStore 实现
- 新建 `src/server/repositories/sqlite-evaluation-store.ts`
- 验证：save → findEvaluation 往返一致；findByName 大小写不敏感

### Step 4: CompanyRepository 扩展
- 修改 `company-repository.ts`，新增 findByName
- 验证：`findByName("澄川半导体")` 返回正确企业

### Step 5: Mock LLM Collector
- 新建 `src/server/services/llm-collector.ts`
- 验证：Mock 数据通过 validateCompanyInput；sourceUrl 合法；确定性 ID

### Step 6: Search Service
- 新建 `src/server/services/search-service.ts`
- 验证：搜索 demo 企业→found；搜索新企业→collected；SQLite 出现新记录

### Step 7: Evaluation Service 修改
- 修改 `evaluation-service.ts`：getEvaluation/listEvaluations 接入 SQLite
- 验证：首页 6 家不变；搜索后首页 7 家；/company/llm-xxx 正常渲染

### Step 8: Display 工具修改
- 修改 `display.ts` 正则
- 验证：LLM 企业权利 ID 显示友好格式

### Step 9: 搜索 API 路由
- 新建 `src/app/api/search/route.ts`
- 验证：POST /api/search 各场景响应正确

### Step 10: 搜索页面和组件
- 新建 `src/app/search/page.tsx` + `src/components/company-search.tsx`
- 验证：/search 页面渲染；输入→提交→跳转

### Step 11: 首页和导航修改
- 修改 `page.tsx` + `site-frame.tsx`
- 验证：导航链接正确；搜索入口明显

### Step 12: 端到端测试
- 搜索 demo 企业→已有详情页
- 搜索新企业→LLM 收集→新详情页（雷达图+图谱+报告）
- 新企业出现在首页队列
- 重启 server→SQLite 持久化
- 再次搜索同一企业→走 found 路径

## 后续替换真实 LLM

只需修改 `src/server/services/llm-collector.ts`：
- 新建 `RealCompanyInfoCollector implements CompanyInfoCollector`
- 调用真实 LLM API（OpenAI/智谱/通义），将返回信息映射到 CompanyInput
- 确保专利证据带 sourceUrl，财务估算标 synthetic
- 导出的 `collector` 单例从 Mock 改为 Real
- 调用方（search-service、API、页面）完全不变
