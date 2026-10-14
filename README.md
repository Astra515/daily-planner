# 我的日常计划 · GitHub Pages 发布版

这个文件夹可以直接作为 GitHub Pages 的网站根目录，无需安装依赖或构建。

已包含：第7-19周课表、每周变化的实验教室、每日待办、周任务排期、笔记、备份导入导出，以及六个作息时段。当前不创建任何提醒。

| 时段 | 时间 | 用途 |
|---|---|---|
| 1 | 08:00-09:50 | 对应原课表第一行 |
| 2 | 10:10-12:00 | 对应原课表第二行 |
| 3 | 14:00-15:50 | 对应原课表第三行 |
| 4 | 16:10-18:00 | 对应原课表第四行 |
| 5 | 19:00-20:50 | 对应原课表第五行 |
| 6 | 21:10-23:00 | 无课，可安排任务 |

## 发布步骤

1. 登录 GitHub。在右上角的 `+` 菜单中选择 `New repository`。
2. 仓库名填写 `daily-planner`，选择 `Public`（公开）。勾选创建 README，让仓库有 `main` 分支，然后创建仓库。GitHub Free 的 Pages 需要使用公开仓库。
3. 解压下载的发布包。进入仓库的 `Code` 页面，点击 `Add file → Upload files`。
4. 上传解压出来的文件夹**里面的文件**，而不是把整个文件夹作为子目录上传。上传后，仓库首页就应能直接看到 `index.html`、`app.js`、`core.js`、`style.css`、`schedule.json`、`plan.json`。README 可以替换原有内容。`.nojekyll` 是空文件，如果文件管理器隐藏了它，其余普通静态文件也可先发布。
5. 点击 `Commit changes` 完成上传，保存在 `main` 分支。
6. 打开仓库 `Settings → Pages`，在 `Build and deployment` 下设置：
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/(root)`
   - 点击 `Save`。
7. 等待 GitHub 构建。发布通常需要几分钟，官方说明更新可能需要最多约10分钟。Pages 页面会显示实际发布地址。
8. 网址通常为 `https://你的GitHub用户名.github.io/daily-planner/`。使用 Pages 页面实际给出的链接，注意结尾的 `/`。

上面是网址格式示例；实际发布地址以仓库 Settings → Pages 页面为准。

## 原网页记录迁移

网页中的自行添加任务、完成状态和笔记保存在当前浏览器。更换网址后，浏览器会把它视为另一个网站。

在原网页打开右上角齿轮 → 导出备份。在 GitHub Pages 新网页上点击齿轮 → 导入备份。旧记录不会自动跨网址迁移。

## 更新网页

修改文件后，将新文件上传到同一个仓库的 `main` 分支。GitHub Pages 会再次发布。绑定自己的域名可在 `Settings → Pages → Custom domain` 中配置，具体 DNS 记录需按 GitHub 官方文档填写。

日常使用不需要 GitHub 登录，创建仓库和更新文件需要登录你的 GitHub 账号。不同地区和网络的实际访问效果请用发布后的地址测试。

## 文件说明

- `index.html`：网页入口。
- `style.css`：适配手机和电脑的样式。
- `app.js` / `core.js`：任务交互、作息及排期逻辑。
- `schedule.json`：课程与周次数据。
- `plan.json`：从聊天安排后发布到网页的计划，目前清单为空。
- `.nojekyll`：按普通静态文件发布。

## 官方说明

- 创建 Pages 网站：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- 设置发布分支：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- 绑定域名：https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
