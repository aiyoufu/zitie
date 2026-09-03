# 字帖

> 一个零依赖、开箱即用的中文练字字帖生成工具，纯前端实现，浏览器打开即用。

![预览](./docs/screenshot.png)

## ✨ 特性

- **多种字格**：田字格、米字格、回宫格、空白方格、拼音田字格（上四线 + 下田字）、四线三格
- **拼音标注**：自动为汉字注音，支持声调；支持多音字手动校正（`字(zì)` 格式），并可关闭注音用于默写
- **字体自由切换**：默认使用开源/免费商用字体（霞鹜文楷、思源宋体、思源黑体），也支持选择系统中文化字体（仅限个人非商业学习）
- **笔顺动画**：基于 [hanzi-writer](https://hanziwriter.org/) 笔顺数据，鼠标悬停可查看汉字书写顺序
- **打印优化**：A4 纸张排版，深色/打印主题，打印时自动隐藏 UI
- **响应式设计**：桌面端与移动端自适应，移动端提供底部 Dock 快捷菜单
- **深色模式**：浅色 / 深色 / 跟随系统三档可选
- **零构建**：纯 HTML / CSS / JavaScript，无需 npm install，无需打包

## 🚀 在线演示

👉 https://zitie-6zq.pages.dev/

## 🧑‍💻 本地运行

本项目**无构建步骤**，直接用任意静态服务器即可：

```bash
# 方式一：Python（最常用）
python -m http.server 8080

# 方式二：Node.js
npx serve .

# 方式三：直接双击 index.html
# 注意：部分浏览器对本地文件的 fetch 有限制，推荐用上面两种方式之一
```

然后在浏览器中打开 `http://localhost:8080` 即可。

## 🧱 技术栈

| 类别 | 技术 |
| --- | --- |
| 核心 | 原生 HTML / CSS / JavaScript（ES2020+），无框架 |
| 笔顺数据 | [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)（Arphic Public License） |
| 拼音库 | [pinyin-pro](https://github.com/zh-lx/pinyin-pro)（MIT） |
| 字体 | 霞鹜文楷、思源黑体 / 思源宋体（详见 [FONTS.md](./FONTS.md)） |

## 🔤 字体与版权说明

项目默认推荐 **SIL Open Font License 1.1** 的开源字体（可免费商用），
也提供系统中文化字体（华文行楷、微软雅黑、方正姚体等）作为备选。

**重要**：系统中文化字体多为**商业字体**，选择后生成的字帖**仅限个人非商业学习交流使用**。
项目在 UI 上有明确的版权提示弹窗。完整字体清单与协议说明见 [FONTS.md](./FONTS.md)。

## 📦 第三方依赖

所有打包到 `vendor/` 目录的第三方库的协议、来源、版本号，见
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 🗂 目录结构

```
zitie/
├── index.html          # 入口 HTML
├── app.js              # 核心逻辑
├── styles.css          # 样式表
├── assets/             # 背景图片等资源
│   └── backgrounds/
├── vendor/             # 第三方依赖（带各自 LICENSE）
│   ├── hanzi-writer-data/
│   └── pinyin-pro/
├── docs/               # 截图、文档
├── LICENSE             # MIT 协议
├── FONTS.md            # 字体授权清单
├── THIRD_PARTY_NOTICES.md  # 第三方依赖声明
└── README.md
```

## 🤝 贡献

欢迎通过 Issue 反馈问题、提建议，或通过 PR 贡献代码。

- 代码风格：保持与现有文件一致，无 lint 配置要求
- Commit 风格：推荐使用 [Conventional Commits](https://www.conventionalcommits.org/)（如 `feat:`、`fix:`、`chore:`）
- 大改动前请先开 Issue 讨论

## 🐛 常见问题

**Q: 打开后白屏？**
A: 项目默认从 Google Fonts 与 jsDelivr CDN 加载字体。如网络受限，可下载 woff2 文件到 `assets/fonts/` 后修改 `styles.css` 的 `@font-face` 路径。

**Q: 打印时字格错位？**
A: 请在打印预览中确认纸张为 A4、缩放为 100%、关闭「适合页面」选项。

**Q: 多音字注音不准？**
A: 在文字输入框中用 `字(zì)` 格式手动指定读音，应用会优先使用手动标注。

## 📄 协议

本项目基于 [MIT License](./LICENSE) 开源。

## 🙏 致谢

- [hanzi-writer](https://hanziwriter.org/) - 汉字笔顺数据与可视化
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) - 汉字拼音库
- [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) - 霞鹜文楷字体
- [Google Noto Fonts](https://fonts.google.com/noto) - 思源黑体 / 思源宋体

## ⭐ Star History

如果这个项目对你有帮助，欢迎点个 Star 支持一下！
