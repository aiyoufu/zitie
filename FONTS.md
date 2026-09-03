# 字体授权清单

本项目在 UI 中提供两类字体：开源 / 免费商用字体，以及系统中文化字体。
请根据自己的使用场景合规选择。

---

## 一、开源 / 免费商用字体（推荐）

以下字体在 [styles.css](./styles.css) 中默认加载，可免费用于商业项目，
使用时需保留版权声明。

### 1. 霞鹜文楷（LXGW WenKai）

| 项 | 内容 |
| --- | --- |
| 来源 | <https://github.com/lxgw/LxgwWenKai> |
| 加载方式 | jsDelivr CDN（`@font-face` 引入） |
| 协议 | [SIL Open Font License 1.1](https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt) |
| 商用 | ✅ 允许 |
| 备注 | 项目默认字体，UI 中标注「开源 / 免费商用」 |

### 2. 思源宋体（Noto Serif SC / Source Han Serif）

| 项 | 内容 |
| --- | --- |
| 来源 | Google Fonts（`fonts.googleapis.com`） |
| 协议 | [SIL Open Font License 1.1](https://fonts.google.com/noto/specimen/Noto+Serif+SC/license) |
| 商用 | ✅ 允许 |
| 备注 | Adobe 与 Google 联合开发的中文宋体 |

### 3. 思源黑体（Noto Sans SC / Source Han Sans）

| 项 | 内容 |
| --- | --- |
| 来源 | Google Fonts（`fonts.googleapis.com`） |
| 协议 | [SIL Open Font License 1.1](https://fonts.google.com/noto/specimen/Noto+Sans+SC/license) |
| 商用 | ✅ 允许 |
| 备注 | Adobe 与 Google 联合开发的中文黑体 |

---

## 二、系统中文化字体（仅限个人非商业学习）

以下字体**由操作系统提供，不随本项目分发**，仅在用户本地选择时使用。
它们**绝大多数为商业字体**，受版权保护，**禁止用于任何商业用途**。

| 字体名 | 版权方 | 商用授权 |
| --- | --- | --- |
| 华文楷体（STKaiti / KaiTi） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文行楷（STXingkai） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文草书（STCaoshu） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文隶书（STLiti） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文新魏（STXinwei） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文黑体（STHeiti） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文彩云（STCaiyun） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文宋体（STSong） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 华文仿宋（STFangsong） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 微软雅黑（Microsoft YaHei） | 微软公司 | ❌ 仅限 Windows 系统内使用 |
| 苹方（PingFang SC） | 苹果公司 | ❌ 仅限 Apple 系统内使用 |
| 方正姚体（FZYaoTi） | 北京北大方正电子 | ❌ 商业用途需授权 |
| 宋体（SimSun） | 中易中标电子 | ❌ 商业用途需授权 |
| 新宋体（NSimSun） | 中易中标电子 | ❌ 商业用途需授权 |
| 仿宋（FangSong） | 中易中标电子 | ❌ 商业用途需授权 |
| 楷体（KaiTi / KaiTi_GB2312） | 中易中标电子 | ❌ 商业用途需授权 |
| 黑体（SimHei） | 中易中标电子 | ❌ 商业用途需授权 |
| 隶书（LiSu） | 中易中标电子 | ❌ 商业用途需授权 |
| 幼圆（YouYuan） | 中易中标电子 | ❌ 商业用途需授权 |
| 行楷 SC（Xingkai SC） | 苹果公司 | ❌ 仅限 Apple 系统内使用 |

> ⚠️ 上述信息仅供参考，实际授权状态请以各字体版权方官方说明为准。
> 商业使用前请联系版权方获取书面授权。

---

## 三、本项目中的版权提示

- 项目 UI 中，字体下拉框明确分组为「开源 / 免费商用字体（推荐）」和「系统标准字体（仅限个人非商业学习）」
- 切换至非开源字体时，UI 上有「版权说明」提示框（参见 `index.html` 中的 `.help-tip-pop`）
- 项目首次加载时，若检测到用户选择了商业字体，会弹出**版权声明模态框**要求用户确认

## 四、离线部署（可选）

如果你的部署环境无法访问 `fonts.googleapis.com` 或 `cdn.jsdelivr.net`，
可按以下步骤将字体离线化：

1. 下载 woff2 文件到 `assets/fonts/`，例如：
   ```
   assets/fonts/LXGWWenKai-Regular.woff2
   assets/fonts/NotoSansSC-Regular.woff2
   assets/fonts/NotoSerifSC-Regular.woff2
   ```
2. 修改 `styles.css` 顶部的 `@font-face` 与 `@import`，改为相对路径
3. 重新部署即可完全离线运行
