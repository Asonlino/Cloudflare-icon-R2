# ☁️ Asonino Icon Cloud

> A lightweight, serverless icon management system built on Cloudflare Workers.
> 
> 基于 Cloudflare Workers 构建的轻量级图标云端管理系统。

**Asonino Icon Cloud** 是一个全栈 Serverless 应用，旨在提供简单、快速的图标托管服务。它允许管理员通过 Web 界面上传图片，并在浏览器端自动处理为标准的 **108x108** 像素规格，随后通过 JSON API 分发给客户端软件使用。

---

## ✨ Features (功能特性)

* **🔒 安全认证**：基于环境变量的密码保护机制，防止未授权上传。
* **🎨 自动处理**：前端自动裁剪并压缩图片为 `108x108` PNG 格式，节省服务器算力。
* **☁️ 边缘存储**：利用 Cloudflare R2 存储实体文件，KV 存储索引数据，全球高速访问。
* **👋 极简交互**：支持拖拽上传 (Drag & Drop)，内置输入名称校验（仅限字母）。
* **🚀 标准 API**：提供标准化的 JSON 接口，第三方软件可直接调用获取图标列表。

## 🛠 Tech Stack (技术栈)

* **Runtime**: Cloudflare Workers
* **Storage**: Cloudflare R2 (Object Storage)
* **Database**: Cloudflare KV (Key-Value Store)
* **Language**: JavaScript (ES Modules)

---

## 📡 API Reference (接口文档)

该项目提供一个核心 GET 接口供软件调用。

### Get Icon List
获取所有已上传图标的索引列表。

- **Endpoint**: `GET /api/icon`
- **Response Format**: `JSON`

**Response Example:**

```json
{
  "name": "Asonino icon",
  "description": "By ChuiYan",
  "icons": [
    {
      "name": "Bilibili",
      "url": "[https://your-worker.workers.dev/file/Bilibili.png](https://your-worker.workers.dev/file/Bilibili.png)"
    },
    {
      "name": "Google",
      "url": "[https://your-worker.workers.dev/file/Google.png](https://your-worker.workers.dev/file/Google.png)"
    }
  ]
}

🚀 Deployment (部署指南)
你可以使用 Cloudflare 网页控制台 (Dashboard) 或 Wrangler CLI 进行部署。
前置要求
 * 一个 Cloudflare 账号。
 * 启用 Workers, R2 和 KV 功能。
方式一：使用 Wrangler CLI (推荐)
 * 克隆项目
   git clone [https://github.com/your-username/asonino-icon-cloud.git](https://github.com/your-username/asonino-icon-cloud.git)
cd asonino-icon-cloud

 * 创建存储资源
   # 创建 KV 命名空间
npx wrangler kv:namespace create "ICON_KV"

# 创建 R2 存储桶
npx wrangler r2 bucket create "icon-bucket"

 * 配置 wrangler.toml
   将创建好的 ID 填入 wrangler.toml 文件中：
   [vars]
ADMIN_PASSWORD = "your_secure_password" # 设置你的访问密码

[[kv_namespaces]]
binding = "ICON_KV"
id = "替换为你的_KV_ID"

[[r2_buckets]]
binding = "ICON_BUCKET"
bucket_name = "icon-bucket"

 * 部署
   npx wrangler deploy

方式二：Cloudflare 网页控制台
如果你没有本地开发环境，可以直接在 Cloudflare Dashboard 操作：
 * 创建资源：在后台分别创建一个 KV (命名为 ICON_KV) 和一个 R2 Bucket (命名为 icon-bucket)。
 * 创建 Worker：新建一个 Worker，将 src/index.js 的代码复制进去。
 * 绑定变量：在 Worker 的 Settings -> Variables 中添加以下绑定：
   * KV Namespace Bindings: 变量名 ICON_KV -> 指向你创建的 KV。
   * R2 Bucket Bindings: 变量名 ICON_BUCKET -> 指向你创建的 Bucket。
   * Environment Variables: 变量名 ADMIN_PASSWORD -> 值填入你想要的密码。
 * 保存并部署。
📖 Usage (使用说明)
 * 打开部署后的 Worker 域名 (例如 https://xxx.workers.dev).
 * 输入在环境变量中设置的密码。
 * 进入上传页面：
   * 名称：输入图标名称（仅允许 A-Z, a-z）。
   * 图片：点击或拖拽图片到上传框。
 * 点击上传，系统会自动处理图片并保存。
 * 访问 /api/icon 即可看到最新的 JSON 数据。
📝 License
MIT © 2025 Asonlino
