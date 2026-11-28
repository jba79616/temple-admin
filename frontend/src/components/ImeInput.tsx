import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  normalize?: (raw: string) => string
  onValue: (value: string) => void
}

const keep = (raw: string) => raw

/**
 * 每打一字就正規化、或值要等網址更新才回來的受控 input，會在注音等輸入法組字時把字改掉，組字就斷了。
 * 組字中只把原字串留在畫面上，組字完成才正規化並交出去。
 */
export default function ImeInput({ value, normalize = keep, onValue, ...rest }: Props) {
  const [draft, setDraft] = useState(value)
  const composing = useRef(false)

  useEffect(() => {
    if (!composing.current) setDraft(value)
  }, [value])

  function commit(raw: string) {
    const next = normalize(raw)
    setDraft(next)
    onValue(next)
  }

  return (
    <input
      {...rest}
      value={draft}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={(e) => {
        composing.current = false
        commit(e.currentTarget.value)
      }}
      onChange={(e) => (composing.current ? setDraft(e.target.value) : commit(e.target.value))}
    />
  )
}
