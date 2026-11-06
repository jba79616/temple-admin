# temple-admin

宮廟安燈管理系統（個人 side project）。以「戶」為單位登記每年度的安燈、收款、日結，列印安燈卡與頌經名冊。

需求與設計文件在 `docs/`：`design.md` 是定案的設計與資料模型，`screens.md` 是畫面規格，`open-source-survey.md` 是前期調研。

## 架構

| 層 | 技術 |
| --- | --- |
| 後端 | Spring Boot 4.1、Java 25、Spring Data JPA、Flyway、Spring Security（session 登入） |
| 資料庫 | PostgreSQL 16 |
| 前端 | React 19、Vite 7、TypeScript、react-router 7 |
| 部署 | 前端 build 進 `backend/src/main/resources/static/`，整個系統是一個 jar |

## 需求

- Java 25（本機用 sdkman：`sdk install java 25.0.3-tem`）
- Node.js 22
- Docker（跑 PostgreSQL 與整合測試）

## 本機啟動

```bash
# 1. 資料庫（port 55432，帳密 temple/temple）
docker compose up -d

# 2. 前端 build 進後端 static
cd frontend && npm install && npm run build && cd ..

# 3. 後端（Flyway 會自動建表與種子資料）
cd backend && ./mvnw spring-boot:run
```

開 http://localhost:8080 ，預設帳號 `admin` / `admin123`（第一次啟動時建立，請登入後到「使用者」重設密碼）。

8080 被別的程式占用時（例如 OrbStack）改用 `PORT=18080 ./mvnw spring-boot:run`，前端開發模式用 `API_PORT=18080 npm run dev` 把代理指到同一個 port。

### 前端開發模式

```bash
cd frontend && npm run dev   # http://localhost:5173，/api 代理到 8080（或 API_PORT 指定的 port）
```

## 測試

```bash
cd backend && ./mvnw test     # 單元測試 + Testcontainers 整合測試（需要 Docker）
cd frontend && npm test       # vitest
cd frontend && npm run build  # 含 tsc 型別檢查
```

## 環境變數

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:55432/temple` | 資料庫連線 |
| `DB_USER` / `DB_PASSWORD` | `temple` / `temple` | 資料庫帳密 |
| `PORT` | `8080` | HTTP port |
| `TEMPLE_ADMIN_USERNAME` / `TEMPLE_ADMIN_PASSWORD` | `admin` / `admin123` | 使用者表為空時建立的管理員 |

資料庫時區請設為 `Asia/Taipei`（`docker-compose.yml` 已設定），應用層所有日期一律由程式指定，不依賴資料庫預設。

## 打包部署

```bash
cd frontend && npm run build && cd ../backend && ./mvnw -DskipTests package
java -jar backend/target/temple-admin-0.0.1-SNAPSHOT.jar
```
