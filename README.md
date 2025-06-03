# Player in Metaverse - 个人网站

一个现代化的响应式个人网站，专为探索元宇宙和数字世界的创作者设计。

## 🌟 特性

- **响应式设计** - 完美适配桌面、平板和移动设备
- **现代化UI** - 使用最新的设计趋势和动画效果
- **优化性能** - 快速加载和流畅的用户体验
- **SEO友好** - 优化的元标签和语义化HTML
- **交互式元素** - 动态导航、表单验证和通知系统

## 📁 项目结构

```
PersonalWebsite/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # JavaScript功能
├── README.md           # 项目说明
└── assets/             # 资源文件（图片、图标等）
```

## 🚀 本地开发

1. **克隆或下载项目**
2. **在浏览器中打开 `index.html`**
3. **开始自定义内容**

### 推荐使用本地服务器：

```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx http-server

# 使用PHP
php -S localhost:8000
```

然后访问 `http://localhost:8000`

## 🎨 自定义指南

### 修改个人信息

编辑 `index.html` 文件中的以下部分：

1. **个人介绍** - 修改 `.hero-title` 和 `.hero-subtitle` 内容
2. **关于我** - 更新 `.about-text` 部分的描述
3. **技能** - 编辑 `.skills-grid` 中的技能卡片
4. **项目** - 更新 `.projects-grid` 中的项目展示
5. **联系信息** - 修改 `.contact-methods` 中的联系方式

### 更改颜色主题

在 `styles.css` 文件的 `:root` 部分修改CSS变量：

```css
:root {
    --primary-color: #6366f1;    /* 主色调 */
    --secondary-color: #8b5cf6;  /* 辅助色 */
    --accent-color: #06b6d4;     /* 强调色 */
    /* ... 其他变量 */
}
```

### 添加自己的图片

1. 创建 `assets/images/` 文件夹
2. 添加您的图片文件
3. 在HTML中替换占位符图标

## 🌐 部署到 playerinmetaverse.tech

### 方法1: 使用GitHub Pages

1. **创建GitHub仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/playerinmetaverse.git
   git push -u origin main
   ```

2. **启用GitHub Pages**
   - 在GitHub仓库设置中启用Pages
   - 选择main分支作为源

3. **配置自定义域名**
   - 在仓库根目录创建 `CNAME` 文件
   - 内容为：`playerinmetaverse.tech`

### 方法2: 使用Netlify

1. **连接GitHub仓库**
   - 登录 [Netlify](https://netlify.com)
   - 连接您的GitHub仓库

2. **配置构建设置**
   - Build command: 留空
   - Publish directory: `./`

3. **设置自定义域名**
   - 在Netlify控制台添加域名
   - 按照DNS配置指引操作

### 方法3: 使用Vercel

1. **部署到Vercel**
   ```bash
   npm i -g vercel
   vercel --prod
   ```

2. **配置域名**
   - 在Vercel控制台添加自定义域名
   - 配置DNS记录

### DNS配置指南

无论使用哪种托管服务，您需要在域名注册商处配置DNS：

1. **对于GitHub Pages:**
   ```
   Type: CNAME
   Name: www
   Value: yourusername.github.io

   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

2. **对于Netlify:**
   ```
   Type: CNAME
   Name: www
   Value: your-site-name.netlify.app

   Type: A
   Name: @
   Value: 75.2.60.5
   ```

3. **对于Vercel:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com

   Type: A
   Name: @
   Value: 76.76.19.61
   ```

## 📧 联系表单设置

当前表单是前端演示版本。要使其真正工作，您需要：

### 选项1: 使用Netlify Forms
在表单中添加 `netlify` 属性：
```html
<form class="contact-form" netlify>
```

### 选项2: 使用Formspree
1. 注册 [Formspree](https://formspree.io)
2. 修改表单action：
```html
<form class="contact-form" action="https://formspree.io/f/your-form-id" method="POST">
```

### 选项3: 使用EmailJS
1. 注册 [EmailJS](https://emailjs.com)
2. 配置邮件服务
3. 修改 `script.js` 中的表单处理代码

## 🔧 高级功能

### 添加博客系统
建议使用静态网站生成器：
- [Jekyll](https://jekyllrb.com) (GitHub Pages原生支持)
- [Gatsby](https://gatsbyjs.com)
- [Next.js](https://nextjs.org)

### 添加CMS
推荐无头CMS：
- [Forestry](https://forestry.io)
- [Netlify CMS](https://netlifycms.org)
- [Strapi](https://strapi.io)

### 添加分析
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## 📱 移动端优化

网站已经包含以下移动端优化：
- 响应式布局
- 触摸友好的导航
- 优化的字体大小
- 快速加载的图片

## 🛡️ 安全性

建议的安全措施：
- 启用HTTPS（托管服务通常自动提供）
- 设置安全标头
- 定期更新依赖项

## 📈 SEO优化

已包含的SEO优化：
- 语义化HTML标签
- Meta描述和关键词
- Open Graph标签
- 结构化数据

## 🎯 性能优化

建议的性能优化：
- 压缩图片（使用WebP格式）
- 启用Gzip压缩
- 使用CDN
- 延迟加载图片

## 💡 常见问题

**Q: 如何更改网站语言？**
A: 修改HTML中的 `lang` 属性和所有文本内容。

**Q: 如何添加更多页面？**
A: 创建新的HTML文件并更新导航链接。

**Q: 如何优化搜索引擎排名？**
A: 定期更新内容，优化关键词，获取外部链接。

## 📞 支持

如果您在部署过程中遇到问题，可以：
1. 查看托管服务的文档
2. 检查DNS配置是否正确
3. 确认域名已正确指向服务器

---

**祝您部署成功！🚀**

如需进一步定制或有技术问题，欢迎联系。 