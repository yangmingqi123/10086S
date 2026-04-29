# Minky Scripting

基于 [Scripting](https://scriptingapp.github.io/) 的个人脚本仓库。

当前仓库主要包含一个菜鸟取件小组件脚本 `cniao`，用于在桌面小组件中查看待取件、派送中和运输中的包裹信息。

## 当前脚本

### `cniao`

功能：

- 直接从 BoxJS 读取 `cainiao_pcs_headers_json`
- 直连菜鸟接口获取包裹数据
- 按优先级排序展示包裹
  - 优先展示有取件码的包裹
  - `派送中` 优先于 `运输中`
  - `运输中` 放在最后
- 支持 `small / medium / large` 三种组件样式
- 支持组件内点击刷新
- `small` 尺寸支持点击“下一条”切换当前展示包裹

## 目录结构

```text
.
├── dts/                         # Scripting 类型定义
├── scripts/
│   └── cniao/
│       ├── index.tsx           # 设置页
│       ├── widget.tsx          # 小组件入口
│       ├── app_intents.tsx     # 刷新 / 下一条按钮 intent
│       ├── script.json         # 脚本元数据
│       ├── tsconfig.json
│       └── dts/
├── tsconfig.json
└── README.md
```

## `cniao` 使用说明

### 1. 前置条件

需要先在 BoxJS 中拿到：

- `cainiao_pcs_headers_json`

这个值需要是有效的菜鸟请求头 JSON，且登录态未过期。

### 2. 设置项

进入 `cniao` 的设置页后，可以配置：

- `BoxJs 地址`
- `刷新间隔（分钟）`

默认 BoxJS 地址：

```text
http://boxjs.com
```

### 3. 交互说明

- `small`
  - 顶部左侧按钮：切换到下一条包裹
  - 顶部右侧按钮：刷新组件
- `medium`
  - 展示 3 条紧凑列表
- `large`
  - 展示更多条目，并显示更新时间

## 开发说明

### 类型检查

仓库使用 TypeScript 和 Scripting 自带类型定义：

```bash
npx tsc -p scripts/cniao/tsconfig.json --noEmit
```

如果本地没有安装 `typescript`，需要先安装后再执行。

### 代码约定

仓库当前约定：

- 新写的方法需要添加注释
- 注释不要使用 emoji

## 注意事项

- `cainiao_pcs_headers_json` 过期后，组件会请求失败，需要重新抓取
- 组件内按钮依赖 `AppIntent`
- 小组件展示能力受 Scripting 宿主限制影响，部分动画或复杂交互不一定稳定

## 作者

- Minky
- Email: `minkyfun@qq.com`
