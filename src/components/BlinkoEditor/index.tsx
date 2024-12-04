import { observer } from "mobx-react-lite"
import { RootStore } from "@/store"
import { BlinkoStore } from "@/store/blinkoStore"
import dayjs from "@/lib/dayjs"
import { useEffect, useRef } from "react"
import { NoteType } from "@/server/types"
import { useRouter } from "next/router"
import { Editor } from "../Common/Editor"

type IProps = {
  mode: 'create' | 'edit',
  onSended?: () => void,
  onHeightChange?: (height: number) => void
}
export const BlinkoEditor = observer(({ mode, onSended, onHeightChange }: IProps) => {
  const isCreateMode = mode == 'create'
  const blinko = RootStore.Get(BlinkoStore)
  const editorRef = useRef<any>(null)
  const router = useRouter()
  useEffect(() => {
    blinko.isCreateMode = mode == 'create'
  }, [mode])
  return <div className="max-h-[100vh]" ref={editorRef} id='global-editor' onClick={() => {
    blinko.isCreateMode = mode == 'create'
  }}>
    <Editor
      mode={mode}
      originFiles={!isCreateMode ? blinko.curSelectedNote?.attachments : []}
      content={isCreateMode ? blinko.noteContent! : blinko.curSelectedNote?.content!}
      onChange={v => {
        isCreateMode ? (blinko.noteContent = v) : (blinko.curSelectedNote!.content = v)
      }}
      onHeightChange={() => {
        onHeightChange?.(editorRef.current?.clientHeight ?? 75)
      }}
      isSendLoading={blinko.upsertNote.loading.value}
      bottomSlot={
        isCreateMode ? <div className='text-xs text-ignore ml-2'>Drop to upload files</div> :
          <div className='text-xs text-desc'>{dayjs(blinko.curSelectedNote!.createdAt).format("YYYY-MM-DD hh:mm:ss")}</div>
      }
      onSend={async ({ files }) => {
        if (isCreateMode) {
          //@ts-ignore
          await blinko.upsertNote.call({ refresh: false, content: blinko.noteContent, attachments: files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size, type: i.type } }) })
          if (blinko.noteTypeDefault == NoteType.NOTE && router.pathname != '/notes') {
            await router.push('/notes')
            blinko.forceQuery++
          }
          if (blinko.noteTypeDefault == NoteType.BLINKO && router.pathname != '/') {
            await router.push('/')
            blinko.forceQuery++
          }
          blinko.updateTicker++
        } else {
          console.log(files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size } }))
          await blinko.upsertNote.call({
            id: blinko.curSelectedNote!.id,
            //@ts-ignore
            content: blinko.curSelectedNote.content,
            //@ts-ignore
            attachments: files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size, type: i.type } })
          })
        }
        onSended?.()
      }} />
  </div>
})


