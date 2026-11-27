import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { print as printApi } from '../../api'
import type { Wenshu, WenshuPerson } from '../../api/types'
import { inlineName, printName } from '../../lib/names'
import { believerOf, birthTextOf, lunarDateOf, verticalAddress, type BirthText, type LunarDate } from '../../lib/wenshu'
import PdfButton from './PdfButton'
import './print.css'

/**
 * 照廟方 Word 範本（制星補運文疏 A4.doc）：A4 橫印直書、由右往左，一人一張。
 * 每段是一欄；depth 是字從欄頂往下的位置，單位是 13pt 本文的一個字（CSS 變數 --u），量自範本的定位點。
 */
const BLANK = '　　'
/** 「信士 ○○ 等生居塵世」中間的空檔：11.4 到 18.6 字，15pt 只放得下 6 個字，長名縮字。 */
const NAME_SLOT = 7.2
const NAME_PT = 15

type DateParts = { year: string; month: string; day: string }

const DATE_FIELDS = [
  { key: 'ritual', label: '今涓' },
  { key: 'petition', label: '天運' },
] as const

const u = (depth: number) => `calc(var(--u) * ${depth})`

function At({ depth, className, style, children }: { depth: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return <span className={`ws-at ${className ?? ''}`} style={{ top: u(depth), ...style }}>{children}</span>
}

function EndAt({ depth, children }: { depth: number; children: ReactNode }) {
  return <span className="ws-at bold" style={{ bottom: `calc(100% - var(--u) * ${depth})` }}>{children}</span>
}

function Col({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={`ws-col ${className ?? ''}`}>{children}</div>
}

function Flow({ indent = 0, hanging = 0, className, children }: { indent?: number; hanging?: number; className?: string; children: ReactNode }) {
  return <p className={`ws-flow ${className ?? ''}`} style={{ paddingTop: u(indent + hanging), textIndent: hanging ? u(-hanging) : undefined }}>{children}</p>
}

function orBlank(text: string) {
  return text || BLANK
}

function BirthCells({ birth }: { birth: BirthText }) {
  const cells = [birth.year + '年', birth.month + '月', birth.day + '日', birth.hour + '時', birth.zodiac && '屬' + birth.zodiac]
  return (
    <div className="ws-birth">
      {cells.map((text, i) => <div key={i} className={`ws-cell${Array.from(text).length > 3 ? ' ws-cell-long' : ''}`}>{text}</div>)}
    </div>
  )
}

export function Sheet({ person, ritual, petition }: { person: WenshuPerson; ritual: DateParts; petition: DateParts }) {
  const believer = believerOf(person.gender)
  const birth = birthTextOf(person)
  const name = printName(person.name)
  const nameChars = Array.from(name).length
  const namePt = Math.min(NAME_PT, (NAME_SLOT * 13) / Math.max(nameChars, 1))

  return (
    <div className="ws-body" data-name={person.name}>
      <Flow indent={7.5} className="ws-title">制星補運文疏</Flow>
      <Col><At depth={0}>聖德巍峨　轉運禳星凶即散　神恩浩蕩　延生整斗福長臻</At></Col>
      <Col><At depth={1}>大教遠流示一乘歸元之路</At><At depth={19.4}>今據</At></Col>
      <Col><At depth={1}>神功巨測開眾生方便之門</At></Col>
      <Flow indent={1}>
        竭蟻悃以皈依冀鴻庥之加被 道制凶轉運植福延生{believer}<b>{inlineName(person.name)}</b>流庚<b>{birth.year}</b>年<b>{birth.month}</b>月<b>{birth.day}</b>日<b>{birth.hour}</b>時生暨閤家人等謹露丹誠跪叩
      </Flow>
      <Col><At depth={1.85}>一四天下</At><At depth={6.35}>南贍部洲</At></Col>
      <Flow>中華民國<b>{person.cityDistrict}{verticalAddress(person.address)}</b></Flow>
      <BirthCells birth={birth} />
      <Col><At depth={0}>地方人民奉佛植福延禧誦經消災厄</At></Col>
      <Col><At depth={18.9}>虔誠焚香禮拜</At><EndAt depth={33}>{birth.year}</EndAt><At depth={33}>年</At></Col>
      <Col><At depth={0}>南無本師釋迦牟尼文佛</At><At depth={17.7}><b>{believer}</b>八卦制星移運轉運行</At></Col>
      <Col><At depth={0}>南無消災延壽藥師如來</At><EndAt depth={33}>{birth.month}</EndAt><At depth={33}>月</At></Col>
      <Col><At depth={0}>南無極樂世界無量壽佛</At></Col>
      <Col><At depth={0}>南無無極老祖　祖太　南北斗星君</At><EndAt depth={33}>{birth.day}</EndAt><At depth={33}>日</At></Col>
      <Col><At depth={0}>玄穹高上帝玉皇大天尊</At></Col>
      <Col><At depth={0}>玄天上帝真武大天尊</At><EndAt depth={33}>{birth.hour}</EndAt><At depth={33}>時</At></Col>
      <Col><At depth={0}>南無經筵會上諸佛菩薩列位尊神</At><At depth={16.5}>各寶金蓮座下</At></Col>
      <Col><At depth={26}>制運</At><At depth={29.2}>全消</At></Col>
      <Col>
        <At depth={9.4} className="bold">{believer === '信女' ? '信女' : '信士'}</At>
        <At depth={18.6 - NAME_SLOT} className="bold ws-name" style={{ fontSize: `${namePt}pt`, height: u(NAME_SLOT) }}>{name}</At>
        <At depth={18.6}>等生居塵世托質人倫仰賴</At>
      </Col>
      <Col>{believer === '信士信女' && <At depth={9.4} className="bold">信女</At>}</Col>
      <Col><At depth={0}>上蒼之蔭護叨感</At></Col>
      <Col><At depth={0}>聖真之提拔日在</At></Col>
      <Col><At depth={0}>三光之下難免褻瀆於聖賢身五濁之中不無招障之過咎以致命運乖蹇恐曜強侵連年</At></Col>
      <Col><At depth={1.9}>坎坷累歲迍遭獨犯</At></Col>
      <Flow>
        諸凶星及斗部一切凶神惡煞神君今涓 <b className="ws-ritual">{orBlank(ritual.year)} 年 {orBlank(ritual.month)} 月 {orBlank(ritual.day)} 日</b>虔備香花果品供恭備真經 伏懇聖心保赤慧眼垂青恩准驅凶降吉散禍臻祥元辰振作運限開通民康物阜國泰家寧男添百福女納千祥閤家感德百叩
      </Flow>
      <Col><At depth={3.8}>伏</At><At depth={7.3}>願</At><At depth={8.9}>八卦制星移運轉運行</At></Col>
      <Flow hanging={2}>
        佛光普照、法力宏施　　　皆願以後、惟願身家康泰、命運亨通吉星高照於命宮、凶曜遠離於運內、元辰光彩、壽命延長、災害不侵、禍患全消、行皆逢吉事盡遂心、天官賜福、地官赦罪、水官　　解厄、南斗火官除毒、北斗水神滅凶災
      </Flow>
      <Col><At depth={2.9}>更</At><At depth={5.2}>祈</At></Col>
      <Col><At depth={1.85}>家門迪吉</At><At depth={6.35}>人口平安</At><At depth={10.85}>男添百福</At><At depth={15.35}>女納千祥</At></Col>
      <Col><At depth={1.85}>四時無災</At><At depth={6.35}>八節有慶</At><At depth={10.85}>祈求如意</At><At depth={15.35}>大降吉祥</At></Col>
      <Col><At depth={3.7} className="bold">上　申</At></Col>
      <Col className="bold">
        <At depth={1}>天</At><At depth={3}>運</At>
        <At depth={5.5} className="ws-petition-year">{orBlank(petition.year)}</At><At depth={9}>年</At>
        <At depth={11} className="ws-petition-month">{orBlank(petition.month)}</At><At depth={14.5}>月</At>
        <At depth={17}>{orBlank(petition.day)}</At><At depth={21}>日</At>
        <At depth={23}>暨閤家人等稽首頓首叩</At>
      </Col>
      <Col><At depth={0} className="bold">無極聖殿</At><At depth={5}>雲林縣元長鄉內寮村好收路五之六號</At><At depth={34}>全體主任委員敬上</At></Col>
    </div>
  )
}

/** 直書由右往左排，地址、姓名或日期太長多佔一欄時，最左邊那欄會被紙張裁掉。 */
function isCut(body: HTMLElement): boolean {
  const last = body.lastElementChild
  return !!last && last.getBoundingClientRect().left < body.getBoundingClientRect().left - 1
}

function dateFrom(params: URLSearchParams, key: string, fallback: DateParts): DateParts {
  const pick = (part: keyof DateParts) => params.get(key + part[0].toUpperCase() + part.slice(1)) ?? fallback[part]
  return { year: pick('year'), month: pick('month'), day: pick('day') }
}

export default function WenshuPrint() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Wenshu | null>(null)
  const [error, setError] = useState('')
  const memberId = params.get('memberId')
  const householdId = params.get('householdId')

  useEffect(() => {
    if (!memberId && !householdId) {
      setError('網址缺少戶或成員')
      return
    }
    printApi.wenshu(memberId ? { memberId: Number(memberId) } : { householdId: Number(householdId) }).then(setData).catch((e) => setError(e.message))
  }, [memberId, householdId])

  const today: LunarDate = useMemo(() => lunarDateOf(new Date()), [])
  const ritual = dateFrom(params, 'ritual', today)
  const petition = dateFrom(params, 'petition', { year: data?.ganzhiYear ?? '', month: data?.prayerMonth ?? '', day: '' })
  const dates = { ritual, petition }

  const heading = !data ? '' : `${data.householdNumber === null ? '' : `第 ${data.householdNumber} 戶`}${memberId && data.people[0] ? ` ${data.people[0].name}` : ''}`
  useEffect(() => {
    document.title = data ? `制星補運文疏 ${heading.trim()}` : '制星補運文疏'
  }, [data, heading])

  /** PDF 轉檔的路徑只收英數與 %-encoded；URLSearchParams 不編碼的符號（空白、*）會被擋，所以只留文字與數字。 */
  function setDate(key: string, part: keyof DateParts, value: string) {
    const next = new URLSearchParams(params)
    next.set(key + part[0].toUpperCase() + part.slice(1), value.replace(/[^\p{L}\p{N}]/gu, ''))
    setParams(next, { replace: true })
  }

  const [overflowed, setOverflowed] = useState<string[]>([])
  const datesKey = params.toString()
  useEffect(() => {
    if (!data) return
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) setOverflowed([...document.querySelectorAll<HTMLElement>('.ws-body')].filter(isCut).map((b) => b.dataset.name ?? ''))
    })
    return () => {
      cancelled = true
    }
  }, [data, datesKey])

  if (error) return <div className="page error">{error}</div>
  if (!data) return <div className="page muted">載入中…</div>

  return (
    <div className="print-root">
      <style>{'@page { size: A4 landscape; margin: 0; }'}</style>
      <div className="print-toolbar wenshu-toolbar">
        <strong>制星補運文疏</strong><span>{heading.trim()} · {data.people.length} 張</span>
        {DATE_FIELDS.map((f) => (
          <span key={f.key} className="wenshu-date">
            {f.label}
            {(['year', 'month', 'day'] as const).map((part) => (
              <label key={part}>
                <input className="input" value={dates[f.key][part]} onChange={(e) => setDate(f.key, part, e.target.value)} aria-label={`${f.label}${{ year: '年', month: '月', day: '日' }[part]}`} />
                {{ year: '年', month: '月', day: '日' }[part]}
              </label>
            ))}
          </span>
        ))}
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
        <PdfButton />
      </div>
      {overflowed.length > 0 && (
        <div className="print-notice">{overflowed.join('、')} 的文疏太長，最左邊的欄位會被裁掉。請縮短今涓、天運的文字，或檢查地址、姓名後再印。</div>
      )}
      {data.people.map((p, i) => (
        <div key={p.memberId} className={`sheet wenshu-sheet${i < data.people.length - 1 ? ' sheet-break' : ''}`}>
          <Sheet person={p} ritual={ritual} petition={petition} />
        </div>
      ))}
      {data.people.length === 0 && <div className="page muted">這戶沒有在籍成員</div>}
    </div>
  )
}
