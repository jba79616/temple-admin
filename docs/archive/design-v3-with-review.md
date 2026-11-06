# 寺廟安燈管理系統 設計文件（v3）

> 整理自 claude.ai 對話產出的設計看板 `temple-system-plan-v3.jsx`（系統規劃書 v3，方案 C + 報表分析更新），2026-11-05 搬入 repo。
> 2026-11-05 review 後的 v4 決定與待決事項見第 10 節，正文中標 (v4) 的列即為已更新內容。

## 1. 系統概覽

### 系統定位

寺廟安燈管理系統，管理每年度信眾安燈作業。以「戶」為操作單位，支援多燈種登記、生辰記錄、安燈卡與頌經名冊列印。一年一次安燈週期，年度由系統設定手動切換。

### 核心功能

戶籍管理、信眾管理、燈種管理、年度安燈登記、安燈卡列印、頌經名冊列印、系統設定。

### 業務規則

- 以戶為單位操作
- 戶長名搜尋，不記電話
- 戶長可更換、可不安燈
- 信眾軟刪除
- 同人同燈同年唯一
- 同戶可多次來訪
- 當場收齊
- 年度手動切換

### 使用者

廟方工作人員 1 至 2 人。操作場景為信眾到廟裡時，工作人員查詢該戶、勾選要安的燈、收款、列印安燈卡。年底產出頌經名冊供法會使用。

## 2. 技術架構

### 確定技術棧

| 層 | 技術 | 說明 |
| --- | --- | --- |
| 後端 | Spring Boot 4（REST API）、Java 25 (v4) | 純 API server，不用 Thymeleaf，支援多端 client |
| 資料庫 | PostgreSQL (v4) | 配合 Spring Data JPA；DB 層 ENUM 改為 VARCHAR 配 JPA 字串列舉 |
| PDF 列印 | Flying Saucer | HTML/CSS 模板轉 PDF，學習成本低 |
| 網頁版 | React + Vite + TypeScript (v4) | 呼叫 REST API；build 產物放進 Spring Boot 的 `static/`，部署仍是一個 jar |
| 桌面版 | 取消 (v4) | 區網架構下瀏覽器就是 client，用 Chrome 或 Edge 的「建立捷徑、以視窗開啟」取代；單機安裝需求改用 `jpackage` 把 jar 連 JRE 包成安裝檔 |
| 手機版 | 取消 (v4) | 需要時用瀏覽器，或用 Tauri 2 mobile 打包同一套 React，不另寫 Flutter |

### 架構決策紀錄

- **為何前後端分離？** 未來要支援 Tauri 桌面版和 Flutter 手機版，三端共用同一組 REST API。
- **為何不用 JasperReports？** 沒用過，安燈卡和名冊的列印需求單純，Flying Saucer（HTML 轉 PDF）學習成本低、改版面只改 HTML/CSS。
- **為何不用 Thymeleaf？** Thymeleaf 是 server-side rendering，綁死網頁版。改用 REST API 才能讓桌面版和手機版接入。
- **部署方式？** 寺廟區網內一台機器跑 Spring Boot，其他電腦開瀏覽器連區網 IP。不需要離線模式。
- **為何前端用 React？(v4)** 2026-11-05 決定。搭配 Vite 與 TypeScript，build 後由 Spring Boot 直接提供。
- **為何取消 Tauri 與 Flutter？(v4)** 區網架構下 client 就是瀏覽器，Tauri 桌面版只多一個殼；Tauri 2 自 2024-10 起已能打包 Android 與 iOS，Flutter 失去獨立存在的理由；單機安裝的需求由 `jpackage` 解決。REST API 的前後端分離仍保留，之後要包殼不會被堵死。

### 開發順序

1. Phase 1：Spring Boot REST API + React 網頁版 + 舊系統資料匯入，核心功能上線 (v4)
2. ~~Phase 2：Tauri 桌面版~~ 取消 (v4)
3. ~~Phase 3：Flutter 手機版~~ 取消 (v4)

## 3. 資料模型

### ER 架構總覽（7 張表）

```
┌──────────────────────┐
│   system_configs     │     ┌──────────────────────────┐
├──────────────────────┤     │    households            │
│ id             (PK)  │     ├──────────────────────────┤
│ config_key  VARCHAR  │     │ id               (PK)    │
│   UNIQUE             │     │ household_number INT AUTO │   ┌──────────────────────────┐
│ config_value VARCHAR │     │ head_name     VARCHAR     │   │       members            │
│ description  VARCHAR │     │ district      VARCHAR     │   ├──────────────────────────┤
│ updated_at           │     │ address       VARCHAR     │◄──│ id                 (PK)  │
└──────────────────────┘     │ notes         TEXT        │   │ household_id        (FK) │
                             │ created_at / updated_at   │   │ name             VARCHAR │
                             └──────────────────────────┘   │ gender     ENUM(男,女)   │
                                                            │ district   VARCHAR NULL  │
┌──────────────────────┐                                    │ address    VARCHAR NULL  │
│    light_types       │                                    │ birth_year  VARCHAR(4)   │
├──────────────────────┤                                    │ birth_month TINYINT NULL │
│ id            (PK)   │                                    │ birth_month_is_leap BOOL │
│ category     ENUM    │                                    │ birth_day   TINYINT NULL │
│  '一般燈'            │                                    │ birth_hour  VARCHAR(2)   │
│  '八卦轉運斗'        │                                    │ is_head    BOOLEAN       │
│ name        VARCHAR  │                                    │ is_deleted BOOLEAN       │
│ price    DECIMAL     │                                    │ deleted_at TIMESTAMP     │
│ sort_order   INT     │                                    │ delete_reason VARCHAR    │
│ is_active  BOOLEAN   │                                    │ created_at / updated_at  │
│ created_at           │    ┌────────────────────────────┐  └────────────┬─────────────┘
│ updated_at           │    │ annual_light_records  ⭐    │               │
└──────────┬───────────┘    │  （狀態主表）               │               │
           │                ├────────────────────────────┤               │
           │           ┌───►│ id                   (PK)  │◄──────────────┘
           │           │    │ year                 INT   │
           │           │    │ member_id             (FK) │
           │           │    │ light_type_id         (FK) │
           │           │    │ household_id          (FK) │
           │           │    │ unit_price         DECIMAL │
           │           │    │ is_active         BOOLEAN  │
           │           │    │ created_at / updated_at    │
           │           │    │ UNIQUE(member_id,          │
           │           │    │   light_type_id, year)     │
           │           │    └────────────────────────────┘
           │           │
           │           │    ┌────────────────────────────┐
           │           │    │     light_orders           │
           │           │    │      （安燈單/來訪單）       │
           │           │    ├────────────────────────────┤
           │           │    │ id                   (PK)  │
           │           │    │ year                 INT   │
           │           │    │ household_id          (FK) │
           │           │    │ total_amount       DECIMAL │
           │           │    │ created_at                 │
           │           │    └──────────────┬─────────────┘
           │           │                   │
           │           │    ┌──────────────┴──────────────┐
           │           │    │    light_order_items        │
           │           │    │     （不可變安燈明細）        │
           │           │    ├─────────────────────────────┤
           └───────────┼───►│ id                    (PK)  │
                       │    │ order_id               (FK) │
                       │    │ member_id              (FK) │
                       │    │ light_type_id          (FK) │
                       │    │ unit_price          DECIMAL │
                       │    │ action  ENUM('ADD','REMOVE')│
                       │    │ created_at                  │
                       │    └─────────────────────────────┘
                       │
                       └── 寫入 order_items 時
                           同步更新 annual_light_records
```

### 各表職責

- **system_configs**：系統設定 KV 表。存目前年度、寺廟名稱等。年度由操作人員手動切換。
- **households**：戶籍主檔。`household_number` 自動流水號（報表列印用）。`head_name` 供搜尋。`district` + `address` 拆存。
- **members**：信眾，歸屬某戶。有 `gender` 欄位。個人地址可覆蓋戶地址（`district`、`address` nullable）。支援軟刪除。
- **light_types**：燈種主檔。分一般燈和八卦轉運斗兩大類。`is_active` 控制啟停用。
- **annual_light_records**：狀態主表。某人某燈某年有沒有安，UNIQUE constraint 確保不重複。查詢打勾矩陣直接讀這張。
- **light_orders**：每次來訪產生一張單。記錄該次總金額。當場收齊。
- **light_order_items**：不可變安燈明細。`action` 為 ADD 或 REMOVE。不改不刪，保留完整歷程。

### 關鍵設計決策

- **方案 C：狀態主表 + 不可變帳本。** `annual_light_records` 加速讀取（顯示打勾矩陣），`light_order_items` 保留完整歷程。`@Transactional` 確保一致。
- **地址拆兩欄。** `district`（行政區）+ `address`（詳細地址）。安燈卡分兩行顯示，名冊串起來顯示完整地址。`households` 和 `members` 都有。
- **members.gender。** ENUM('男','女')。報表需要性別欄位。
- **household_number。** 自動遞增流水號，報表顯示用。對應舊系統的「戶號」。
- **unit_price 快照。** 價格是當下事實，後續調價不應影響歷史帳。
- **生辰、姓名不快照。** 修正就是修正，全域生效。列印時從 member 即時讀取。

### system_configs 初始資料

| config_key | config_value | description |
| --- | --- | --- |
| current_year | 2024 | 目前安燈年度 |
| temple_name | ○○宮 | 寺廟名稱（列印用） |
| temple_address | 雲林縣... | 寺廟地址（選填） |

年度切換：操作人員在設定頁面手動修改 `current_year`。

### v3 變更紀錄（來自報表分析）

- **＋ members.gender**：ENUM('男','女')。舊系統報表有性別欄位，新系統保留。
- **＋ households.household_number**：INT AUTO_INCREMENT。舊系統自動編號的「戶號」，報表列印需要。
- **△ 地址拆兩欄**：原本 `address` 一欄改為 `district` + `address`。安燈卡的「區」欄位就是 `district`。`households` 和 `members` 都拆。
- **－ members.gender 的 ENUM**：原本 `members` 表沒有 `gender`，現在補上。

## 4. 生辰設計

### 欄位定義

```
members 表中的生辰欄位
├── birth_year          VARCHAR(4)    -- 天干地支年："甲子"、"丙寅" 或 "吉"
├── birth_month         TINYINT NULL  -- 農曆月份數字：1~12，NULL 代表吉
├── birth_month_is_leap BOOLEAN       -- 是否閏月，DEFAULT FALSE
├── birth_day           TINYINT NULL  -- 農曆日期數字：1~30，NULL 代表吉
└── birth_hour          VARCHAR(2)    -- 地支時辰："子"~"亥"，NULL 代表吉
```

### 資料格式

- **年**：天干地支（甲子、乙丑 … 癸亥），共 60 種。操作人員直接打字輸入。
- **月**：一律用數字（1 至 12），不用天干地支。
- **閏月**：獨立 boolean 欄位標記。閏 4 月 = `birth_month: 4` + `is_leap: true`。
- **日**：一律用數字（1 至 30）。
- **時辰**：固定用地支（子丑寅卯辰巳午未申酉戌亥），共 12 種。
- **吉的處理**：年存字串「吉」，月、日存 NULL，時辰存 NULL。

### 列印組合邏輯（頌經名冊用）

```
名冊格式：{年}年 {閏?}{月}月 {日}日 {時}時 生

實際範例（從 PDF 確認）：
  辛亥年 1月 9日 吉時生
  辛巳年 9月 10日 辰時生
  庚辰年 9月 7日 午時生
  癸亥年 3月 24日 吉時生

組合規則：
  年  → birth_year + "年"
  月  → (is_leap ? "閏" : "") + (birth_month ?? "吉") + "月"
  日  → (birth_day ?? "吉") + "日"
  時  → (birth_hour ?? "吉") + "時"
  尾  → "生"

注意：安燈卡不印生辰，只有名冊印。
```

## 5. 燈種設計

### 分類與定價

| 分類 | 品項 | 價格 | 數量 |
| --- | --- | --- | --- |
| 一般燈 | 光明燈 | 300 | 1 種 |
| 一般燈 | 文昌燈 | 300 | 1 種 |
| 一般燈 | 太歲燈 | 300 | 1 種 |
| 八卦轉運斗 | 23 種不同類型 | 500 | 23 種 |

### light_types 表

```
light_types
├── id              (PK, AUTO_INCREMENT)
├── category        ENUM('一般燈', '八卦轉運斗')
├── name            VARCHAR(50)
├── price           DECIMAL(10,2)
├── sort_order      INT           -- 控制列印排序
├── is_active       BOOLEAN
├── created_at / updated_at

總共 3 + 23 = 26 筆記錄
```

## 6. 安燈單設計

### 方案 C：狀態主表 + 不可變帳本

```
annual_light_records（狀態主表）
├── UNIQUE(member_id, light_type_id, year)
├── is_active    -- true=有安, false=已取消
├── unit_price   -- 價格快照

light_orders（安燈單，每次來訪一張）
├── year         -- 從 system_configs.current_year 帶入
├── total_amount -- 本單淨額

light_order_items（不可變安燈明細）
├── action       -- ENUM('ADD', 'REMOVE')
├── unit_price   -- 當下價格快照
```

### 寫入流程（@Transactional）

```
每次存檔時，在同一個 Transaction 內：

1. 建立 light_order（本次來訪單）
2. 遍歷勾選變更：
   新勾選 → INSERT order_items(ADD)
          + UPSERT annual_light_records(is_active=TRUE)
   取消   → INSERT order_items(REMOVE)
          + UPDATE annual_light_records(is_active=FALSE)
3. total_amount = SUM(ADD) - SUM(REMOVE)
```

### 查詢打勾矩陣

```sql
SELECT member_id, light_type_id
FROM annual_light_records
WHERE household_id = ? AND year = ? AND is_active = TRUE
```

一次查詢，直接渲染打勾矩陣。

### 操作範例

```
【情境】王家今年安燈

第一次來（1月）→ order #101
  王大明 + 光明燈 + ADD + $300
  王小花 + 光明燈 + ADD + $300
  王小花 + 太歲燈 + ADD + $300
  total = $900

第二次來（3月）→ order #205
  王大明 + 太歲燈 + ADD + $300   ← 新安
  王小花 + 太歲燈 + REMOVE + $300 ← 取消
  王小明 + 文昌燈 + ADD + $300   ← 新成員
  total = $300

【最終狀態】
  王大明：光明燈 ✓  太歲燈 ✓
  王小花：光明燈 ✓  太歲燈 ✗
  王小明：文昌燈 ✓
```

## 7. 操作流程

### 年度安燈操作流程

1. **搜尋戶長**：輸入戶長姓名搜尋，找到該戶。若新戶則先建立戶籍和成員資料。
2. **確認成員**：顯示該戶所有成員（排除已軟刪除的）。可新增、編輯、軟刪除成員。可更換戶長。
3. **開安燈單**：系統自動開一張新的 `light_order`。年度從 `system_configs.current_year` 帶入。
4. **勾選燈種**：顯示「成員 × 燈種」矩陣表格。讀 `annual_light_records` 顯示已安的燈（打勾）。可新增勾選（ADD）或取消勾選（REMOVE）。
5. **確認收款**：系統計算本單淨額 = ADD 總額 − REMOVE 總額。當場收齊。
6. **完成**：Transaction 寫入 order + items + 更新狀態主表。可立即列印安燈卡。

### 年度切換流程

```sql
UPDATE system_configs SET config_value = '2025'
WHERE config_key = 'current_year'
```

效果：

- 安燈操作自動帶入新年度
- 打勾矩陣顯示新年度（一開始全空）
- 歷史年度資料完整保留
- 不影響任何既有資料

## 8. 列印需求

### 報表總覽（5 種，從舊系統 .rtm、Word、PDF 確認）

| # | 報表 | 來源 | 用途 |
| --- | --- | --- | --- |
| 1 | 安燈卡（一般燈） | Word 套印 | 光明、文昌、太歲共用版型。一頁 3×7 = 21 張卡片。 |
| 2 | 安燈卡（八卦斗） | Word 套印 | bagua_only，純八卦轉運斗卡片，同上版型。 |
| 3 | 八卦斗卡 + 名冊 | Navicat | bagua，卡片加名冊合印。 |
| 4 | 頌經名冊（今年） | Navicat | 依燈種分冊，依戶分頁。列今年有安燈的人。 |
| 5 | 全部名冊 | Navicat | 同版型，列資料庫所有人。 |

### 報表 1、2：安燈卡（Word 套印版型）

- 舊系統用 Word 合併列印（mail merge）
- 一頁 3 欄 × 7 列 = 21 張卡片
- 直印，表格框線
- 新系統改用 Flying Saucer HTML 轉 PDF 重現

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│   «燈»   │ │   «燈»   │ │   «燈»   │
│  «姓名»  │ │  «姓名»  │ │  «姓名»  │
│   «區»   │ │   «區»   │ │   «區»   │
│  «住址»  │ │  «住址»  │ │  «住址»  │
└──────────┘ └──────────┘ └──────────┘
            ... × 7 列 ...
```

- **欄位**：燈種名稱（`light_types.name`）、姓名、`district`、`address`
- **不含生辰**：安燈卡只有名字和地址，不印生辰資料。
- **地址顯示**：`district` 和 `address` 分兩行，避免卡片太擠。

### 報表 4、5：頌經名冊

- 舊系統用 Navicat 報表產生
- 橫印 Letter 紙
- 每種燈分開印一本
- 同戶信眾在同一頁

```
              安 奉 太 歲 燈 善 信 名 單
1
────────────────────────────────────────────────────
姓名      生庚                     住址
────────────────────────────────────────────────────
王大明    辛亥年   1月 9日 吉時生    ○○市○○區○○街1號
王小花    辛巳年   9月 10日 辰時生   ○○市○○區○○街1號


                      恭 此 以
      聞　天運　　乙巳 年　十二 月　　日　證明百拜上申
```

（原看板的範例列使用疑似真實的姓名與地址，搬入 repo 時改為示意資料。）

- **標題**：「安奉 ○○燈 善信名單」，燈種名稱動態帶入
- **欄位**：姓名、生庚（天干地支年 + 月日時生）、住址（`district` + `address` 合併顯示）
- **分頁**：依戶分頁（同戶在同一頁），左上角有頁碼
- **祈福文**：頁尾固定。年份（天干地支）動態帶入，月固定「十二」，日留空手寫。
- **報表 4 與 5 的差別**：4 列今年有安燈的人（來自 `annual_light_records`），5 列全部資料庫。

### 列印技術方案

- **統一方案**：全部改用 Flying Saucer（HTML/CSS 轉 PDF），取代 Navicat 報表和 Word 套印。
- **安燈卡模板**：HTML table 3×7 grid，CSS 控制卡片尺寸。每 21 人一頁 `@page` break。
- **名冊模板**：HTML 表格，`@page` landscape Letter。CSS `@page` break 依戶分頁。
- **祈福文年份**：從 `system_configs.current_year` 讀取西元年，轉天干地支顯示（程式轉換）。
- **API 端點（範例）**：

```
GET /api/print/light-card?year=114&lightTypeId=1   → PDF
GET /api/print/name-list?year=114&lightTypeId=1    → PDF
GET /api/print/name-list-all?lightTypeId=1         → PDF
```

## 9. 未來擴充

- **年度複製**：去年有安燈的戶，一鍵帶入今年。讀取去年 `annual_light_records`。
- **批次列印**：一次列印全部某燈種的安燈卡或整本頌經名冊。
- **統計儀表板**：各燈種安燈數、總收入、年度比較。
- **Excel 匯出**：信眾清單、年度報表匯出 xlsx。
- **Tauri 桌面版**：共用網頁版前端，包成桌面 app。
- **Flutter 手機版**：行動裝置操作，共用 REST API。
- **Rebuild 工具**：從 `light_order_items` 重算 `annual_light_records`。

## 10. v4 變更與待決事項（2026-11-05 review）

### 已決定

- 前端用 React + Vite + TypeScript。
- 只做 Web 版，取消 Tauri 桌面版與 Flutter 手機版。前端 build 進 Spring Boot 的 `static/`，部署為單一 jar。
- 後端 Spring Boot 4，Java 25。
- 資料庫 PostgreSQL。DB 層 ENUM 改成 VARCHAR 配 JPA 字串列舉。
- 舊系統資料匯入排進 Phase 1，戶號沿用舊系統編號。
- 金額處理採銀行切法：登記與收款兩本帳、交易日與入帳日分開、日結後只可更正不可改、作廢與更正限 ADMIN、日結記長短款。REMOVE 預設不退費，以 FORFEIT 結清。詳第 11 節。
- 八卦轉運斗可多選，同人同年可安多種斗。
- 已安燈的成員被軟刪除，當年紀錄保留到年底，名冊照印。
- 不存年齡。舊資料若有出生年才加 `birth_year` 欄位，看到 schema 再定。
- 第 11 節的資料表 v4 提案整體採用，取代第 3 節：年份一律西元、戶號用 PostgreSQL identity、戶長只留 `members.is_head`、生辰「吉」一律 NULL、太歲提示依 `birth_ganzhi` 計算。

### 待決

- **列印方式**：建議第一版用瀏覽器列印，安燈卡與名冊各做成獨立的 React 列印頁加 CSS print 樣式。之後若要批次產生或歸檔 PDF，用 Chromium 渲染同一個列印頁（`flying-saucer-chrome-pdf` 或 Playwright Java），不走 Flying Saucer 的 CSS 2.1 引擎，避免 XHTML 與中文字型嵌入問題，也避免維護兩套版面。
- **備份**：PostgreSQL 每日 `pg_dump` 排程與異地副本，屬部署工作，尚未規劃。
- **舊資料匯入的細節**：現行系統資料庫為 MariaDB，可匯出 SQL dump（2026-11-05 確認）。建議流程：用 Docker 起一個 MariaDB 還原 dump，用 pgloader 把整套舊表原樣搬進 PostgreSQL 的 `legacy` schema，再寫 Spring Boot 的匯入 service 從 `legacy.*` 轉成新 schema，匯入可重跑、未對應的列要記錄、匯完出對帳報表（各燈種各年度筆數新舊比對）。`legacy` schema 保留到第一個安燈季結束再刪。要搬的有戶（含戶號）、信眾（姓名、性別、區、地址）、生辰（舊格式要解析成干支年、月、閏、日、時辰）、燈種對應到新的 26 筆 `light_types`、歷年安燈紀錄進 `annual_light_records` 以支援年度複製。要先檢查的坑：dump 的字元集是否為 Big5 或 latin1 誤存、舊系統年份是否為民國年。下一步需要 `mysqldump --no-data` 的 schema 與少量去識別化樣本。

## 11. 資料表設計 v4（2026-11-05 採用，取代第 3 節）

依 PostgreSQL、Java 25、舊資料自 MariaDB 匯入、太歲提示、登入、金額採銀行切法等已決定事項重新整理第 3 節。此節取代第 3 節的 ER 圖，並作為 Flyway `V1__init.sql` 的底稿。

### 與 v3 的差異

| 項目 | v3 | v4 | 原因 |
| --- | --- | --- | --- |
| 戶長 | `households.head_name` + `members.is_head` | 只留 `members.is_head`，加 partial unique index | 兩處表達會不一致；索引讓 DB 保證一戶最多一位戶長 |
| 戶號 | `INT AUTO_INCREMENT` 與 `id` 同表 | `GENERATED BY DEFAULT AS IDENTITY UNIQUE` | PostgreSQL 允許非主鍵 identity；匯入時寫入舊戶號，之後 `setval` 接續 |
| ENUM | DB 層 ENUM | `VARCHAR` + `CHECK` | 配 JPA `@Enumerated(STRING)`，改值不用 ALTER TYPE |
| 生辰「吉」 | 年存字串「吉」，月日時 NULL | 四欄一律 NULL | 一致；干支年加 CHECK 擋錯字 |
| 軟刪除 | `is_deleted` + `deleted_at` | 只留 `deleted_at` | `is_deleted` 可由 `deleted_at IS NOT NULL` 推得 |
| 金額 | `DECIMAL(10,2)` | `INT` | 新台幣無小數 |
| 金額 | `total = SUM(ADD) − SUM(REMOVE)`，錢黏在明細上 | 兩本帳：明細只記登記變動，`payments` 記錢；`total_due` 可為負 | 銀行切法，事後更正、紙本補登、退款、放棄退款都表達得出來 |
| 更正與作廢 | 無 | `kind`、`status`、`corrects_order_id`、作廢欄位 | 已入帳單據不改，日結前沖正、日結後調整 |
| 日結 | 無 | `daily_closings` 記系統合計、實點現金、長短款 | 日結後該日凍結，關帳日即最後日結日 |
| 交易日與入帳日 | 只有 `created_at` | `registered_on`、`received_on` 為交易日；`posted_on` 為入帳日 | 紙本補登與舊資料匯入都適用 |
| 使用者 | 無 | `users`，`light_orders.created_by` | 個資需登入；知道哪位工作人員開的單 |
| 匯入追溯 | 無 | `legacy_id` 欄位、`light_orders.source` | 匯入可重跑、可對帳 |
| 太歲 | 無 | `light_types.is_taisui`，規則放 `system_configs` | 由 `birth_ganzhi` 地支與年度地支算犯太歲 |
| 年份 | 未定 | 一律西元 `INT` | 顯示民國或干支時再轉 |
| 戶內排序 | 無 | `members.sort_order` | 名冊與矩陣的列順序要穩定 |
| 明細不可變 | 靠約定 | trigger 禁止 UPDATE／DELETE | 帳本在 DB 層就改不掉 |
| 追溯 | 無 | `annual_light_records.last_order_item_id` | 狀態表每一格都查得到最後是哪筆明細改的 |

### DDL（PostgreSQL）

```sql
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name  VARCHAR(50)  NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE system_configs (
  config_key   VARCHAR(50)  PRIMARY KEY,
  config_value VARCHAR(255) NOT NULL,
  description  VARCHAR(255),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- 初始：current_year=2027、temple_name、temple_address、
--       taisui_relations=值,沖,刑,害,破（各廟可刪減）、prayer_month=十二

CREATE TABLE households (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_number INT    GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  district         VARCHAR(20),
  address          VARCHAR(200),
  notes            TEXT,
  legacy_id        INT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_id        BIGINT      NOT NULL REFERENCES households(id),
  name                VARCHAR(50) NOT NULL,
  gender              VARCHAR(1)  CHECK (gender IN ('M', 'F')),
  is_head             BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order          SMALLINT    NOT NULL DEFAULT 0,
  district            VARCHAR(20),
  address             VARCHAR(200),
  birth_ganzhi        VARCHAR(2)  CHECK (birth_ganzhi ~ '^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$'),
  birth_month         SMALLINT    CHECK (birth_month BETWEEN 1 AND 12),
  birth_month_is_leap BOOLEAN     NOT NULL DEFAULT FALSE,
  birth_day           SMALLINT    CHECK (birth_day BETWEEN 1 AND 30),
  birth_hour_branch   VARCHAR(1)  CHECK (birth_hour_branch IN ('子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥')),
  deleted_at          TIMESTAMPTZ,
  delete_reason       VARCHAR(100),
  legacy_id           INT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 生辰四欄 NULL 一律顯示為「吉」
CREATE UNIQUE INDEX ux_members_one_head_per_household
  ON members (household_id) WHERE is_head AND deleted_at IS NULL;
CREATE INDEX ix_members_household ON members (household_id);
CREATE INDEX ix_members_name      ON members (name);

CREATE TABLE light_types (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category    VARCHAR(10) NOT NULL CHECK (category IN ('GENERAL', 'BAGUA')),
  name        VARCHAR(50) NOT NULL UNIQUE,
  price       INT         NOT NULL CHECK (price >= 0),
  is_taisui   BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  legacy_code VARCHAR(20) UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE light_orders (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind              VARCHAR(10) NOT NULL DEFAULT 'COUNTER' CHECK (kind IN ('COUNTER', 'CORRECTION', 'IMPORT')),
  status            VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'  CHECK (status IN ('ACTIVE', 'VOIDED')),
  year              INT         NOT NULL,
  household_id      BIGINT      NOT NULL REFERENCES households(id),
  registered_on     DATE        NOT NULL DEFAULT CURRENT_DATE,
  posted_on         DATE        NOT NULL DEFAULT CURRENT_DATE,
  total_due         INT         NOT NULL,
  corrects_order_id BIGINT      REFERENCES light_orders(id),
  note              VARCHAR(200),
  created_by        BIGINT      REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_by         BIGINT      REFERENCES users(id),
  voided_at         TIMESTAMPTZ,
  void_reason       VARCHAR(200),
  CHECK ((kind = 'CORRECTION') = (corrects_order_id IS NOT NULL)),
  CHECK ((status = 'VOIDED') = (voided_at IS NOT NULL))
);
-- registered_on 交易日（補登填紙本日期）；posted_on 入帳日，系統給，不可改
-- total_due = SUM(ADD unit_price) − SUM(REMOVE unit_price)，可為負（應退）
CREATE INDEX ix_light_orders_household_year ON light_orders (household_id, year);
CREATE INDEX ix_light_orders_posted_on      ON light_orders (posted_on);

CREATE TABLE light_order_items (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id        BIGINT     NOT NULL REFERENCES light_orders(id),
  member_id       BIGINT     NOT NULL REFERENCES members(id),
  light_type_id   BIGINT     NOT NULL REFERENCES light_types(id),
  action          VARCHAR(6) NOT NULL CHECK (action IN ('ADD', 'REMOVE')),
  unit_price      INT        NOT NULL CHECK (unit_price >= 0),
  override_reason VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- unit_price 預設燈種現價；ADMIN 可覆寫並必填 override_reason
CREATE INDEX ix_items_order        ON light_order_items (order_id);
CREATE INDEX ix_items_member_light ON light_order_items (member_id, light_type_id);

CREATE TABLE payments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    BIGINT      NOT NULL REFERENCES light_orders(id),
  kind        VARCHAR(10) NOT NULL DEFAULT 'CASH' CHECK (kind IN ('CASH', 'FORFEIT', 'IMPORT')),
  amount      INT         NOT NULL,
  received_on DATE        NOT NULL DEFAULT CURRENT_DATE,
  posted_on   DATE        NOT NULL DEFAULT CURRENT_DATE,
  received_by BIGINT      REFERENCES users(id),
  note        VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- amount 帶正負。CASH：正為收款、負為退款，計入日結。
-- FORFEIT：放棄退款（轉功德金），不動現金。IMPORT：舊資料的歷史收款，不計入日結。
-- 結清條件：total_due − SUM(amount) = 0；不為 0 的單列入「差額待處理」
CREATE INDEX ix_payments_order     ON payments (order_id);
CREATE INDEX ix_payments_posted_on ON payments (posted_on);

CREATE TABLE daily_closings (
  closing_date DATE   PRIMARY KEY,
  system_cash  INT    NOT NULL,
  counted_cash INT    NOT NULL,
  difference   INT    GENERATED ALWAYS AS (counted_cash - system_cash) STORED,
  closed_by    BIGINT NOT NULL REFERENCES users(id),
  closed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  note         VARCHAR(200)
);
-- system_cash = SUM(payments.amount) WHERE kind = 'CASH' AND posted_on = closing_date
-- difference 即長短款。關帳日 = MAX(closing_date)，posted_on ≤ 關帳日的單與收款不可作廢、不可新增

CREATE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;
CREATE TRIGGER trg_items_immutable
  BEFORE UPDATE OR DELETE ON light_order_items
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER trg_payments_immutable
  BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TABLE annual_light_records (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year               INT     NOT NULL,
  member_id          BIGINT  NOT NULL REFERENCES members(id),
  light_type_id      BIGINT  NOT NULL REFERENCES light_types(id),
  household_id       BIGINT  NOT NULL REFERENCES households(id),
  unit_price         INT     NOT NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  last_order_item_id BIGINT  REFERENCES light_order_items(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, light_type_id, year)
);
CREATE INDEX ix_alr_household_year     ON annual_light_records (household_id, year);
CREATE INDEX ix_alr_year_light_active  ON annual_light_records (year, light_type_id) WHERE is_active;
```

### 幾條規則

- **兩本帳**：`light_order_items` 只記登記變動，`payments` 只記錢。`total_due = SUM(ADD unit_price) − SUM(REMOVE unit_price)`，可為負。結清條件 `total_due − SUM(payments.amount) = 0`，不為 0 的單列在「差額待處理」。
- **櫃台單**：存檔時自動產生一筆 CASH 收款等於 `total_due`，櫃台不多一個步驟。`total_due` 為負（信眾取消）時預設產生 FORFEIT 結清，不退現。
- **沖正**：單據的 `posted_on` 尚未日結，可作廢。`status = VOIDED`，寫反向明細讓狀態表復原，已收現金以 CASH 負數記退款。限 ADMIN。
- **調整**：`posted_on` 已日結的單凍結，只能開 `kind = CORRECTION` 的更正單引用原單，明細 REMOVE 加 ADD，可跨戶；差額以今天的 CASH 或 FORFEIT 結清；溢收短收先留在差額待處理。限 ADMIN。
- **日結**：每日輸入實點現金，`system_cash` 為當日 `posted_on` 的 CASH 合計，差額即長短款。關帳日為最大的 `closing_date`，之前的日期不可再記入或作廢。事後發現的長短款以更正單的收款對銷，不改原日結。
- **交易日與入帳日**：`registered_on`、`received_on` 是交易日，補登紙本時逐筆填紙本日期；`posted_on` 是入帳日由系統給。日結看入帳日，收入報表看交易日。
- **價格覆寫**：`unit_price` 預設燈種現價，ADMIN 可改並必填 `override_reason`。
- **Rebuild**：`total_due` 與狀態表都能從明細重算，日結的 `system_cash` 能從 `payments` 重算，三者是驗證工具的核對點。
- **軟刪除與名冊**：成員被軟刪除時不自動 REMOVE，當年的 `annual_light_records` 保留；名冊只看狀態表，不過濾 `members.deleted_at`。矩陣編輯與戶內成員清單才排除已刪除成員。
- **八卦轉運斗**：可多選，不加同人同年只能一種的限制。
- **狀態表與明細的對應**：每寫一筆 item 就 upsert 對應的 `annual_light_records`，並把 `last_order_item_id` 指向該 item。
- **匯入**：舊資料的歷年安燈紀錄，每戶每年產生一張 `kind = IMPORT` 的 order 與對應 items，`registered_on` 填歷史日期，收款以 `kind = IMPORT` 的 payment 結清、不計入日結，再由同一套邏輯長出狀態表，讓帳本從第一天起就完整。
- **太歲**：年度地支由 `current_year` 算出（`(year − 4) mod 12`），成員地支取 `birth_ganzhi` 第二字，關係（值、沖、刑、害、破）由程式算，哪些算犯太歲看 `system_configs.taisui_relations`。

### 已決定（2026-11-05）

- 金額採銀行切法，見上方規則。REMOVE 預設不退費，以 FORFEIT 結清；`total_due` 可為負。
- 已安燈的成員被軟刪除時，當年紀錄保留到年底，名冊照印。
- 不存年齡；舊資料若有出生年再加 `birth_year`，看到 MariaDB schema 再定。
- 八卦轉運斗 23 種可多選。
