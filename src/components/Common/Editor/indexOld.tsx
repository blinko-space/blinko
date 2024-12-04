import '@mdxeditor/editor/style.css';
import '@/styles/editor.css';
import { RootStore } from '@/store';
import { PromiseState } from '@/store/standard/PromiseState';
import { ButtonWithTooltip, ChangeCodeMirrorLanguage, ConditionalContents, InsertCodeBlock, InsertSandpack, InsertImage, InsertTable, ListsToggle, MDXEditorMethods, SandpackConfig, sandpackPlugin, Select, ShowSandpackInfo, SingleChoiceToggleGroup, toolbarPlugin, UndoRedo, type CodeBlockEditorDescriptor } from '@mdxeditor/editor';
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

const { MDXEditor } = await import('@mdxeditor/editor')

// https://mdxeditor.dev/editor/docs/theming
// https://react-dropzone.js.org/

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

export const HandleFileType = (originFiles: Attachment[]): FileType[] => {
  if (originFiles?.length == 0) return []
  const res = originFiles?.map(file => {
    console.log("file:", file)
    const extension = helper.getFileExtension(file.name)
    const previewType = helper.getFileType(file.type, file.name)
    return {
      name: file.name,
      size: file.size,
      previewType,
      extension: extension ?? '',
      preview: file.path,
      uploadPromise: new PromiseState({ function: async () => file.path }),
      type: file.type
    }
  })
  res?.map(i => i.uploadPromise.call())
  return res
}

export const getEditorElements = () => {
  const editorElements = document.querySelectorAll('._contentEditable_uazmk_379') as NodeListOf<HTMLElement>
  return editorElements
}


export const handleEditorKeyEvents = () => {
  const editorElements = getEditorElements()
  editorElements.forEach(element => {
    element.addEventListener('keydown', (e) => {
      const isTagSelectVisible = IsTagSelectVisible()
      if (e.key === 'Enter' && isTagSelectVisible) {
        e.preventDefault()
        return false
      }
    }, true)
  })
}

const Editor = observer(({ content, onChange, onSend, isSendLoading, bottomSlot, originFiles, mode, onHeightChange }: IProps) => {
  content = ProcessCodeBlocks(content)
  const [canSend, setCanSend] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const { t } = useTranslation()
  const isPc = useMediaQuery('(min-width: 768px)')
  const mdxEditorRef = React.useRef<MDXEditorMethods>(null)
  const cardRef = React.useRef(null)
  const blinko = RootStore.Get(BlinkoStore)
  const ai = RootStore.Get(AiStore)
  const { theme } = useTheme();

  const pastedFiles = usePasteFile(cardRef);
  useEffect(() => {
    if (pastedFiles) {
      store.uploadFiles(pastedFiles)
    }
  }, [pastedFiles])

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
      if (store.files?.length == 0 && mdxEditorRef.current?.getMarkdown() == '') {
        return setCanSend(false)
      }
      if (store.files?.some(i => i.uploadPromise?.loading?.value === true)) {
        return setCanSend(false)
      }
      if (store.files?.every(i => !i?.uploadPromise?.loading?.value) && store.files?.length != 0) {
        return setCanSend(true)
      }
      if (mdxEditorRef.current?.getMarkdown() != '') {
        return setCanSend(true)
      }
    },
    replaceMarkdownTag(text: string, forceFocus = false) {
      if (mdxEditorRef.current) {
        if (store.lastRange) {
          console.log('replaceMarkdownTag', store.lastRangeText)
          const currentTextBeforeRange = store.lastRangeText.replace(/&#x20;/g, " ") ?? ''
          const currentText = mdxEditorRef.current!.getMarkdown().replace(/\\/g, '').replace(/&#x20;/g, " ")
          const tag = currentTextBeforeRange.replace(helper.regex.isEndsWithHashTag, "#" + text + '&#x20;')
          const MyContent = currentText.replace(currentTextBeforeRange, tag)
          mdxEditorRef.current.setMarkdown(MyContent)
          store.focus(forceFocus)
        }
      }
    },
    insertMarkdown(text) {
      const Mycontent = mdxEditorRef.current!.getMarkdown()
      mdxEditorRef.current!.setMarkdown(Mycontent + text)
      mdxEditorRef.current!.focus(() => {
        onChange?.(Mycontent + text)
      }, {
        defaultSelection: 'rootEnd'
      })
    },
    insertMarkdownByEvent(text) {
      const processedText = text
        .replace(/\#/g, '\\#')
        .replace(/ /g, '&#x20;')
        .replace(/```/g, '\\`\\`\\`')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\-/g, '\\-')
        .replace(/\*/g, '\\*')
        .replace(/(\r\n|\r|\n|↵|\\n)/g, '&#x20;\n\n&#x20;') //|\u2028|\u2029|\x0B|\x0C|\u0085 &#x20;
      mdxEditorRef.current!.insertMarkdown(processedText)
      store.focus()
    },
    focus(force = false) {
      console.log(mdxEditorRef.current)
      if (force && store.lastRange) {
        const editorElements = getEditorElements()
        if (editorElements.length > 0) {
          editorElements.forEach(editorElement => {
            requestAnimationFrame(() => {
              const range = document.createRange()
              const selection = window.getSelection()
              const walker = document.createTreeWalker(
                editorElement,
                NodeFilter.SHOW_TEXT,
                null
              )
              let lastNode: any = null
              while (walker.nextNode()) {
                lastNode = walker.currentNode
              }
              if (lastNode) {
                range.setStart(lastNode, lastNode?.length)
                range.setEnd(lastNode, lastNode?.length)
                selection?.removeAllRanges()
                selection?.addRange(range)
                editorElement.focus()
              }
            })
          })
        }
        onChange?.(mdxEditorRef.current!.getMarkdown())
      } else {
        mdxEditorRef.current!.focus(() => {
          onChange?.(mdxEditorRef.current!.getMarkdown())
        }, {
          defaultSelection: 'rootEnd'
        })
      }
    },
    clearMarkdown() {
      if (mdxEditorRef.current) {
        mdxEditorRef.current.setMarkdown("")
        store.focus()
      }
    },
    inertHash() {
      mdxEditorRef.current!.insertMarkdown("&#x20;#")
      mdxEditorRef.current!.focus()
      store.handlePopTag()
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
      const content = mdxEditorRef.current!.getMarkdown()
      mdxEditorRef.current!.setMarkdown(content.slice(0, -1))
    },
    setMarkdownLoading(loading: boolean) {
      if (loading) {
        mdxEditorRef.current!.insertMarkdown("Thinking...")
        store.focus()
      } else {
        const content = mdxEditorRef.current!.getMarkdown()
        const newContent = content.replace(/Thinking.../g, '')
        mdxEditorRef.current!.setMarkdown(newContent)
        store.focus()
      }
    }
  }))
  //fix ui not render
  useEffect(() => {
    store.updateSendStatus()
    setIsWriting(ai.isWriting)
    onHeightChange?.()
    console.log(content, '!!!!!!!!!!!!!')
  }, [blinko.noteTypeDefault, content, ai.isWriting, store.files?.length])

  useEffect(() => {
    eventBus.on('editor:replace', store.replaceMarkdownTag)
    eventBus.on('editor:clear', store.clearMarkdown)
    eventBus.on('editor:insert', store.insertMarkdownByEvent)
    eventBus.on('editor:deleteLastChar', store.deleteLastChar)
    eventBus.on('editor:focus', store.focus)
    eventBus.on('editor:setMarkdownLoading', store.setMarkdownLoading)
    handleEditorKeyEvents()
    store.handleIOSFocus()
    return () => {
      eventBus.off('editor:replace', store.replaceMarkdownTag)
      eventBus.off('editor:clear', store.clearMarkdown)
      eventBus.off('editor:insert', store.insertMarkdownByEvent)
      eventBus.off('editor:deleteLastChar', store.deleteLastChar)
      eventBus.off('editor:focus', store.focus)
      eventBus.off('editor:setMarkdownLoading', store.setMarkdownLoading)
    }
  }, [])

  useEffect(() => {
    if (originFiles?.length != 0) {
      store.files = HandleFileType(originFiles!)
    }
  }, [originFiles])

  const {
    getRootProps,
    isDragAccept,
    getInputProps,
    open
  } = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: acceptedFiles => {
      store.uploadFiles(acceptedFiles)
    }
  });

  return <Card
    shadow='none' {...getRootProps()}
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
      <MDXEditor
        onError={(error) => {
          console.error('Editor Error:', error);
          setErrMsg(error?.error)
          console.log(errMsg)
        }}
        translation={(key, defaultValue) => {
          if (key == 'toolbar.bulletedList') return t('bulleted-list');
          if (key == 'toolbar.numberedList') return t('numbered-list');
          if (key == 'toolbar.checkList') return t('check-list');
          if (key == 'toolbar.table') return t('insert-table');
          if (key == 'toolbar.codeBlock') return t('insert-codeblock');
          if (key == 'toolbar.insertSandpack') return t('insert-sandpack');
          return defaultValue
        }}
        ref={mdxEditorRef}
        placeholder={t('i-have-a-new-idea')}
        className={theme == 'dark' ? "dark-theme dark-editor" : ''}
        contentEditableClassName='prose'
        onChange={v => {
          onChange?.(v)
          store.handlePopTag()
          store.handlePopAiWrite()
        }}
        autoFocus={{
          defaultSelection: 'rootEnd'
        }}
        markdown={content}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <div className='flex flex-col  w-full'>
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
                      mdxEditorRef.current!.setMarkdown(ai.originalContent)
                      store.focus()
                      ai.isWriting = false
                    }} startContent={<Icon icon="ic:sharp-close" className='red' />} size='sm' variant='light' color='danger'>{t('reject')}</Button>
                    <Button onClick={e => {
                      ai.abort()
                    }} startContent={<Icon icon="mynaui:stop" className='blinko' />} size='sm' variant='light' color='warning'>{t('stop')} </Button>
                  </div>
                }
                <div className='flex w-full items-center'>
                  <ButtonWithTooltip className='!w-[24px] !h-[24px]' title={
                    blinko.noteTypeDefault == NoteType.BLINKO ? t('blinko') : t('note')
                  } onClick={e => {
                    if (blinko.noteTypeDefault == NoteType.BLINKO) {
                      blinko.noteTypeDefault = NoteType.NOTE
                    } else {
                      blinko.noteTypeDefault = NoteType.BLINKO
                    }
                  }}>
                    {
                      blinko.noteTypeDefault == NoteType.BLINKO ? <LightningIcon className='blinko' /> :
                        <NotesIcon className='note' />
                    }
                  </ButtonWithTooltip>
                  <ButtonWithTooltip className='!w-[24px] !h-[24px] mr-2' title={t('insert-hashtag')} onClick={e => {
                    store.inertHash()
                  }}>
                    <HashtagIcon />
                  </ButtonWithTooltip>

                  <Divider orientation="vertical" />

                  <ListsToggle />
                  {isPc && <InsertTable />}
                  {isPc && <InsertImage />}
                  <ConditionalContents
                    options={[
                      { when: (editor) => editor?.editorType === 'codeblock', contents: () => <ChangeCodeMirrorLanguage /> },
                      { when: (editor) => editor?.editorType === 'sandpack', contents: () => <ShowSandpackInfo /> },
                      {
                        fallback: () => (<>
                          {isPc && <InsertCodeBlock />}
                          {isPc && <InsertSandpack />}
                        </>)
                      }
                    ]}
                  />
                  <Divider orientation="vertical" />

                  <ButtonWithTooltip className='!w-[24px] !h-[24px] mr-2' title={t('upload-file')} onClick={e => {
                    open()
                  }}>
                    <input {...getInputProps()} />
                    <FileUploadIcon className='hover:opacity-80 transition-all' />
                  </ButtonWithTooltip>


                  {
                    blinko.showAi && <ButtonWithTooltip className='!w-[24px] !h-[24px] mr-2' title={t('recording')} onClick={e => {
                      ShowAudioDialog((file) => {
                        store.uploadFiles([file])
                      })
                    }}>
                      <VoiceIcon className='primary-foreground group-hover:rotate-[180deg] transition-all' />
                    </ButtonWithTooltip>
                  }


                  <ButtonWithTooltip title={t('upload-file')} className='!w-[24px] !h-[24px] mr-2' onClick={e => {
                    ShowCamera((file) => {
                      console.log(file)
                      store.uploadFiles([file])
                    })
                  }}>
                    <CameraIcon className='primary-foreground group-hover:rotate-[180deg] transition-all' />
                  </ButtonWithTooltip>


                  <Button size='sm' radius='md' onClick={() => {
                    RootStore.Get(DialogStore).close()
                  }} className={`${mode == 'create' ? 'hidden' : 'group ml-auto mr-2'}`} isIconOnly>
                    <CancelIcon className='primary-foreground group-hover:rotate-[180deg] transition-all' />
                  </Button>


                  <Button isDisabled={!canSend} size='sm' radius='md' isLoading={isSendLoading} onClick={async e => {
                    await onSend?.({
                      content,
                      files: store.files.map(i => { return { ...i, uploadPath: i.uploadPromise.value } })
                    })
                    onChange?.('')
                    store.files = []
                    ai.isWriting = false
                  }} className={`${mode == 'create' ? 'ml-auto' : ''} w-[60px] group`} isIconOnly color='primary' >
                    {
                      store.files?.some(i => i.uploadPromise?.loading?.value) ?
                        <Icon icon="line-md:uploading-loop" width="24" height="24" /> :
                        <SendIcon className='primary-foreground !text-primary-foreground group-hover:rotate-[-35deg] transition-all' />
                    }
                  </Button>
                </div>
              </div>
            )
          }),
          ...MyPlugins
        ]}
      />
      {errMsg && <div className='text-red-500 text-sm mt-2'>{errMsg}</div>}
    </div>
  </Card >
})

export default Editor

