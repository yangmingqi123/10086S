import { VStack, Text, Navigation, Script, Widget, HStack, Link, Form, Section, TextField, useState ,Button} from "scripting"

const VERSION = "1.0.0"
type chinaMobileSettings = {
    cookie: string
    refreshInterval: string
}

function MainView() {

  // 获取上下文中的 `dismiss` 函数
  const dismiss = Navigation.useDismiss()

  const setting = Storage.get<chinaMobileSettings>("chinaMobileSettings")

  const [cookie, setCookie] = useState(setting?.cookie || "")
  const [refreshInterval, setRefreshInterval] = useState(setting?.refreshIntervalm || "10")

  function saveConfig() {
    Storage.set("chinaMobileSettings", { cookie, refreshInterval })
    dismiss()
  }

  return (
    <VStack>

      <VStack alignment="center" padding={{ top: 10 }}>
        <Text font="title3" >
          脚本设置
        </Text>
      </VStack>
      <Form >
        <Section
          title="登录凭证"
        >
          <TextField
            title="Cookie"
            value={cookie}
            prompt="在此处粘贴 Cookie"
            onChanged={setCookie}
          />
          <Text >请在此处粘贴您获取的网页端的 Cookie。</Text>
        </Section>


        <Section
          title="刷新设置"
        >
          <TextField
            title="刷新时间间隔（分钟）"
            value={refreshInterval}
            onChanged={setRefreshInterval}
          />
          <Text >设置小组件自动刷新的频率（分钟）。</Text>
        </Section>

      <Button title="保存设置" action={saveConfig} />
      </Form>
      <VStack alignment="center" spacing={4} padding={{ bottom: 5 }}>
        <HStack alignment="center" spacing={4}>
          <Text font="caption2" foregroundStyle="secondaryLabel">
            By:
          </Text>
          <Link url="mailto:minkyfun@qq.com">
            <Text font="caption2" foregroundStyle="accentColor">@MinKy</Text>
          </Link>
        </HStack>
        <Text font="caption2" foregroundStyle="secondaryLabel">
          Version {VERSION}
        </Text>
      </VStack>
    </VStack>
  )
}

// 显示该视图
Navigation.present({
  element: <MainView />
}).then(() => {
  // 视图关闭后清理资源，避免内存泄漏
  Script.exit();
})


