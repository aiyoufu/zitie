# 第三方依赖声明

本项目在 `vendor/` 目录下打包了以下第三方库，并保留各自的版权与协议。
本项目本体使用 MIT 协议，但下列第三方库各自使用其原始协议。

---

## 1. hanzi-writer-data

| 项 | 内容 |
| --- | --- |
| 仓库 | <https://github.com/chanind/hanzi-writer-data> |
| 用途 | 提供汉字笔顺数据（hanzi-writer 依赖） |
| 协议 | **Arphic Public License**（注：与 GPL 不同，允许商用嵌入） |
| 版权 | © 2017 Jonathan Hsu |
| 路径 | `vendor/hanzi-writer-data/` |

> 📌 **Arphic Public License 说明**：该协议基于 Arphic 公有字体许可证，
> 允许在软件中嵌入、修改与分发，**包括商业用途**。
> 主要约束是不得单独销售笔顺数据本身。
> 完整文本见 `vendor/hanzi-writer-data/LICENSE` 或上游仓库。

---

## 2. pinyin-pro

| 项 | 内容 |
| --- | --- |
| 仓库 | <https://github.com/zh-lx/pinyin-pro> |
| 用途 | 汉字 → 拼音转换（含多音字、声调） |
| 协议 | **MIT License** |
| 版权 | © zh-lx |
| 路径 | `vendor/pinyin-pro/` |

完整协议见 `vendor/pinyin-pro/LICENSE` 或上游仓库。

---

## 网络加载资源（运行时）

下列资源**不打包进仓库**，由浏览器运行时从 CDN 加载：

| 资源 | 来源 | 协议 |
| --- | --- | --- |
| Noto Sans SC / Noto Serif SC | `fonts.googleapis.com` | SIL OFL 1.1 |
| LXGW WenKai | `cdn.jsdelivr.net/npm/lxgw-wenkai-webfont` | SIL OFL 1.1 |

详情见 [FONTS.md](./FONTS.md)。

---

## 协议兼容性说明

- 本项目主体：MIT
- 引入的 `hanzi-writer-data`（Arphic Public License）：与 MIT 兼容，可在 MIT 项目中使用
- 引入的 `pinyin-pro`（MIT）：与 MIT 兼容

因此本项目可以整体以 MIT 协议分发，**不与上述依赖协议冲突**。

---

## 升级依赖

升级任一第三方库后，请同步更新本文件中对应的版本号与协议信息。
