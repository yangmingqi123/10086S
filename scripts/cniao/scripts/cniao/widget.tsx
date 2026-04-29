// widget.tsx
import {
  VStack,
  HStack,
  ZStack,
  Image,
  Text,
  Button,
  Widget,
  WidgetReloadPolicy,
  DynamicShapeStyle,
  fetch,
} from "scripting"
import { RefreshCainiaoIntent, ShowNextCainiaoItemIntent } from "./app_intents"

type PickupItem = {
  status: string
  relation: string // 取件人关系
  name: string // 商品名称
  code: string // 取件码
  pic: string // 图片 URL
  stationName: string // 取件站点名称
  postBrandName: string // 快递品牌名称
}

type Theme = {
  bg: DynamicShapeStyle
  panelBg: DynamicShapeStyle
  pillBg: DynamicShapeStyle
  softBg: DynamicShapeStyle
  title: DynamicShapeStyle
  secondary: DynamicShapeStyle
  tertiary: DynamicShapeStyle
  code: DynamicShapeStyle
  icon: DynamicShapeStyle
  badgeBg: DynamicShapeStyle
  badgeText: DynamicShapeStyle
}

const theme: Theme = {
  bg: { light: "rgba(234, 243, 255, 0.92)", dark: "rgba(12, 24, 43, 0.92)" },
  panelBg: { light: "rgba(255, 255, 255, 0.84)", dark: "rgba(19, 37, 63, 0.90)" },
  pillBg: { light: "rgba(255, 255, 255, 0.78)", dark: "rgba(24, 45, 75, 0.94)" },
  softBg: { light: "rgba(43, 108, 255, 0.10)", dark: "rgba(106, 166, 255, 0.16)" },
  title: { light: "rgba(17, 24, 39, 0.92)", dark: "rgba(243, 244, 246, 0.92)" },
  secondary: { light: "rgba(107, 114, 128, 0.95)", dark: "rgba(156, 163, 175, 0.95)" },
  tertiary: { light: "rgba(148, 163, 184, 0.95)", dark: "rgba(100, 116, 139, 0.95)" },
  code: { light: "rgba(43, 108, 255, 0.98)", dark: "rgba(106, 166, 255, 0.98)" },
  icon: { light: "rgba(43, 108, 255, 0.85)", dark: "rgba(106, 166, 255, 0.90)" },
  badgeBg: { light: "rgba(43, 108, 255, 0.14)", dark: "rgba(106, 166, 255, 0.18)" },
  badgeText: { light: "rgba(35, 86, 209, 0.98)", dark: "rgba(160, 205, 255, 0.98)" },
}

// ========== 假数据（可留空，接口失败会回退） ==========
const mockItems: PickupItem[] = []

type PackageResult = {
  items: PickupItem[] | null
  errorMessage?: string
}

type CainiaoSettings = {
  boxJsUrl: string
  refreshInterval: number
}

const SETTINGS_KEY = "cniaoSettings"
const DEFAULT_SETTINGS: CainiaoSettings = {
  boxJsUrl: "http://boxjs.com",
  refreshInterval: 15,
}

const CAINIAO_API_URL = "https://caps-mtop.cainiao.com/gw/mtop.cainiao.lpc.packageservice.querypdspackagedatalist.cn/1.0"

// 读取脚本设置；如果用户还没保存，则回退到默认值。
function getSettings(): CainiaoSettings {
  const savedSettings = Storage.get<Partial<CainiaoSettings>>(SETTINGS_KEY) ?? {}

  return {
    boxJsUrl: savedSettings.boxJsUrl?.trim() || DEFAULT_SETTINGS.boxJsUrl,
    refreshInterval: typeof savedSettings.refreshInterval === "number" && savedSettings.refreshInterval > 0
      ? savedSettings.refreshInterval
      : DEFAULT_SETTINGS.refreshInterval,
  }
}

// 从 BoxJS 读取菜鸟请求头 JSON。
async function fetchCainiaoHeadersToken(boxJsUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${boxJsUrl.replace(/\/$/, "")}/query/data/cainiao_pcs_headers_json`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.log("读取 BoxJS 失败:", response.status)
      return null
    }

    const json = await response.json()
    const token = json?.val
    if (typeof token === "string" && token.trim()) {
      return token.trim()
    }

    console.log("BoxJS 返回值为空:", json)
    return null
  } catch (error) {
    console.log("读取 BoxJS 异常:", error)
    return null
  }
}

// 将 BoxJS 里的 headers JSON 解析为可直接请求的 headers 对象。
function parseCainiaoHeaders(token: string): Record<string, string> | null {
  const candidates = [token]

  try {
    const decoded = decodeURIComponent(token)
    if (decoded !== token) {
      candidates.push(decoded)
    }
  } catch (error) {
    console.log("decodeURIComponent 失败:", error)
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>
      return normalizeHeaders(parsed)
    } catch (error) {
      console.log("headers JSON 解析失败:", error)
    }
  }

  return null
}

// 规范化 headers，过滤空 key，并把 value 统一转成字符串。
function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    const trimmedKey = key.trim()
    if (!trimmedKey || value == null) {
      continue
    }

    if (typeof value === "object") {
      normalized[trimmedKey] = JSON.stringify(value)
      continue
    }

    normalized[trimmedKey] = String(value)
  }

  return normalized
}

// 不区分大小写读取请求头。
function getHeaderCaseInsensitive(headers: Record<string, string>, name: string): string {
  const target = name.toLowerCase()

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value
    }
  }

  return ""
}

// 不区分大小写设置请求头；如果已存在则覆盖，否则新增。
function setHeaderCaseInsensitive(headers: Record<string, string>, name: string, value: string): void {
  const target = name.toLowerCase()

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      headers[key] = value
      return
    }
  }

  headers[name] = value
}

// 不区分大小写删除请求头，避免把抓包时的无效长度等信息带到新请求里。
function unsetHeaderCaseInsensitive(headers: Record<string, string>, name: string): void {
  const target = name.toLowerCase()

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      delete headers[key]
    }
  }
}

// 刷新请求里和时间相关的字段，避免直接复用抓包时的旧值。
function refreshTimeHeaders(headers: Record<string, string>): void {
  const nowSec = Math.floor(Date.now() / 1000)
  const nowMs = Date.now()

  setHeaderCaseInsensitive(headers, "x-t", String(nowSec))

  const launchInfo = getHeaderCaseInsensitive(headers, "c-launch-info")
  if (!launchInfo) {
    return
  }

  const parts = launchInfo.split(",")
  if (parts.length >= 3) {
    parts[2] = String(nowMs)
    setHeaderCaseInsensitive(headers, "c-launch-info", parts.join(","))
  }
}

// 生成接口请求需要的随机 rnd。
function generateRnd(): string {
  const alphabet = "0123456789ABCDEF"
  let result = ""
  for (let index = 0; index < 32; index += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return result
}

// 构建菜鸟包裹查询接口 URL。
function buildCainiaoApiUrl(page = 1, size = 40): string {
  const data = {
    currentPage: page,
    pageSize: size,
    needTemporality: false,
    needDynInfo: "{'needFindTemporality':true,'needAppointment':true}",
  }

  return `${CAINIAO_API_URL}?rnd=${encodeURIComponent(generateRnd())}&data=${encodeURIComponent(JSON.stringify(data))}`
}

// 校验关键 headers 是否存在，缺失时直接提示登录态或 token 有问题。
function validateCainiaoHeaders(headers: Record<string, string>): string | null {
  const requiredHeaders = ["x-t", "x-sid", "x-sign", "x-mini-wua", "Cookie"]

  for (const headerName of requiredHeaders) {
    if (!getHeaderCaseInsensitive(headers, headerName).trim()) {
      return `缺少请求头: ${headerName}`
    }
  }

  return null
}

// 从接口响应中提取 packages 数组并转换成小组件数据。
function extractPackagesFromResponse(json: unknown): PickupItem[] | null {
  const packages = (json as { data?: { packages?: unknown } })?.data?.packages
  if (!Array.isArray(packages)) {
    return null
  }

  return filterAndFormatPackages(packages)
}

// 过滤并格式化包裹列表，只保留派送中、待取件、运输中这几种状态。
function filterAndFormatPackages(packages: unknown[]): PickupItem[] {
  const allowShowStatuses = ["派送中", "待取件", "运输中"]
  const statusMap: Record<string, string> = {
    派送中: "派送中",
    待取件: "待取件",
    运输中: "运输中",
    已揽件: "运输中",
    已揽收: "运输中",
    已发货: "运输中",
    揽收: "运输中",
    揽件: "运输中",
  }

  const result: PickupItem[] = []

  for (const pkg of packages) {
    if (!pkg || typeof pkg !== "object") {
      continue
    }

    const packageData = pkg as Record<string, unknown>
    let feature: Record<string, unknown> = {}
    if (typeof packageData.feature === "string" && packageData.feature) {
      try {
        const parsedFeature = JSON.parse(packageData.feature) as Record<string, unknown>
        feature = parsedFeature ?? {}
      } catch (error) {
        console.log("feature 解析失败:", error)
      }
    }

    const featureObj = typeof packageData.featureObj === "object" && packageData.featureObj
      ? packageData.featureObj as Record<string, unknown>
      : {}
    const packageStation = typeof packageData.packageStation === "object" && packageData.packageStation
      ? packageData.packageStation as Record<string, unknown>
      : {}

    let rawStatus = String(packageData.logisticsStatusDesc ?? "")
    if (!rawStatus) {
      rawStatus = String(feature.packageStatusDesc ?? feature.packageStatusInfoDesc ?? "")
    }

    const showStatus = statusMap[rawStatus] ?? rawStatus
    if (!allowShowStatuses.includes(showStatus)) {
      continue
    }

    let relation = String(packageData.phoneRelation ?? "")
    if (!relation) {
      relation = String(featureObj.phoneRelation ?? "")
    }
    if (!relation) {
      relation = String(featureObj.bindingUserRemark ?? featureObj.bindingRemark ?? "")
    }

    let postBrandName = String(packageStation.postBrandName ?? "")
    if (!postBrandName) {
      postBrandName = String(featureObj.postBrandName ?? "")
    }

    let stationName = String(packageStation.stationName ?? "")
    if (!stationName) {
      stationName = String(featureObj.postName ?? featureObj.daishouName ?? "")
    }

    let pickupCode = String(packageData.stationOrderPickUpCode ?? "")
    if (!pickupCode) {
      pickupCode = String(featureObj.stationOrderPickUpCode ?? "")
    }

    let title = ""
    const packageItems = Array.isArray(packageData.packageItem) ? packageData.packageItem : []
    if (packageItems[0] && typeof packageItems[0] === "object") {
      title = String((packageItems[0] as Record<string, unknown>).itemTitle ?? "")
    }
    if (!title) {
      title = String(feature.recommendPackageTitle ?? "")
    }
    if (!title) {
      title = String(featureObj.recommendAbbPackageTitle ?? "")
    }

    result.push({
      status: showStatus,
      relation,
      postBrandName,
      stationName,
      pic: String(feature.recommendPackagePic ?? ""),
      code: pickupCode,
      name: title,
    })
  }

  return result
}

// 从接口响应中提取可展示的错误信息，优先使用 message 字段。
function getResponseMessage(json: unknown, fallbackMessage: string): string {
  const message = (json as { message?: unknown })?.message
  if (typeof message === "string" && message.trim()) {
    return message.trim()
  }

  return fallbackMessage
}

// 获取包裹列表；失败时返回接口 message，避免界面误显示为“暂无待取”。
async function getPackages(): Promise<PackageResult> {
  const settings = getSettings()
  const headersJson = await fetchCainiaoHeadersToken(settings.boxJsUrl)
  if (!headersJson) {
    return {
      items: null,
      errorMessage: "未读取到 cainiao_pcs_headers_json",
    }
  }

  const headers = parseCainiaoHeaders(headersJson)
  if (!headers) {
    return {
      items: null,
      errorMessage: "cainiao_pcs_headers_json 不是有效的 JSON",
    }
  }

  try {
    const url = buildCainiaoApiUrl()
    setHeaderCaseInsensitive(headers, "Host", "caps-mtop.cainiao.com")
    setHeaderCaseInsensitive(headers, "Accept", "application/json")
    setHeaderCaseInsensitive(headers, "Accept-Encoding", "gzip")
    unsetHeaderCaseInsensitive(headers, "Content-Length")
    unsetHeaderCaseInsensitive(headers, "Connection")
    refreshTimeHeaders(headers)

    const missingHeaderError = validateCainiaoHeaders(headers)
    if (missingHeaderError) {
      return {
        items: null,
        errorMessage: `${missingHeaderError}，token 可能不完整或已失效`,
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    const json = await response.json()

    if (!response.ok) {
      const errorMessage = getResponseMessage(json, `请求出错: ${response.status}`)
      console.log("请求出错:", response.status, errorMessage)
      return {
        items: null,
        errorMessage,
      }
    }

    const items = extractPackagesFromResponse(json)
    if (items) {
      return {
        items,
      }
    }

    console.log("返回 JSON 格式不符合预期:", json)
    return {
      items: null,
      errorMessage: getResponseMessage(json, "返回数据格式不符合预期"),
    }
  } catch (error) {
    console.log("请求出错:", error)
    return {
      items: null,
      errorMessage: "请求出错，请稍后重试",
    }
  }
}

// ===== 小工具：时间 =====
function formatHHmm(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

// 计算包裹的展示优先级：优先展示有取件码的，其次普通状态，运输中放最后。
function getItemPriority(item: PickupItem): number {
  if (item.code.trim()) {
    return 0
  }

  if (item.status === "运输中") {
    return 2
  }

  return 1
}

// 对包裹列表做统一排序，确保所有尺寸下的展示顺序一致。
function sortPickupItems(items: PickupItem[]): PickupItem[] {
  return [...items].sort((left, right) => {
    const priorityDiff = getItemPriority(left) - getItemPriority(right)
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    if (left.status === "派送中" && right.status !== "派送中") {
      return -1
    }

    if (right.status === "派送中" && left.status !== "派送中") {
      return 1
    }

    return 0
  })
}

// 读取 small 尺寸当前页索引，并约束在有效范围内。
function getSmallPageIndex(total: number): number {
  if (total <= 0) {
    return 0
  }

  const savedIndex = Storage.get<number>("cniaoSmallPageIndex") ?? 0
  if (savedIndex < 0) {
    return 0
  }

  return savedIndex % total
}

// 提取包裹的辅助信息，优先展示站点，其次展示快递品牌或关系。
function getItemMeta(item: PickupItem): string {
  return item.stationName || item.postBrandName || item.relation || item.status
}

// 返回显示用的取件码；如果没有取件码，则退回到物流状态。
function getPrimaryCode(item: PickupItem): string {
  return item.code || item.status
}

// 渲染统一的顶部标题栏，保持不同尺寸下的信息层级一致。
function WidgetHeader({
  countText,
  trailingText,
}: {
  countText?: string
  trailingText?: string
}) {
  return (
    <HStack alignment="center" spacing={8} frame={{ minWidth: 0, maxWidth: Infinity }}>
      <HStack alignment="center" spacing={6}>
        <Image systemName="shippingbox.fill" font={14} fontWeight="semibold" foregroundStyle={theme.icon} />
        <Text font={13} fontWeight="bold" foregroundStyle={theme.title} lineLimit={1}>
          菜鸟取件
        </Text>
      </HStack>

      <HStack frame={{ minWidth: 0, maxWidth: Infinity }} />

      {countText ? (
        <Text
          font={11}
          fontWeight="semibold"
          foregroundStyle={theme.badgeText}
          padding={{ top: 4, leading: 8, bottom: 4, trailing: 8 }}
          widgetBackground={{
            style: theme.badgeBg,
            shape: { type: "capsule" },
          }}
        >
          {countText}
        </Text>
      ) : null}

      {trailingText ? (
        <Text font={10} fontWeight="medium" foregroundStyle={theme.tertiary} lineLimit={1}>
          {trailingText}
        </Text>
      ) : null}

      <Button intent={RefreshCainiaoIntent({})}>
        <Image
          systemName="arrow.clockwise"
          font={11}
          fontWeight="bold"
          foregroundStyle={theme.badgeText}
        />
      </Button>
    </HStack>
  )
}

// 统一渲染空状态，避免不同尺寸下出现风格不一致。
function EmptyState({ message }: { message: string }) {
  return (
    <VStack
      alignment="center"
      spacing={8}
      frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
      padding={{ top: 16, leading: 12, bottom: 16, trailing: 12 }}
    >
      <ZStack
        frame={{ width: 42, height: 42 }}
        widgetBackground={{
          style: theme.softBg,
          shape: { type: "rect", cornerRadius: 14, style: "continuous" },
        }}
      >
        <Image systemName="shippingbox" font={20} fontWeight="semibold" foregroundStyle={theme.icon} />
      </ZStack>
      <Text font={13} fontWeight="semibold" foregroundStyle={theme.title}>
        {message}
      </Text>
    </VStack>
  )
}

// 渲染包裹信息行，统一图片、标题、站点和取件码的视觉结构。
function PillRow({ item, compact }: { item: PickupItem; compact?: boolean }) {
  const iconSize = compact ? 13 : 15
  const nameFont = compact ? 11 : 12
  const stationFont = compact ? 9 : 10
  const codeFont = compact ? 13 : 15
  const padY = compact ? 7 : 9
  const picSize = compact ? 24 : 28

  return (
    <HStack
      alignment="center"
      spacing={10}
      padding={{ top: padY, leading: 10, bottom: padY, trailing: 10 }}
      frame={{ minWidth: 0, maxWidth: Infinity }}
      widgetBackground={{
        style: theme.pillBg,
        shape: { type: "rect", cornerRadius: 14, style: "continuous" },
      }}
    >
      <HStack alignment="center" spacing={8} frame={{ minWidth: 0, maxWidth: Infinity }}>
        {item.pic ? (
          <Image
            imageUrl={item.pic}
            resizable
            frame={{ width: picSize, height: picSize }}
          />

        ) : (
          <Image
            systemName="shippingbox.fill"
            font={iconSize}
            fontWeight="semibold"
            foregroundStyle={theme.icon}
          />
        )}

        <VStack alignment="leading" spacing={2} frame={{ minWidth: 0, maxWidth: Infinity }}>
          <Text
            font={nameFont}
            fontWeight="semibold"
            foregroundStyle={theme.title}
            lineLimit={1}
            frame={{ minWidth: 0, maxWidth: Infinity }}
          >
            {item.name}
          </Text>
          <Text
            font={stationFont}
            fontWeight="medium"
            foregroundStyle={theme.secondary}
            lineLimit={1}
            frame={{ minWidth: 0, maxWidth: Infinity }}
          >
            {getItemMeta(item)}
          </Text>
        </VStack>
      </HStack>

      {compact ? (
        <Text
          font={codeFont}
          fontWeight="bold"
          foregroundStyle={theme.code}
          lineLimit={1}
          minScaleFactor={0.72}
        >
          {getPrimaryCode(item)}
        </Text>
      ) : (
        <VStack
          alignment="trailing"
          spacing={2}
          padding={{ top: 4, leading: 8, bottom: 4, trailing: 8 }}
          widgetBackground={{
            style: theme.softBg,
            shape: { type: "rect", cornerRadius: 12, style: "continuous" },
          }}
        >
          <Text font={9} fontWeight="medium" foregroundStyle={theme.tertiary}>
            {item.code ? "取件码" : "状态"}
          </Text>
          <Text
            font={codeFont}
            fontWeight="bold"
            foregroundStyle={theme.code}
            lineLimit={1}
            minScaleFactor={0.72}
          >
            {getPrimaryCode(item)}
          </Text>
        </VStack>
      )}
    </HStack>
  )
}

// 为 medium 尺寸提供更紧凑的单行布局，优先保证 3 条完整展示。
function CompactMediumRow({ item }: { item: PickupItem }) {
  return (
    <HStack
      alignment="center"
      spacing={8}
      padding={{ top: 7, leading: 9, bottom: 7, trailing: 9 }}
      frame={{ minWidth: 0, maxWidth: Infinity }}
      widgetBackground={{
        style: theme.pillBg,
        shape: { type: "rect", cornerRadius: 12, style: "continuous" },
      }}
    >
      <Image
        systemName="shippingbox.fill"
        font={12}
        fontWeight="semibold"
        foregroundStyle={theme.icon}
      />
      <Text
        font={11}
        fontWeight="semibold"
        foregroundStyle={theme.title}
        lineLimit={1}
        minScaleFactor={0.82}
        frame={{ minWidth: 0, maxWidth: Infinity }}
      >
        {item.name || getItemMeta(item)}
      </Text>
      <Text
        font={13}
        fontWeight="bold"
        foregroundStyle={theme.code}
        lineLimit={1}
        minScaleFactor={0.72}
      >
        {getPrimaryCode(item)}
      </Text>
    </HStack>
  )
}

// ===== Small：突出主包裹信息，减少小尺寸排版拥挤 =====
function SmallView({ items }: { items: PickupItem[] }) {
  const total = items.length
  const currentIndex = getSmallPageIndex(total)
  const currentItem = items[currentIndex]

  if (!currentItem) {
    return (
      <ZStack
        frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
        widgetBackground={{
          style: theme.bg,
          shape: { type: "rect", cornerRadius: 18, style: "continuous" },
        }}
      >
        <EmptyState message="暂无待取" />
      </ZStack>
    )
  }

  return (
    <VStack
      alignment="leading"
      spacing={10}
      padding={{ top: 12, leading: 12, bottom: 12, trailing: 12 }}
      frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
      widgetBackground={{
        style: theme.bg,
        shape: { type: "rect", cornerRadius: 18, style: "continuous" },
      }}
    >
      <HStack alignment="center" spacing={8} frame={{ minWidth: 0, maxWidth: Infinity }}>
        <Button intent={ShowNextCainiaoItemIntent({})}>
          <Image
            systemName="chevron.right"
            font={11}
            fontWeight="bold"
            foregroundStyle={theme.badgeText}
          />
        </Button>
        <HStack frame={{ minWidth: 0, maxWidth: Infinity }} />
        <Button intent={RefreshCainiaoIntent({})}>
          <Image
            systemName="arrow.clockwise"
            font={11}
            fontWeight="bold"
            foregroundStyle={theme.badgeText}
          />
        </Button>
      </HStack>

      <VStack
        alignment="leading"
        spacing={8}
        padding={{ top: 12, leading: 12, bottom: 12, trailing: 12 }}
        frame={{ minWidth: 0, maxWidth: Infinity }}
        widgetBackground={{
          style: theme.panelBg,
          shape: { type: "rect", cornerRadius: 16, style: "continuous" },
        }}
      >
        <Text font={13} fontWeight="semibold" foregroundStyle={theme.title} lineLimit={2}>
          {currentItem.name}
        </Text>
        <Text font={10} fontWeight="medium" foregroundStyle={theme.secondary} lineLimit={1}>
          {getItemMeta(currentItem)}
        </Text>
        <HStack alignment="center" spacing={8}>
          <Text
            font={24}
            fontWeight="bold"
            foregroundStyle={theme.code}
            lineLimit={1}
            minScaleFactor={0.55}
            frame={{ minWidth: 0, maxWidth: Infinity }}
          >
            {getPrimaryCode(currentItem)}
          </Text>
          <Text
            font={10}
            fontWeight="semibold"
            foregroundStyle={theme.badgeText}
            padding={{ top: 4, leading: 8, bottom: 4, trailing: 8 }}
            widgetBackground={{
              style: theme.badgeBg,
              shape: { type: "capsule" },
            }}
          >
            {currentIndex + 1} / {total}
          </Text>
        </HStack>
      </VStack>
    </VStack>
  )
}

// ===== Medium：3 条，补充顶部信息栏和统一空状态 =====
function MediumView({ items }: { items: PickupItem[] }) {
  const list = items.slice(0, 3)

  return (
    <ZStack
      frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
      widgetBackground={{
        style: theme.bg,
        shape: { type: "rect", cornerRadius: 18, style: "continuous" },
      }}
    >
      <VStack padding={{ top: 10, leading: 10, bottom: 10, trailing: 10 }} spacing={7}>
        <WidgetHeader countText={`${items.length} 件`} trailingText={formatHHmm(new Date())} />
        {list.length === 0 ? (
          <EmptyState message="暂无待取" />
        ) : (
          list.map((it) => <CompactMediumRow item={it} key={`${it.name}-${it.code}`} />)
        )}
      </VStack>
    </ZStack>
  )
}

// ===== Large：标题 + 6 条，强化头部层级和卡片一致性 =====
function LargeView({ items }: { items: PickupItem[] }) {
  const now = new Date()
  const list = items.slice(0, 6)

  if (list.length === 0) {
    return (
      <ZStack
        frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
        widgetBackground={{
          style: theme.bg,
          shape: { type: "rect", cornerRadius: 20, style: "continuous" },
        }}
      >
        <EmptyState message="暂无待取" />
      </ZStack>
    )
  } else {
    return (
      <ZStack
        frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
        widgetBackground={{
          style: theme.bg,
          shape: { type: "rect", cornerRadius: 20, style: "continuous" },
        }}
      >
        <VStack
          alignment="leading"
          padding={{ top: 12, leading: 12, bottom: 12, trailing: 12 }}
          spacing={10}
          frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
        >
          <WidgetHeader countText={`${items.length} 件`} trailingText={`更新 ${formatHHmm(now)}`} />

          {list.map((it) => (
            <PillRow item={it} compact key={`${it.name}-${it.code}`} />
          ))}

          <VStack frame={{ minHeight: 0, maxHeight: Infinity }} />
        </VStack>
      </ZStack>
    )
  }
}

// ===== 根据小组件尺寸选择视图 =====
function WidgetView({ items }: { items: PickupItem[] }) {
  const family = (Widget as any).family ?? "systemSmall"
  if (family === "systemLarge") return <LargeView items={items} />
  if (family === "systemMedium") return <MediumView items={items} />
  return <SmallView items={items} />
}

// 请求失败时展示统一的错误态，避免和空状态混淆。
function ErrorView({ message }: { message: string }) {
  return (
    <ZStack
      frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
      widgetBackground={{
        style: theme.bg,
        shape: { type: "rect", cornerRadius: 18, style: "continuous" },
      }}
    >
      <VStack
        alignment="center"
        spacing={10}
        padding={{ top: 16, leading: 16, bottom: 16, trailing: 16 }}
        frame={{ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity }}
      >
        <ZStack
          frame={{ width: 42, height: 42 }}
          widgetBackground={{
            style: theme.softBg,
            shape: { type: "rect", cornerRadius: 14, style: "continuous" },
          }}
        >
          <Image systemName="exclamationmark.triangle.fill" font={20} fontWeight="semibold" foregroundStyle={theme.icon} />
        </ZStack>
        <Text font={13} fontWeight="semibold" foregroundStyle={theme.title}>
          菜鸟连接异常
        </Text>
        <Text font={11} fontWeight="medium" foregroundStyle={theme.secondary} lineLimit={3}>
          {message}
        </Text>
      </VStack>
    </ZStack>
  )
}

async function showWidget() {
  const settings = getSettings()
  const refreshMinutes = settings.refreshInterval

  const policy: WidgetReloadPolicy = {
    policy: "after",
    date: new Date(Date.now() + refreshMinutes * 60 * 1000),
  }

  // ✅ 2) 这里改成真实请求（失败/空数组就回退 mockItems）
  const packageResult = await getPackages()
  if (packageResult.items === null) {
    Widget.present(<ErrorView message={packageResult.errorMessage ?? "请求失败，请稍后重试"} />, policy)
    return
  }

  const items = packageResult.items.length > 0 ? packageResult.items : mockItems
  const sortedItems = sortPickupItems(items)
  console.log("🐷 ～ showWidget ～ items:", sortedItems)

  Widget.present(<WidgetView items={sortedItems} />, policy)
}

showWidget()
