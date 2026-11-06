# 現成開源方案調查

> 調查日期：2026-11-05
> 範圍：GitHub 上的宮廟／寺院／寺廟管理專案、教會與非營利組織通用平台、台灣商業方案的功能基線、相關法規。

## 結論

沒有一個現成開源專案可以直接拿來當宮廟管理系統的基底。

- 台灣在地的專案不是沒有授權（預設 All Rights Reserved），就是 `composer.json` 明寫 `proprietary`，法律上不能 fork 或複製程式碼，只能參考設計。
- 國外寺廟專案的文化模型是印度教 Puja／Seva 或漢傳佛寺檔案管理，沒有光明燈燈位、太歲、農曆、疏文這些台灣宮廟的核心概念。
- 通用平台（ChurchCRM、CiviCRM）在「人員／家庭、捐款收據、活動報名」上有重疊，但要補上燈牆、農曆生辰、太歲排位、疏文列印，改造成本高於自建。

建議自建，領域模型參考 `hungjukung/tms-system`，工程模式參考 `sijanmohanto/temple-management-system`，需求清單以商業方案「廟管家」與「廟通」的模組為基線。

## 一、台灣在地專案

| 專案 | 技術 | 授權 | 活動期間 | 評價 |
| --- | --- | --- | --- | --- |
| [hungjukung/tms-system](https://github.com/hungjukung/tms-system) | React 18 + Vite + Ant Design、NestJS + TypeORM + PostgreSQL、Socket.IO、pnpm monorepo、Cloud Run | 無 LICENSE | 2026-07 開發，2026-10 公開，16 commits | 領域模型最完整，已實際部署於一間宮廟。無測試。不可複製程式碼，可參考設計 |
| [nczz/the-spirit-palace-erp](https://github.com/nczz/the-spirit-palace-erp) | 原生 PHP 8.1 + MySQL，無框架 | `proprietary` | 2026-01 至 02，39 commits | 定位是香客 CRM + 商品訂單 + 法會報名加購，附 SDD 與使用手冊。不可使用 |
| [YungLing00/TempleFlow](https://github.com/YungLing00/TempleFlow) | 靜態頁 + LINE LIFF + Google Apps Script + Google Sheets | 無 LICENSE | 2026-09 | 信眾端原型：問事預約、點燈登記、志工報名、進香團、乞龜、抽籤。沒有後台。LINE 端流程可參考 |
| [sppwlkb/guangqing-temple](https://github.com/sppwlkb/guangqing-temple) | Vue 3 + Element Plus + Pinia + ECharts，純前端 | README 寫 MIT，repo 無 LICENSE 檔 | 2025-09 | 只有收支記帳與簡單會員，資料存瀏覽器 |
| [mepowerlmay/TempleSYS](https://github.com/mepowerlmay/TempleSYS) | ASP.NET WebForms + Bootstrap 3 | 無 LICENSE | 2019 至 2023 | 彰化某宮範本，技術老舊，無文件 |
| [cplusmed/Temple](https://github.com/cplusmed/Temple) | Next.js + NestJS + Prisma | 無 LICENSE | 2026-07 | 只是專案模板加 PRD |
| [James06111018/temple-app](https://github.com/James06111018/temple-app)、[lakesd6531/temple](https://github.com/lakesd6531/temple) | JavaFX / Java 桌面 | 無 LICENSE | 2026 | 幾乎沒有文件 |
| [mylefun/KTFMS](https://github.com/mylefun/KTFMS) | AI Studio 產生 | 無 LICENSE | 2026-02 | 玩具等級 |
| 香火簿（[soft-shelf issue #38](https://github.com/p19691221-web/soft-shelf/issues/38)） | 網頁，資料存瀏覽器 | 無原始碼 | 原型 | 不產生正式收據，無多人同步 |

### tms-system 的領域模型（值得參考）

後端模組：`auth`、`household`、`lantern`、`ceremony`、`gift`、`finance`、`inventory`、`activities`、`print`、`settings`。

Entity 清單：`temple`、`household`、`member`、`lantern-wall`、`lantern-slot`、`lantern-claim`、`ceremony`、`ceremony-registration`、`donation`、`gift`、`receipt`、`receipt-audit-log`、`ledger-entry`、`daily-audit-log`、`inventory-item`、`inventory-transaction`、`user`。

設計重點：

- 戶籍（household）底下掛多位信徒（member），依生日自動算生肖與是否犯太歲。
- 燈牆以畫布拖曳排列，燈位認領走 WebSocket 即時同步，並用資料庫唯一約束防重複配位。太歲燈牆鎖定燈種，一般燈牆燈種可複選（光明燈、平安燈、財利燈、文昌燈）。
- 收據來源分 `LANTERN_CLAIM`、`DONATION`、`CEREMONY_REGISTRATION`、`COMBINED`，作廢保留稽核紀錄並釋放燈位。
- 捐款分類：一般、普渡、進香、修繕、建設。送禮另記（鮮花、壽桃壽麵、水、飲料）。
- 流水帳有待審核／已核准／已駁回狀態，零用金撥補獨立處理。
- 六種角色：總幹事、財務、志工櫃台、資料建檔、報名櫃檯、唯讀，唯讀角色在後端攔截所有非 GET 請求。
- 多廟支援，資料互相隔離。

### the-spirit-palace-erp 的資料表（值得參考）

`customers`、`customer_relationships`（法人／自然人關係）、`products`（燈類商品、祭祀用品）、`orders`、`order_items`、`events`、`event_registrations`、`event_participants`、`participant_addons`。附農曆 helper 與 Excel 匯入邏輯文件。使用手冊用「如果這是 Excel」的觀念對照表介紹，是對志工友善的寫法。

## 二、其他地區的寺廟專案

| 專案 | 技術 | 授權 | 狀態 | 評價 |
| --- | --- | --- | --- | --- |
| [sijanmohanto/temple-management-system](https://github.com/sijanmohanto/temple-management-system) | Laravel 11 + MySQL + Blade + Bootstrap 5 | 無 LICENSE | 2026-10 起活躍，32 個測試檔 | 孟加拉印度教廟。工程品質最好：信眾與家庭、委員會任期、活動狀態機（draft 到 closed，兩種關帳模式）、認捐與繳款分離、提交者不得自我核准、序號收據與作廢、預算、廠商與採購單。文化模型不同，無燈位 |
| [jayamurli1954/MandirMitra](https://github.com/jayamurli1954/MandirMitra) | FastAPI + React + PostgreSQL + Redis，docker-compose | MIT | 2026-04，50 commits，自述完成 60 至 70% | 唯一授權可合法取用的完整寺廟系統。會計很重（科目表、傳票、銀行對帳、折舊、印度 FCRA）。repo 根目錄有大量 `fix_*.py` 腳本，品質存疑。印度法規綁得緊 |
| [sahuamit00786/temple_management_system](https://github.com/sahuamit00786/temple_management_system) | Express + Prisma + MySQL、React PWA + Dexie | 無 LICENSE | 2026-10 | 馬來西亞寺廟櫃台 POS。離線優先：銷售先寫 IndexedDB outbox 並印本地票號，連線後冪等同步換正式收據號。這個模式適合宮廟現場收銀 |
| [kevinchen8621/temple](https://github.com/kevinchen8621/temple) | fibjs + MySQL | GPL-2.0 | 2018，6 commits，停更 | 漢傳佛寺檔案管理，依中國佛協寺院管理辦法設計。runtime 冷門，不可用 |
| [amfoss/temple-app](https://github.com/amfoss/temple-app) | Android Java | GPL-3.0 | 已封存 | 482 stars 但停止維護 |
| [rakeshrajena/jt-temple-blr](https://github.com/rakeshrajena/jt-temple-blr) | PHP | GPL-3.0 | 2026-11 | 單一廟的庫存與捐款 |
| [Temple Stack](https://templestack.org/) | 商業 SaaS | 非開源 | 營運中 | 僅供功能參考 |

## 三、通用開源平台

| 平台 | 技術 | 授權 | 活躍度 | 繁中 | 評價 |
| --- | --- | --- | --- | --- | --- |
| [ChurchCRM](https://github.com/ChurchCRM/CRM) | PHP 8 + MySQL，Docker | MIT | 986 stars，7.8.2 於 2026-10-25 發布 | zh_TW 翻譯 100%（4495 字串） | 家庭／人員、群組、活動出席、奉獻 deposits 與 pledges、年度捐款證明、志工。Family 模型接近戶籍。缺燈位、農曆、太歲、疏文、法會桌次。沒有 plugin 機制，客製等於 fork 核心 |
| [CiviCRM](https://github.com/civicrm/civicrm-core) | PHP + MySQL，可掛 Drupal／WordPress／Joomla／Backdrop，6.x 起有 Standalone，Docker | AGPL-3.0 | 794 stars，活躍 | 有 zh_TW 語言包，完成度未確認 | CiviContribute、CiviEvent、CiviMember、CiviMail、CiviReport，自訂欄位與 Price Set 很強，Extension 生態成熟。可用自訂欄位加 Price Set 模擬燈種與期間，但燈牆、即時認領、疏文要自寫 extension。學習曲線陡，UI 老 |
| [Rock RMS](https://github.com/SparkDevNetwork/Rock) | C# .NET + SQL Server | Rock Community License | 699 stars，活躍 | 無 | 授權只允許美國 501(c)(3) 信仰組織內部使用，非 OSI 認可。台灣宮廟不符合，直接排除 |
| [ERPNext](https://github.com/frappe/erpnext) | Python Frappe | GPL-3.0 | 40k stars | 有 | 會計強，但 Non Profit app 已於 2024-07 封存。對 side project 過重 |
| Odoo + OCA donation | Python | LGPL／AGPL | 活躍 | 有 | `donation_base` 提供捐款收據物件，會員要另裝模組。過重 |

## 四、商業方案的功能基線

這些是台灣宮廟實際在用的系統，模組清單可以直接當需求盤點的對照。

### 廟管家（A-Soft，7,980 元買斷，Windows 單機）

- 基本設定：信眾身份、職務職稱、摘要片語、參與團體、祭品分類、地址快捷
- 資料建檔：信眾、友宮、廠商、加購祭品、廟務人員、管委；戶長與信眾一覽表、戶籍資料卡
- 收入支出：會計科目、收入與支出登錄、資產轉帳、信眾借還金；年度收支統計、決算、借金未還統計
- 安燈管理：燈種設定、安燈登錄、標籤列印、功德登記表、調查表
- 拜斗管理：斗種設定、拜斗登錄、標籤列印
- 法會管理：法會項目、舉辦登錄、疏文列印、立牌列印、亡者記錄、加購項目統計
- 求神問事、進香活動
- 系統維護：太歲正沖偏沖生肖設定、流年十二煞名稱、收支關帳日期、標籤列印位置、疏文內容編輯、備份回存

### 廟通（雲端 SaaS，模組計價）

- 信徒管理：戶籍、家庭關係、服務紀錄、捐款歷程、批次匯入
- 點燈牌位：點燈、安太歲、牌位、進塔；受益人、燈位、期間自動管理
- 捐款收據：具名與匿名、收據自動產生、日結、對帳、內控
- 法會活動：報名、繳費、桌次安排、QR Code 報到
- 發財金借還：擲筊流程、借金規則、額度控管、黑名單、還金追蹤
- 會計財務：收支、傳票、會計科目、預算、審核簽核
- LINE 行動服務：線上點燈、法會報名、捐款紀錄查詢、推播
- 角色權限與稽核日誌、志工排班與時數

### 普大 TU92 與傳承

- 國曆農曆自動轉換、年齡與生肖計算
- 郵遞標籤 A4 2×9 與 3×11、點燈姓名貼條 4×14 與 5×14、3+3 郵遞區號
- 收據與感謝狀：單位資訊、紅色印章、A4 或中一刀、LOGO 與印章圖檔
- 日週月收入報表、簡訊與 Email
- 傳承：太歲燈自動排位、燈籤列印、線上點燈代辦

## 五、法規對系統設計的影響

- 捐贈收據要能列舉扣除，寺廟必須已完成寺廟登記或為財團法人，收據要載明全銜、登記證字號並蓋印信。來源：[財政部稅務入口網](https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-knowledge/10rovPO)。
- 點光明燈、安太歲屬勞務對價，不是捐贈，不得列舉扣除。系統必須把「捐款收據」與「點燈／服務收據」分成兩種單據，字樣與編號分開。
- 監督寺廟條例要求住持每半年向主管機關報告收支並公告，所以要有期間收支報表。
- 信眾的生辰、地址、電話屬個資，需要角色權限與稽核日誌。

## 六、可直接取用的開源元件

- 農曆、生肖、節氣、太歲：[6tail/lunar-javascript](https://github.com/6tail/lunar-javascript)、[6tail/lunar-typescript](https://github.com/6tail/lunar-typescript)（MIT）。
- ChurchCRM 的 Family／Person 資料表設計與年度捐款證明流程可以當參考。
- CiviCRM 的 Price Set（商品 × 選項 × 金額）適合描述「燈種 × 期間 × 金額」的價目表。

## 七、建議的切法

1. 自建，不以任何現成系統為基底。
2. MVP 順序：信眾與戶籍（含農曆生辰、生肖、犯太歲）、點燈（燈種、燈位、期間、續燈、標籤列印）、兩類收據（捐款、服務）與作廢稽核、收支帳與期間報表、法會報名（桌次、加購）、LINE 信眾端。
3. 現場收銀若要離線可用，參考 TMADJ 的 outbox 與本地票號設計。
4. 若想先快速驗證流程而不寫後台，CiviCRM Standalone 可以在一兩天內用自訂欄位與 Price Set 搭出「信眾、捐款、活動報名」，但燈牆仍要客製，長期會卡在它的資料模型。
