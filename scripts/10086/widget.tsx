// widget.tsx
import { VStack, HStack, Image, Text, Widget, fetch, WidgetReloadPolicy, ZStack, DynamicShapeStyle } from 'scripting'
const CryptoJS = require("./crypto-js.min.js")


type chinaMobileSettings = {
    cookie: string
    refreshInterval: number
}

type BalanceInfo = {
    /** 可用余额（字符串金额） */
    curFee: string
    /** 账户总余额（字符串金额） */
    curFeeTotal: string
    /** 欠费（字符串金额） */
    oweFee: string
    /** 实际可用余额（字符串金额） */
    realBalanceFee: string
    /** 当月消费（字符串金额） */
    realFee: string
    /** 备注 */
    remark: string | null
}

type ResConItem = {
    resConName: string
    balMeal: string | null
    totalMeal: string | null
}

// 尽量按这份数据结构补齐类型
type SecResConInfo = {
    balMeal?: string | null
    totalMeal?: string | null
    [k: string]: unknown
}

type SecResInfo = {
    resConName?: string | null
    resConInfo?: SecResConInfo | null
    [k: string]: unknown
}

type ResInfo = {
    secResInfos?: SecResInfo[] | null
    [k: string]: unknown
}

type MealItem = {
    resInfos?: ResInfo[] | null
    [k: string]: unknown
}

type RootItem = {
    arr?: MealItem[] | null
    type?: string
    [k: string]: unknown
}

type FeeData = {
    available: string
    totalBalance: string
    monthlySpend: string
}

type FlowData = ResConItem[]

const cardThemes = {
    fee: {
        background: { light: "rgba(140, 170, 238, 0.12)", dark: "rgba(140, 170, 238, 0.18)" } as DynamicShapeStyle,
        iconColor: { light: "#8caaee", dark: "#8caaee" } as DynamicShapeStyle,
        titleColor: { light: "#737994", dark: "#99d1db" } as DynamicShapeStyle,
        descColor: { light: "#51576d", dark: "#c6d0f5" } as DynamicShapeStyle,
        icon: "creditcard.fill"
    },
    voice: {
        background: { light: "rgba(166, 209, 137, 0.12)", dark: "rgba(166, 209, 137, 0.18)" } as DynamicShapeStyle,
        iconColor: { light: "#a6d189", dark: "#a6d189" } as DynamicShapeStyle,
        titleColor: { light: "#626880", dark: "#81c8be" } as DynamicShapeStyle,
        descColor: { light: "#51576d", dark: "#c6d0f5" } as DynamicShapeStyle,
        icon: "phone.fill"
    },
    flow: {
        background: { light: "rgba(239, 159, 118, 0.12)", dark: "rgba(239, 159, 118, 0.18)" } as DynamicShapeStyle,
        iconColor: { light: "#ef9f76", dark: "#ef9f76" } as DynamicShapeStyle,
        titleColor: { light: "#737994", dark: "#e5c890" } as DynamicShapeStyle,
        descColor: { light: "#51576d", dark: "#c6d0f5" } as DynamicShapeStyle,
        icon: "antenna.radiowaves.left.and.right"
    },
    otherFlow: {
        background: { light: "rgba(202, 158, 230, 0.12)", dark: "rgba(202, 158, 230, 0.18)" } as DynamicShapeStyle,
        iconColor: { light: "#ca9ee6", dark: "#ca9ee6" } as DynamicShapeStyle,
        titleColor: { light: "#737994", dark: "#babbf1" } as DynamicShapeStyle,
        descColor: { light: "#51576d", dark: "#c6d0f5" } as DynamicShapeStyle,
        icon: "wifi.circle.fill"
    }
}

const keyStr = "043AOQGK6ykklyZA"
const ivStr = "043AOQGK6ykklyZA"

const key = CryptoJS.enc.Utf8.parse(keyStr)
const iv = CryptoJS.enc.Utf8.parse(ivStr)
//请求地址
// i/v1/fee/real
const API_URL = "https://shop.10086.cn"


const base64DecodeChars = new Array(
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
)

function utf8to16(a: string) {
    let c = "", i = 0, h = a.length, _, g, v
    for (; h > i;) {
        _ = a.charCodeAt(i++)
        switch (_ >> 4) {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                c += a.charAt(i - 1)
                break
            case 12: case 13:
                g = a.charCodeAt(i++)
                c += String.fromCharCode(((31 & _) << 6) | (63 & g))
                break
            case 14:
                g = a.charCodeAt(i++)
                v = a.charCodeAt(i++)
                c += String.fromCharCode(((15 & _) << 12) | ((63 & g) << 6) | (63 & v))
                break
        }
    }
    return c
}

function base64decode(a: string) {
    let c, h, _, g, i = 0, v = a.length, C = ""
    for (; v > i;) {
        do c = base64DecodeChars[255 & a.charCodeAt(i++)]
        while (v > i && c === -1)
        if (c === -1) break

        do h = base64DecodeChars[255 & a.charCodeAt(i++)]
        while (v > i && h === -1)
        if (h === -1) break

        C += String.fromCharCode((c << 2) | ((48 & h) >> 4))

        do {
            _ = 255 & a.charCodeAt(i++)
            if (_ === 61) return C
            _ = base64DecodeChars[_]
        } while (v > i && _ === -1)
        if (_ === -1) break

        C += String.fromCharCode(((15 & h) << 4) | ((60 & _) >> 2))

        do {
            g = 255 & a.charCodeAt(i++)
            if (g === 61) return C
            g = base64DecodeChars[g]
        } while (v > i && g === -1)
        if (g === -1) break

        C += String.fromCharCode(((3 & _) << 6) | g)
    }
    return C
}

function decodeOutParam(s: string) {
    if (!s || typeof s !== "string") throw new Error("s 不能为空")

    // 1) base64decode + utf8to16 + 去空白
    const cipherTextBase64 = utf8to16(base64decode(s)).replace(/\s*/g, "")

    // 2) AES(CBC/Pkcs7) 解密（cipherTextBase64 本身是 base64 字符串）
    const key = CryptoJS.enc.Utf8.parse(keyStr)
    const iv = CryptoJS.enc.Utf8.parse(ivStr)

    const decrypted = CryptoJS.AES.decrypt(cipherTextBase64, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    })

    // 3) 转 UTF-8 明文（注意：解不出来时这里可能为空串）
    const plain = decrypted.toString(CryptoJS.enc.Utf8)

    // 4) 按你原逻辑：能用 plain 就 parse plain，否则 parse cipherTextBase64
    const textToParse = (plain && plain.length > 0) ? plain : cipherTextBase64

    // 5) 尽量返回对象：JSON parse 失败就返回原字符串
    try {
        return JSON.parse(textToParse)
    } catch (e) {
        return { raw: textToParse, note: "不是合法 JSON（或 key/iv 不对导致解密失败）" }
    }
}


function base64CryptoJS(str: string): string {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
}

function pickBalanceFields(res: BalanceInfo) {
    const toNum = (v: string) => parseFloat(v == null || v === "" ? "0" : v)
    const toFixed2 = (n: string) => toNum(n).toFixed(2)

    // 1) 可用余额：curFee 为空当 0.00；如果它为 0，则用 oweFee 的“负绝对值”
    let available = (res.curFee === "" || res.curFee == null) ? "0.00" : toFixed2(res.curFee)
    if (Math.abs(toNum(available)) === 0) {
        available = (-1 * Math.abs(toNum(res.oweFee))).toFixed(2)
    }

    // 2) 账户总余额：curFeeTotal 为空当 0.00，保留两位
    const totalBalance = (res.curFeeTotal === "" || res.curFeeTotal == null) ? "0.00" : toFixed2(res.curFeeTotal)

    // 3) 当月消费：realFee 去掉首尾空格；为空就给空字符串，否则两位小数
    const monthlySpend = (String(res.realFee ?? "").trim() === "") ? "" : toFixed2(res.realFee)

    return { available, totalBalance, monthlySpend }
}

function pickResConList(data: RootItem[]): ResConItem[] {
    const out: ResConItem[] = []

    const walk = (node: unknown): void => {
        if (node == null) return

        if (Array.isArray(node)) {
            node.forEach(walk)
            return
        }

        if (typeof node !== 'object') return

        const obj = node as Record<string, unknown>

        // 命中 secResInfos 的每一项
        if (typeof obj.resConName === 'string' && obj.resConInfo && typeof obj.resConInfo === 'object') {
            const info = obj.resConInfo as Record<string, unknown>
            const balMeal = typeof info.balMeal === 'string' ? info.balMeal : null
            const totalMeal = typeof info.totalMeal === 'string' ? info.totalMeal : null

            out.push({
                resConName: obj.resConName,
                balMeal,
                totalMeal
            })
        }

        // 继续向下找（按你结构里的字段）
        if ('arr' in obj) walk(obj.arr)
        if ('resInfos' in obj) walk(obj.resInfos)
        if ('secResInfos' in obj) walk(obj.secResInfos)
    }

    walk(data)
    return out
}


//获取手机号
async function getPhoneNumberWithCookie(cookie: string): Promise<string | null> {
    const url = API_URL + "/i/v1/auth/loginfo?_=" + Date.now()

    const headers = {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "zh,en;q=0.9,zh-CN;q=0.8",
    }
    try {
        const response = await fetch(url, { headers: headers })
        if (response.ok) {
            const responseJson = await response.json()
            if (responseJson.retCode === "000000") {
                let res = decodeOutParam(responseJson.data.outParam)
                let mobile = res.loginValue.replace(/\*+/, res.safeCode)
                const sin = CryptoJS.AES.encrypt(mobile, key, {
                    iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }).toString()
                console.log("🐷 ～ getPhoneNumberWithCookie ～ res:", res)
                return base64CryptoJS(sin)
            } else {
                console.log("获取手机号失败:", responseJson.retMsg)
            }

        } else {
            console.log("请求出错:", response.status)
        }

    } catch (error) {
        console.log("请求出错:", error)
    }

    return null
}


//获取话费信息
async function getBalanceWithCookie(cookie: string, sin: string): Promise<FeeData | null> {
    const url = API_URL + "/i/v1/fee/real/" + sin + "?_=" + Date.now()
    const headers = {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "zh,en;q=0.9,zh-CN;q=0.8",
    }
    try {
        const response = await fetch(url, { headers: headers })
        if (response.ok) {
            const responseJson = await response.json()
            if (responseJson.retCode === "000000") {
                let res = decodeOutParam(responseJson.data.outParam)
                return pickBalanceFields(res)
            } else {
                console.log("获取话费信息失败:", responseJson.retMsg)
            }
        } else {
            console.log("请求出错:", response.status)
        }

    } catch (error) {
        console.log("请求出错:", error)
    }

    return null


}

//获取流量信息
async function getFlowInfoWithCookie(cookie: string, sin: string) {
    const url = API_URL + "/i/v1/fee/planbal/" + sin + "?_=" + Date.now()
    const headers = {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "zh,en;q=0.9,zh-CN;q=0.8",
    }
    try {
        const response = await fetch(url, { headers: headers })
        if (response.ok) {
            const responseJson = await response.json()
            if (responseJson.retCode === "000000") {
                let res = decodeOutParam(responseJson.data.outParam)
                return pickResConList(res)
            } else {
                console.log("获取流量信息失败:", responseJson.retMsg)
            }
        } else {
            console.log("请求出错:", response.status)
        }

    } catch (error) {
        console.log("请求出错:", error)
    }

    return null
}


// 小尺寸组件卡片
function SmallDataCard({
    title,
    value,
    unit,
    theme,
    useLogoAsIcon
}: {
    title: string
    value: string
    unit: string
    theme: typeof cardThemes.fee
    useLogoAsIcon?: boolean
}) {


    const cardTitleStyle = theme.titleColor
    const cardDescStyle = theme.descColor

    return (
        <ZStack>
            <HStack
                alignment="center"
                padding={{ top: 6, leading: 8, bottom: 6, trailing: 8 }}
                spacing={6}
                frame={{ minWidth: 0, maxWidth: Infinity }}
                widgetBackground={{
                    style: theme.background,
                    shape: {
                        type: "rect",
                        cornerRadius: 12,
                        style: "continuous"
                    }
                }}
            >
                <HStack alignment="center" frame={{ width: 16, height: 16 }}>
                    {useLogoAsIcon ? (
                        <Image
                            imageUrl="https://raw.githubusercontent.com/Nanako718/Scripting/refs/heads/main/images/10086.png"
                            frame={{ width: 16, height: 16 }}
                            resizable
                        />
                    ) : (
                        <Image
                            systemName={theme.icon}
                            font={12}
                            fontWeight="medium"
                            foregroundStyle={theme.iconColor}
                        />
                    )}
                </HStack>
                <VStack alignment="center" spacing={2} frame={{ minWidth: 0, maxWidth: Infinity }}>
                    <Text
                        font={9}
                        fontWeight="medium"
                        foregroundStyle={cardTitleStyle}
                        lineLimit={1}
                        minScaleFactor={0.8}
                    >
                        {title}
                    </Text>
                    <Text
                        font={14}
                        fontWeight="bold"
                        foregroundStyle={cardDescStyle}
                        lineLimit={1}
                        minScaleFactor={0.7}
                    >
                        {`${value}${unit}`}
                    </Text>
                </VStack>

            </HStack>
        </ZStack>
    )
}


// 小尺寸组件视图
function SmallWidgetView({ feeData, flowData }: {
    feeData: FeeData
    flowData: FlowData
}) {


    const kb = flowData
  .filter(it => it.resConName.includes("国内通用流量"))
  .reduce((acc, item) => {
    const balMeal = item.balMeal ? parseFloat(item.balMeal.replace(/[^0-9.]/g, "")) : 0
    return acc + balMeal
  }, 0)


    return (
        <VStack alignment="leading" padding={{ top: 8, leading: 8, bottom: 8, trailing: 8 }} spacing={6}>
            <SmallDataCard
                title="话费余额"
                value={feeData.available}
                unit="元"
                theme={cardThemes.fee}
                useLogoAsIcon={true}

            />
            <SmallDataCard
                title="剩余总流量"
                value={(kb / 1024 / 1024).toFixed(2)}
                unit="G"
                theme={cardThemes.flow}

            />
            <SmallDataCard
                title="剩余语音时长"
                value={flowData.filter(it => it.resConName.includes("国内通话主叫时长")).reduce((acc, item) => {
                    const balMeal = item.balMeal ? parseFloat(item.balMeal.replace(/[^0-9.]/g, '')) : 0
                    return acc + balMeal
                }, 0).toFixed(0)}
                unit="分"
                theme={cardThemes.voice}
            />
        </VStack>
    )
}


function WidgetView({ feeData, flowData }: { feeData: FeeData; flowData: FlowData }) {

    return <SmallWidgetView feeData={feeData} flowData={flowData}></SmallWidgetView>
}



async function showWidget() {

    const settings = Storage.get<chinaMobileSettings>("chinaMobileSettings")

    const refreshInterval = settings?.refreshInterval ?? 10

    const WidgetReloadPolicy: WidgetReloadPolicy = {
        policy: "after",
        date: new Date(Date.now() + refreshInterval * 60 * 1000) //默认 10 分钟刷新一次
    }

    const cookie = settings?.cookie?.trim()
    if (!cookie) {
        Widget.present(<Text>请先填写配置 Cookie。</Text>, WidgetReloadPolicy)
        return
    }

    const sin = await getPhoneNumberWithCookie(cookie)
    if (!sin) {
        Widget.present(<Text>获取手机号失败，请检查 Cookie 是否有效。</Text>, WidgetReloadPolicy)
        return
    }

    const [feeData, flowData] = await Promise.all([
        getBalanceWithCookie(cookie, sin),
        getFlowInfoWithCookie(cookie, sin)
    ])

    if (!feeData || !flowData) {
        Widget.present(<Text>获取数据失败，请检查网络或 Cookie。</Text>, WidgetReloadPolicy)
        return
    }


    // const feeData: FeeData = {
    //     available: "100.00",
    //     totalBalance: "150.00",
    //     monthlySpend: "50.00"
    // }


    // const flowData: FlowData = [
    //     { resConName: "通用流量", balMeal: "2GB", totalMeal: "5GB" },
    //     { resConName: "省内流量", balMeal: "1GB", totalMeal: "3GB" },
    // ]


    Widget.present(<WidgetView feeData={feeData} flowData={flowData} />, WidgetReloadPolicy)

}


showWidget()
