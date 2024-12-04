import dynamic from 'next/dynamic';
import '@uiw/react-markdown-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import '@/styles/blinko-markdown-editor.css'
import { PromiseState } from '@/store/standard/PromiseState';
import { Button, Card, Divider, Image } from '@nextui-org/react';
import { useTheme } from 'next-themes';
import React, { ReactElement, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { helper } from '@/lib/helper';
import { FileType, OnSendContentType } from './type';
import { MyPlugins, ProcessCodeBlocks } from './editorPlugins';
import { BlinkoStore } from '@/store/blinkoStore';
import { eventBus } from '@/lib/event';
import { _ } from '@/lib/lodash';
import { CameraIcon, CancelIcon, FileUploadIcon, HashtagIcon, LightningIcon, NotesIcon, SendIcon, VoiceIcon } from '../Icons';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import { api } from '@/lib/trpc';
import { NoteType, type Attachment } from '@/server/types';
import { DialogStore } from '@/store/module/Dialog';
import { AttachmentsRender } from '../AttachmentRender';
import { ShowCamera } from '../CameraDialog';
import { ShowAudioDialog } from '../AudioDialog';
import { IsTagSelectVisible, showTagSelectPop } from '../PopoverFloat/tagSelectPop';
import { showAiWriteSuggestions } from '../PopoverFloat/aiWritePop';
import { AiStore } from '@/store/aiStore';
import { Icon } from '@iconify/react';
import { usePasteFile } from '@/lib/hooks';
import { RootStore } from '@/store';
import { MarkdownRender } from '../MarkdownRender';
import { BottomToolbar } from './bottomToolbar';
import { bold, codeBlock,  italic, todo, underline, strike, quote, ulist, olist, link, code, image } from './topToolbar';

const MarkdownEditor = dynamic(
  () => import("@uiw/react-markdown-editor").then((mod) => mod.default),
  { ssr: false }
);

type IProps = {
  mode: 'create' | 'edit',
  content: string,
  onChange?: (content: string) => void,
  onHeightChange?: () => void,
  onSend?: (args: OnSendContentType) => Promise<any>,
  isSendLoading?: boolean,
  bottomSlot?: ReactElement<any, any>,
  originFiles?: Attachment[]
}


export const Editor = observer(({ content, onChange, onSend, isSendLoading, bottomSlot, originFiles, mode, onHeightChange }: IProps) => {
  content = ProcessCodeBlocks(content)
  const [canSend, setCanSend] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const { t } = useTranslation()
  const isPc = useMediaQuery('(min-width: 768px)')
  const cardRef = React.useRef(null)
  const blinko = RootStore.Get(BlinkoStore)
  const ai = RootStore.Get(AiStore)
  const { theme } = useTheme();

  const store = useLocalObservable(() => ({
    files: [] as FileType[],
    lastRange: null as Range | null,
    lastRangeText: '',
    lastSelection: null as Selection | null,
    handleIOSFocus() {
      try {
        if (helper.env.isIOS() && mode == 'edit') {
          store.focus(true)
        }
      } catch (error) { }
    },
    updateSendStatus() {

    },
    replaceMarkdownTag(text: string, forceFocus = false) {

    },
    insertMarkdown(text) {

    },
    insertMarkdownByEvent(text) {

    },
    focus(force = false) {
      // console.log(mdxEditorRef.current)
      // if (force && store.lastRange) {
      //   const editorElements = getEditorElements()
      //   if (editorElements.length > 0) {
      //     editorElements.forEach(editorElement => {
      //       requestAnimationFrame(() => {
      //         const range = document.createRange()
      //         const selection = window.getSelection()
      //         const walker = document.createTreeWalker(
      //           editorElement,
      //           NodeFilter.SHOW_TEXT,
      //           null
      //         )
      //         let lastNode: any = null
      //         while (walker.nextNode()) {
      //           lastNode = walker.currentNode
      //         }
      //         if (lastNode) {
      //           range.setStart(lastNode, lastNode?.length)
      //           range.setEnd(lastNode, lastNode?.length)
      //           selection?.removeAllRanges()
      //           selection?.addRange(range)
      //           editorElement.focus()
      //         }
      //       })
      //     })
      //   }
      //   onChange?.(mdxEditorRef.current!.getMarkdown())
      // } else {
      //   mdxEditorRef.current!.focus(() => {
      //     onChange?.(mdxEditorRef.current!.getMarkdown())
      //   }, {
      //     defaultSelection: 'rootEnd'
      //   })
      // }
    },
    clearMarkdown() {

    },
    inertHash() {

    },
    async speechToText(filePath) {
      if (!blinko.showAi) {
        return
      }
      if (filePath.endsWith('.webm') || filePath.endsWith('.mp3') || filePath.endsWith('.wav')) {
        try {
          const doc = await api.ai.speechToText.mutate({ filePath })
          store.insertMarkdown(doc[0]?.pageContent)
        } catch (error) { }
      }
    },
    uploadFiles(acceptedFiles) {
      const _acceptedFiles = acceptedFiles.map(file => {
        const extension = helper.getFileExtension(file.name)
        const previewType = helper.getFileType(file.type, file.name)
        return {
          name: file.name,
          size: file.size,
          previewType,
          extension: extension ?? '',
          preview: URL.createObjectURL(file),
          uploadPromise: new PromiseState({
            function: async () => {
              store.updateSendStatus()
              const formData = new FormData();
              formData.append('file', file)
              const response = await fetch('/api/file/upload', {
                method: 'POST',
                body: formData,
              });
              const data = await response.json();
              store.speechToText(data.filePath)
              if (data.filePath) {
                return data.filePath
              }
            }
          }),
          type: file.type
        }
      })
      store.files.push(..._acceptedFiles)
      Promise.all(_acceptedFiles.map(i => i.uploadPromise.call())).then(() => {
        store.updateSendStatus()
      }).finally(() => {
        store.updateSendStatus()
      })
    },
    handlePopTag() {
      const selection = window.getSelection();
      if (selection!.rangeCount > 0) {
        if (!IsTagSelectVisible()) {
          let lastRange = selection!.getRangeAt(0);
          store.lastRange = lastRange
          store.lastRangeText = lastRange.endContainer.textContent?.slice(0, lastRange.endOffset) ?? ''
          store.lastSelection = selection
        }
        const hasHashTagRegex = /#[^\s#]+/g
        const endsWithBankRegex = /\s$/g
        const currentText = store.lastRange?.startContainer.textContent?.slice(0, store.lastRange?.endOffset) ?? ''
        const isEndsWithBank = endsWithBankRegex.test(currentText)
        const isEndsWithHashTag = helper.regex.isEndsWithHashTag.test(currentText)
        if (currentText == '' || !isEndsWithHashTag) {
          setTimeout(() => eventBus.emit('tagselect:hidden'))
          return
        }
        if (isEndsWithHashTag && currentText != '' && !isEndsWithBank) {
          const match = currentText.match(hasHashTagRegex)
          let searchText = match?.[match?.length - 1] ?? ''
          if (currentText.endsWith("#")) {
            searchText = ''
          }
          showTagSelectPop(searchText.toLowerCase())
        }
      }
    },
    handlePopAiWrite() {
      if (!blinko.showAi) {
        return
      }
      const selection = window.getSelection();
      if (selection!.rangeCount > 0) {
        const lastRange = selection!.getRangeAt(0);
        const currentText = lastRange.startContainer.textContent?.slice(0, lastRange.endOffset) ?? '';
        const isEndsWithSlash = /[^\s]?\/$/.test(currentText);
        if (currentText === '' || !isEndsWithSlash) {
          setTimeout(() => eventBus.emit('aiwrite:hidden'));
          return;
        }
        if (isEndsWithSlash) {
          showAiWriteSuggestions();
        }
      }
    },
    deleteLastChar() {

    },
    setMarkdownLoading(loading: boolean) {

    }
  }))

  const pastedFiles = usePasteFile(cardRef);
  useEffect(() => {
    if (pastedFiles) {
      store.uploadFiles(pastedFiles)
    }
  }, [pastedFiles])

  const { getRootProps, isDragAccept, getInputProps, open } = useDropzone({
    multiple: true, noClick: true,
    onDrop: acceptedFiles => {
      store.uploadFiles(acceptedFiles)
    }
  });

  // export const bold: ICommand = { 
  //   name: 'bold', 
  //   keyCommand: 'bold', 
  //   button: { 'aria-label': 'Add bold text' }, 
  //   icon: ( 
  //     <svg width="13" height="13" viewBox="0 0 384 512"> 
  //       <path 
  //         fill="currentColor" 
  //         d="M304.793 243.891c33.639-18.537 53.657-54.16 53.657-95.693 0-48.236-26.25-87.626-68.626-104.179C265.138 34.01 240.849 32 209.661 32H24c-8.837 0-16 7.163-16 16v33.049c0 8.837 7.163 16 16 16h33.113v318.53H24c-8.837 0-16 7.163-16 16V464c0 8.837 7.163 16 16 16h195.69c24.203 0 44.834-1.289 66.866-7.584C337.52 457.193 376 410.647 376 350.014c0-52.168-26.573-91.684-71.207-106.123zM142.217 100.809h67.444c16.294 0 27.536 2.019 37.525 6.717 15.828 8.479 24.906 26.502 24.906 49.446 0 35.029-20.32 56.79-53.029 56.79h-76.846V100.809zm112.642 305.475c-10.14 4.056-22.677 4.907-31.409 4.907h-81.233V281.943h84.367c39.645 0 63.057 25.38 63.057 63.057.001 28.425-13.66 52.483-34.782 61.284z" 
  //       /> 
  //     </svg> 
  //   ), 
  //   execute: ({ state, view }) => { 
  //     if (!state || !view) return; 
  //     view.dispatch( 
  //       view.state.changeByRange((range) => ({ 
  //         changes: [ 
  //           { from: range.from, insert: '**' }, 
  //           { from: range.to, insert: '**' }, 
  //         ], 
  //         range: EditorSelection.range(range.from + 2, range.to + 2), 
  //       })), 
  //     ); 
  //   }, 
  // }; 

  return <Card shadow='none' {...getRootProps()}
    className={`p-2 relative border-2 border-border transition-all ${isDragAccept ? 'border-2 border-green-500 border-dashed transition-all' : ''}`}>
    <div ref={cardRef}
      onKeyUp={async event => {
        event.preventDefault();
        if (event.key === 'Enter' && event.ctrlKey) {
          await onSend?.({
            content,
            files: store.files.map(i => { return { ...i, uploadPath: i.uploadPromise.value, type: i.type } })
          })
          onChange?.('')
          store.files = []
        }
      }}
      onKeyDown={e => {
        onHeightChange?.()
      }}>
      <MarkdownEditor
        value={content}
        toolbars={[bold, italic, "header", olist, ulist, quote, strike, underline, code, codeBlock, todo, link, image]}
        autoFocus={true}
        onChange={e => {
          console.log(e)
          onChange?.(e)
        }}
      // renderPreview={({ source }, initVisible) => {  
      //   return <MarkdownRender
      //     content={content}
      //     onChange={onChange} disableOverflowing />
      // }}
      />

      {
        store.files.length > 0 && <div className='w-full my-2'>
          <AttachmentsRender files={store.files} />
        </div>
      }
      {
        isWriting &&
        <div id='ai-write-suggestions' className='flex gap-2 items-center'>
          <Button onClick={e => {
            ai.isWriting = false
          }} startContent={<Icon icon="ic:sharp-check" className='green' />} size='sm' variant='light' color='success'>{t('accept')}</Button>
          <Button onClick={e => {
            store.focus()
            ai.isWriting = false
          }} startContent={<Icon icon="ic:sharp-close" className='red' />} size='sm' variant='light' color='danger'>{t('reject')}</Button>
          <Button onClick={e => {
            ai.abort()
          }} startContent={<Icon icon="mynaui:stop" className='blinko' />} size='sm' variant='light' color='warning'>{t('stop')} </Button>
        </div>
      }

      {/* Footer toolbar  */}
      <div className='flex items-center'>
        <BottomToolbar items={[
          {
            icon: blinko.noteTypeDefault == NoteType.BLINKO ? <LightningIcon className='blinko' /> :
              <NotesIcon className='note' />,
            tooltipContent: blinko.noteTypeDefault == NoteType.BLINKO ? t('blinko') : t('note'),
            onClick: () => {
              if (blinko.noteTypeDefault == NoteType.BLINKO) {
                blinko.noteTypeDefault = NoteType.NOTE
              } else {
                blinko.noteTypeDefault = NoteType.BLINKO
              }
            }
          },
          {
            icon: 'gravity-ui:hashtag',
            tooltipContent: t('insert-hashtag'),
            onClick: () => store.inertHash()
          },
          {
            icon: 'mage:file-upload',
            tooltipContent: t('upload-file'),
            onClick: () => open(),
            slot: <input {...getInputProps()} />
          },
          {
            icon: 'heroicons:camera',
            tooltipContent: t('upload-file'),
            onClick: () => ShowCamera((file) => {
              store.uploadFiles([file])
            })
          },
          {
            icon: 'hugeicons:voice-id',
            tooltipContent: t('recording'),
            onClick: () => ShowAudioDialog((file) => {
              store.uploadFiles([file])
            }),
            show: blinko.showAi
          }
        ]} />

        <Button isIconOnly size='sm' radius='md' onClick={() => {
          RootStore.Get(DialogStore).close()
        }} className={`${mode == 'create' ? 'hidden' : 'group ml-auto mr-2'}`} >
          <CancelIcon className='primary-foreground group-hover:rotate-[180deg] transition-all' />
        </Button>


        <Button isIconOnly isDisabled={!canSend} size='sm' radius='md' isLoading={isSendLoading} onClick={async e => {
          await onSend?.({
            content,
            files: store.files.map(i => { return { ...i, uploadPath: i.uploadPromise.value } })
          })
          onChange?.('')
          store.files = []
          ai.isWriting = false
        }} className={`${mode == 'create' ? 'ml-auto' : ''} w-[60px] group ml-auto`} color='primary' >
          {
            store.files?.some(i => i.uploadPromise?.loading?.value) ?
              <Icon icon="line-md:uploading-loop" width="24" height="24" /> :
              <SendIcon className='primary-foreground !text-primary-foreground group-hover:rotate-[-35deg] transition-all' />
          }
        </Button>
      </div>


    </div>
  </Card>
})
