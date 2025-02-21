import "vditor/dist/index.css";
import '@/styles/vditor.css';
import { RootStore } from '@/store';
import { useTheme } from 'next-themes';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { FileType, OnSendContentType } from './type';
import { BlinkoStore } from '@/store/blinkoStore';
import { _ } from '@/lib/lodash';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import { type Attachment } from '@/server/types';
import { Card, Popover, PopoverTrigger, PopoverContent } from '@nextui-org/react';
import { AttachmentsRender, ReferenceRender } from '../AttachmentRender';
import { UploadButtons } from './Toolbar/UploadButtons';
import { ReferenceButton } from './Toolbar/ReferenceButton';
import { NoteTypeButton } from './Toolbar/NoteTypeButton';
import { HashtagButton } from './Toolbar/HashtagButton';
import { ViewModeButton } from './Toolbar/ViewModeButton';
import { SendButton } from './Toolbar/SendButton';
import {
  useEditorInit,
  useEditorEvents,
  useEditorFiles,
  useEditorHeight
} from './hooks/useEditor';
import { EditorStore } from "./editorStore";
import { AIWriteButton } from "./Toolbar/AIWriteButton";
import { FullScreenButton } from "./Toolbar/FullScreenButton";
import { eventBus } from "@/lib/event";
import { Icon } from "@iconify/react";
import { PluginApiStore } from "@/store/plugin/pluginApiStore";
import { PluginRender } from '@/store/plugin/pluginRender';
import { IconButton } from "./Toolbar/IconButton";

//https://ld246.com/guide/markdown
type IProps = {
  mode: 'create' | 'edit' | 'comment',
  content: string,
  onChange?: (content: string) => void,
  onHeightChange?: () => void,
  onSend: (args: OnSendContentType) => Promise<any>,
  isSendLoading?: boolean,
  bottomSlot?: ReactElement<any, any>,
  originFiles?: Attachment[],
  originReference?: number[],
  hiddenToolbar?: boolean
}

const Editor = observer(({ content, onChange, onSend, isSendLoading, originFiles, originReference = [], mode, onHeightChange, hiddenToolbar = false }: IProps) => {
  const cardRef = React.useRef(null)
  const isPc = useMediaQuery('(min-width: 768px)')
  const store = useLocalObservable(() => new EditorStore())
  const pluginApi = RootStore.Get(PluginApiStore)
  const blinko = RootStore.Get(BlinkoStore)
  const { t } = useTranslation()

  useEditorInit(store, onChange, onSend, mode, originReference, content);
  useEditorEvents(store);
  useEditorFiles(store, blinko, originFiles);
  useEditorHeight(onHeightChange, blinko, content, store);

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
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const handleFileReorder = (newFiles: FileType[]) => {
    store.updateFileOrder(newFiles);
  };

  const handleFullScreenToggle = () => {
    eventBus.emit('editor:setFullScreen', !store.isFullscreen);
  };

  return (
    <Card
      shadow='none' {...getRootProps()}
      className={`p-2 relative border-2 border-border transition-all overflow-visible 
      ${isDragAccept ? 'border-2 border-green-500 border-dashed' : ''} 
      ${store.isFullscreen ? 'fixed inset-0 z-[9999] m-0 rounded-none border-none bg-background' : ''}`}>

      <div ref={cardRef}
        className="overflow-visible relative"
        onKeyDown={e => {
          onHeightChange?.()
          if (isPc) return
          store.adjustMobileEditorHeight()
        }}>

        <div id={`vditor-${mode}`} className="vditor" />
        {store.files.length > 0 && (
          <div className='w-full my-2 attachment-container'>
            <AttachmentsRender files={store.files} onReorder={handleFileReorder} />
          </div>
        )}

        <div className='w-full mb-2 reference-container'>
          <ReferenceRender store={store} />
        </div>

        <div className='flex w-full items-center gap-1 mt-auto'>
          {!hiddenToolbar && (
            <>
              <NoteTypeButton
                noteType={store.noteType}
                setNoteType={(noteType) => {
                  store.noteType = noteType
                }}
              />
              <HashtagButton store={store} content={content} />
              <ReferenceButton store={store} />
              <AIWriteButton store={store} content={content} />
              <UploadButtons
                getInputProps={getInputProps}
                open={open}
                onFileUpload={store.uploadFiles}
              />
              {pluginApi.customToolbarIcons.map((item) => (
                <Popover key={item.name} placement={item.placement}>
                  <PopoverTrigger>
                    <div className="hover:bg-default-100 rounded-md">
                      <IconButton icon={item.icon} tooltip={item.tooltip} />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent>
                    <PluginRender content={item.content} />
                  </PopoverContent>
                </Popover>
              ))}
            </>
          )}
          <div className='flex items-center gap-1 ml-auto'>
            {store.showIsEditText && <div className="text-red-500 text-xs mr-2">{t('edited')}</div>}
            {isPc && <FullScreenButton isFullscreen={store.isFullscreen} onClick={handleFullScreenToggle} />}
            <ViewModeButton viewMode={store.viewMode} />
            <SendButton store={store} isSendLoading={isSendLoading} />
          </div>
        </div>
      </div>
    </Card>
  );
});

export default Editor