# Inner Child Chatbot 部署指南

## 📋 部署到 playerinmetaverse.tech/chi

本指南将帮助您将 Inner Child Chatbot 部署到您的个人网站 `playerinmetaverse.tech` 的子路径 `/chi`。

## 🎯 部署目标

- **主网站**: https://playerinmetaverse.tech (保持不变)
- **子应用**: https://playerinmetaverse.tech/chi (新增)

## 🚀 部署步骤

### 方法1: 使用GitHub Pages子目录 (推荐)

1. **在您的GitHub仓库中创建子文件夹**
   ```bash
   cd /path/to/your/playerinmetaverse/repo
   mkdir chi
   cp /path/to/this/chi-app/* chi/
   ```

2. **推送到GitHub**
   ```bash
   git add chi/
   git commit -m "Add Inner Child Chatbot to /chi path"
   git push origin main
   ```

3. **访问地址**
   ```
   https://playerinmetaverse.tech/chi/
   ```

### 方法2: 使用Netlify重定向

如果您使用Netlify部署，可以配置重定向：

1. **创建 `_redirects` 文件**
   ```
   /chi/* /chi/index.html 200
   ```

2. **目录结构**
   ```
   playerinmetaverse/
   ├── index.html          # 主网站
   ├── about.html
   ├── education.html
   ├── experience.html
   ├── research.html
   ├── script.js
   ├── styles.css
   ├── chi/                # 新增子应用
   │   ├── index.html
   │   └── README.md
   └── _redirects          # Netlify配置
   ```

### 方法3: 使用Vercel

1. **配置 `vercel.json`**
   ```json
   {
     "routes": [
       { "src": "/chi", "dest": "/chi/index.html" },
       { "src": "/chi/(.*)", "dest": "/chi/$1" }
     ]
   }
   ```

## 📁 文件结构

部署后的完整文件结构：

```
playerinmetaverse.tech/
├── index.html              # 主页：Ruoyu Wen个人介绍
├── about.html              # 关于页面
├── education.html          # 教育背景
├── experience.html         # 工作经历  
├── research.html           # 研究项目
├── script.js               # 主网站JS
├── styles.css              # 主网站样式
├── CNAME                   # 域名配置
├── chi/                    # Inner Child Chatbot子应用
│   ├── index.html          # 项目展示页面
│   └── README.md           # 部署说明
└── _redirects              # 重定向配置（如使用Netlify）
```

## 🔗 访问方式

部署完成后，用户可以通过以下方式访问：

- **主网站**: https://playerinmetaverse.tech
- **Chi项目**: https://playerinmetaverse.tech/chi
- **直接链接**: 您可以在研究页面添加链接指向chi项目

## 🎨 集成到主网站 (可选)

如果您想在主网站的研究页面添加此项目的链接：

1. **编辑 `research.html`**，在项目列表中添加：
   ```html
   <div class="project-card">
       <h3>🌟 Inner Child Chatbot</h3>
       <p>基于AI的心理治疗辅助工具，帮助用户通过AI技术进行内在小孩疗愈</p>
       <a href="/chi" class="project-link">查看项目 →</a>
   </div>
   ```

## 📊 SEO优化

为了更好的搜索引擎收录：

1. **在主网站添加链接**
2. **提交sitemap**
   ```xml
   <url>
     <loc>https://playerinmetaverse.tech/chi/</loc>
     <changefreq>monthly</changefreq>
     <priority>0.8</priority>
   </url>
   ```

## 🛠️ 技术细节

- **静态部署**: 该页面是纯HTML/CSS/JS，无需服务器
- **响应式设计**: 完美适配移动设备
- **加载速度**: 优化的资源加载
- **SEO友好**: 包含必要的meta标签

## 🔧 自定义配置

您可以根据需要修改：

1. **颜色主题**: 修改CSS变量以匹配主网站
2. **联系方式**: 更新联系邮箱
3. **GitHub链接**: 更新到正确的仓库地址
4. **内容**: 根据需要调整项目描述

## ⚠️ 注意事项

- 这是一个项目展示页面，不包含实际的聊天功能
- 用户需要按照安装指南本地部署才能使用完整功能
- 确保更新GitHub仓库链接指向正确的项目地址

## 📞 支持

如果在部署过程中遇到问题：

1. 检查文件路径是否正确
2. 确认GitHub Pages设置
3. 验证DNS配置
4. 查看浏览器控制台错误信息

---

**部署完成后，您的Inner Child Chatbot项目将在 https://playerinmetaverse.tech/chi 可访问！** 🎉 