# Drip Wardrobe — Product Requirements Document

## 產品定位

一款 iOS 個人衣櫃管理 APP，用戶拍攝自己的衣物建立數位衣櫃，由 AI 每日根據場合和氛圍生成穿搭建議，並將穿搭合成到用戶全身照上呈現。

---

## 技術選型

| 項目 | 選擇 |
|------|------|
| 前端框架 | React Native（Expo） |
| 後端 / 資料庫 | Supabase |
| 檔案儲存 | Supabase Storage |
| 身份驗證 | Supabase Auth（Email + Apple 登入） |
| AI 穿搭生成 | OpenAI GPT-4o（場合分析 + 穿搭推薦） |
| AI 圖片合成 | GPT image 2（穿搭合成到全身照） |
| AI 衣物分析 | GPT-4o Vision（拍照後自動判斷衣物標籤） |

### Supabase 設定
- Project URL：`https://aluxncldfwolodewzmwi.supabase.co`
- anon public key：`sb_publishable_xfuLWuozlxLWQkGySFLdnw_Ya_IZa2f`

---

## 設計規範

- **風格**：黑色系、時尚、俐落
- **背景色**：`#0a0a0a`（主背景）、`#111111`（卡片背景）
- **主色**：`#9CE41C`（螢光黃綠，用於 CTA、active 狀態、accent）
- **文字色**：`#FFFFFF`（主要）、`#666666`（次要）、`#333333`（disabled）
- **字型**：系統字型，全大寫用於標籤和按鈕
- **按鈕**：主要 CTA 使用 `#9CE41C` 背景 + `#0a0a0a` 文字，圓角 12px
- **卡片**：`#111111` 背景，`1px solid #222222` 邊框，圓角 16px
- **底部導覽列**：4 個 tab，active 狀態使用 `#9CE41C`

---

## Supabase 資料庫結構

### users 表
```sql
id uuid PRIMARY KEY
email text
full_name text
avatar_url text
body_photo_url text        -- 全身照 URL（Supabase Storage）
style_tags text[]          -- 風格標籤陣列，例如 ['Minimal', 'Streetwear']
style_description text     -- AI 生成的風格描述
preferred_occasions text[] -- 常用場合權重
push_notification_time time -- 每日推播時間
created_at timestamp
```

### wardrobe_items 表
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
name text                  -- 衣物名稱，例如「白色牛津衫」
photo_url text             -- 衣物照片 URL（Supabase Storage）
category text              -- 上衣／下著／外套／鞋子／配件
main_color text            -- 主色
brand text                 -- 品牌（optional）
fit text                   -- 版型：oversized／slim／regular
season text[]              -- 季節：春夏／秋冬／四季
occasions text[]           -- 場合（最多 2 項）：日常／上班／約會／聚會／戶外／運動
is_favorited boolean       -- 心號狀態
favorited_at timestamp     -- 加心號時間（用於計算 AI 推薦權重遞減）
created_at timestamp
```

### outfits 表
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
item_ids uuid[]            -- 組成這套穿搭的衣物 ID 陣列
occasion text              -- 場合
vibe text                  -- 氛圍：輕鬆／正式
outfit_image_url text      -- flat lay 圖片 URL
try_on_image_url text      -- 合成到全身照的圖片 URL（有全身照時才有）
is_saved boolean           -- 是否收藏
ai_description text        -- AI 穿搭說明
created_at timestamp
```

---

## APP 流程

### 一、首次啟動流程

```
歡迎畫面
  ↓
風格兩兩對比測驗（共 5 輪）
  每輪顯示兩張穿搭風格圖片，用戶選喜歡的一張
  ↓
風格結果頁
  顯示風格標籤（例如 Minimal + Streetwear）
  顯示 AI 生成的風格描述文字
  ↓
全身照拍攝引導
  ├─ 拍攝 → 開啟相機，提示「請站在純色背景前拍攝全身照」→ 儲存至 Supabase Storage
  └─ 略過 → 直接進入主畫面
  ↓
主畫面（空狀態）
```

### 二、主畫面空狀態引導順序

```
衣櫃是空的
  ↓
顯示大 CTA：「新增你的第一件衣服」
  ↓
用戶新增衣物後回主畫面
  ↓
AI 生成第一套穿搭（flat lay 呈現）
  ↓
穿搭卡片下方出現引導 CTA：「拍一張全身照，把這套穿在你身上看看」
  ↓
用戶拍照後解鎖 AI 合成穿搭預覽
```

### 三、主畫面穿搭生成流程（有衣物後）

```
主畫面
  ↓
選場合（六選一）：日常／上班／約會／聚會／戶外／運動
  ↓
選氛圍（二選一）：輕鬆／正式
  ↓
AI 生成一套穿搭
  ├─ 有全身照 → 合成穿搭到本人身上（GPT image 2）
  └─ 無全身照 → Flat lay 平鋪顯示 + 引導補拍 CTA
  ↓
穿搭結果頁
  ├─ 收藏這套穿搭 → 儲存至 outfits 表，is_saved = true
  └─ 換一套 → 重新呼叫 AI 生成下一套（累積顯示 Look 1、2、3...）
```

---

## 四個主要頁面

### 1. 主畫面（Home）

**功能：**
- 頂部顯示今日日期和打招呼文字
- 場合選擇列（6 個 chip，可橫向滑動）
- 氛圍選擇（輕鬆／正式）
- 穿搭結果卡片區
  - 有全身照：顯示合成圖
  - 無全身照：顯示 flat lay + 補拍引導
- Look 計數（Look 1、Look 2...）
- 「換一套」按鈕
- 「收藏」按鈕
- 全身照區塊（點擊可補拍，無照片時顯示 Avatar 輪廓）

---

### 2. 我的衣櫃（Wardrobe）

**頂部 Segment：**
- 單品 ｜ 穿搭組合

**單品頁：**

分類 Tab（可橫向滑動）：
`全部 ／ 上衣 ／ 下著 ／ 外套 ／ 鞋子 ／ 配件`

衣物卡片 Grid（每行 2 個）：
- 衣物照片
- 衣物名稱
- 品牌

**單品詳細頁（點擊卡片後放大）：**
- 大圖顯示衣物照片
- 所有 AI 標籤：類別、主色、季節、場合、版型
- 可編輯標籤（點擊標籤進入編輯模式）
- 心號按鈕
  - 永久存在
  - 加心後 AI 推薦權重第一週最高，之後依時間遞減
- 移除單品按鈕
  - 刪除前顯示確認提示
  - 刪除後穿搭組合保留快照記錄（item 標記為已刪除）
  - 用戶可手動將衣物重新加回

**穿搭組合頁：**
- 顯示所有收藏的穿搭
- 來源：從主畫面生成的 look 按收藏後儲存
- 每個組合顯示：場合標籤、氛圍標籤、組成單品縮圖

---

### 3. 增加衣物（Add）

**流程：**
```
拍照 or 從相簿選擇
  提示：「建議純色背景，效果更好」
  ↓
AI 自動分析照片並填入所有欄位
  ↓
顯示給用戶確認／修改
  ↓
儲存至 wardrobe_items 表
```

**AI 自動判斷的欄位：**
- 衣物名稱（例如「白色牛津衫」）
- 類別：上衣／下著／外套／鞋子／配件
- 主色
- 品牌（看得出來才填，否則留空）
- 版型：oversized／slim／regular
- 季節：春夏／秋冬／四季
- 場合（最多 2 項）：日常／上班／約會／聚會／戶外／運動

**用戶可修改所有欄位後按「儲存至衣櫃」**

---

### 4. Profile

**功能區塊：**

1. **全身照管理**
   - 顯示目前全身照
   - 「更換 ／ 補拍」按鈕
   - 開啟相機拍攝新的全身照

2. **風格偏好**
   - 顯示目前風格標籤（可手動新增或刪除）
   - 「重新測驗風格」按鈕 → 重新進行 5 輪兩兩對比

3. **推播設定**
   - 每日穿搭推播時間選擇器

4. **帳號設定**
   - 修改名稱
   - 修改 Email
   - 修改密碼

5. **隱私與資料設定**
   - 說明照片如何被使用和儲存

6. **登入 ／ 登出**

---

## AI 邏輯說明

### 穿搭生成 Prompt 邏輯

呼叫 GPT-4o 時傳入：
- 用戶風格標籤
- 選擇的場合
- 選擇的氛圍
- 衣櫃內所有單品的 metadata（名稱、類別、顏色、季節、場合標籤）
- 心號單品（標記為優先，第一週內加權）

GPT-4o 回傳：
- 選出的單品 ID 組合
- 穿搭說明文字

### 心號權重計算

```
days_since_favorited = 今天 - favorited_at（天數）
weight = days_since_favorited <= 7 ? 3.0 : 1.5
```

心號單品永久保留，第一週內 AI 推薦權重 3 倍，之後維持 1.5 倍。

### 全身照合成

有全身照時，將選出的單品照片 + 全身照一起傳給 GPT image 2，請它生成穿搭合成圖。

無全身照時，生成 flat lay 平鋪圖，並在畫面下方顯示補拍引導。

---

## 場合與標籤規範

### 場合選項（共 6 個）
`日常` `上班` `約會` `聚會` `戶外` `運動`

### 氛圍選項（共 2 個）
`輕鬆` `正式`

### 衣物類別（共 5 個）
`上衣` `下著` `外套` `鞋子` `配件`

### 版型選項（共 3 個）
`oversized` `slim` `regular`

### 季節選項（共 3 個）
`春夏` `秋冬` `四季`

---

## 環境變數（.env）

```
EXPO_PUBLIC_SUPABASE_URL=https://aluxncldfwolodewzmwi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xfuLWuozlxLWQkGySFLdnw_Ya_IZa2f
OPENAI_API_KEY=你的_OpenAI_API_Key
```

---

## 開發優先順序

1. 專案初始化（Expo + Supabase 串接）
2. 身份驗證（註冊、登入、登出）
3. Onboarding 流程（歡迎畫面 → 風格測驗 → 全身照引導）
4. 增加衣物頁（拍照 + AI 分析 + 儲存）
5. 我的衣櫃頁（單品列表 + 詳細頁）
6. 主畫面穿搭生成（場合選擇 + AI 推薦）
7. 穿搭合成（GPT image 2）
8. Profile 頁
9. 穿搭組合收藏功能
10. 推播通知
