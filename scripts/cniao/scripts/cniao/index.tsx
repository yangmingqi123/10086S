import {
  Navigation,
  Form,
  Section,
  TextField,
  Button,
  useState,
  Text,
  VStack,
  Spacer,
  Script,
} from "scripting"

type CainiaoSettings = {
  boxJsUrl: string
  refreshInterval: number
}

const SETTINGS_KEY = "cniaoSettings"
const VERSION = "1.0.0"
const DEFAULT_SETTINGS: CainiaoSettings = {
  boxJsUrl: "http://boxjs.com",
  refreshInterval: 15,
}

// 读取当前设置；如果还没有保存过，就使用默认值。
function getInitialSettings(): CainiaoSettings {
  const savedSettings = Storage.get<Partial<CainiaoSettings>>(SETTINGS_KEY) ?? {}

  return {
    boxJsUrl: savedSettings.boxJsUrl?.trim() || DEFAULT_SETTINGS.boxJsUrl,
    refreshInterval: typeof savedSettings.refreshInterval === "number" && savedSettings.refreshInterval > 0
      ? savedSettings.refreshInterval
      : DEFAULT_SETTINGS.refreshInterval,
  }
}

// 将输入字符串转成合法的刷新间隔分钟数。
function parseRefreshInterval(value: string, fallbackValue: number): number {
  const parsedValue = parseInt(value, 10)
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return fallbackValue
  }

  return parsedValue
}

// 渲染 cniao 的设置页面，并负责保存用户输入。
function SettingsPage() {
  const dismiss = Navigation.useDismiss()
  const initialSettings = getInitialSettings()
  const [boxJsUrl, setBoxJsUrl] = useState(initialSettings.boxJsUrl)
  const [refreshInterval, setRefreshInterval] = useState(String(initialSettings.refreshInterval))

  // 保存设置并关闭当前页面。
  function handleSave(): void {
    const nextSettings: CainiaoSettings = {
      boxJsUrl: boxJsUrl.trim() || DEFAULT_SETTINGS.boxJsUrl,
      refreshInterval: parseRefreshInterval(refreshInterval, DEFAULT_SETTINGS.refreshInterval),
    }

    Storage.set(SETTINGS_KEY, nextSettings)
    dismiss()
  }

  return (
    <VStack>
      <Form>
        <Section
          title="BoxJs 配置"
          footer={<Text>用于读取 cainiao_pcs_headers_json。默认地址是 http://boxjs.com。</Text>}
        >
          <TextField
            title="BoxJs 地址"
            value={boxJsUrl}
            prompt="请输入 BoxJs 地址"
            onChanged={setBoxJsUrl}
          />
        </Section>

        <Section
          title="刷新设置"
          footer={<Text>设置小组件自动刷新间隔，单位为分钟。</Text>}
        >
          <TextField
            title="刷新间隔"
            value={refreshInterval}
            prompt="请输入分钟数"
            onChanged={setRefreshInterval}
          />
        </Section>

        <Button title="保存设置" action={handleSave} />
      </Form>
      <Spacer />
      <VStack alignment="center" spacing={4} padding={{ bottom: 10 }}>
        <Text font="caption2" foregroundStyle="secondaryLabel">
          cniao 设置
        </Text>
        <Text font="caption2" foregroundStyle="secondaryLabel">
          Version {VERSION}
        </Text>
      </VStack>
    </VStack>
  )
}

// 展示设置页面，并在页面关闭后退出脚本。
function presentSettingsPage(): void {
  Navigation.present({
    element: <SettingsPage />,
  }).then(() => {
    Script.exit()
  })
}

// 注册 onResume，满足脚本宿主对生命周期的要求。
Script.onResume(() => {
  presentSettingsPage()
})

presentSettingsPage()
