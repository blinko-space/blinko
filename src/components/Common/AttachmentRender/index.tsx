import React, { useEffect, useState } from 'react';
import { FileIcons } from '../FileIcon';
import { observer } from 'mobx-react-lite';
import { helper } from '@/lib/helper';
import { type Attachment } from '@/server/types';
import { FileType } from '../Editor/type';
import { HandleFileType } from '../Editor/indexOld';
import { DeleteIcon, DownloadIcon } from './icons';
import { ImageRender } from './imageRender';

//https://www.npmjs.com/package/browser-thumbnail-generator

type IProps = {
  files: FileType[]
  preview?: boolean
  columns?: number
}

const AttachmentsRender = observer((props: IProps) => {
  const { files, preview = false, columns = 3 } = props
  return <>
    {/* image render  */}
    <ImageRender {...props} />
    {/* video render  todo:improve style*/}
    <div className={`columns-1 md:columns-1`}>
      {files?.filter(i => i.previewType == 'video').map((file, index) => (
        <div className='group relative flex p-2 items-center gap-2 cursor-pointer tansition-all rounded-2xl'>
          <video src={file.preview} id="player" playsInline controls className='rounded-2xl w-full z-0' />
          {!file.uploadPromise?.loading?.value && !preview &&
            <DeleteIcon className='absolute z-10 right-[5px] top-[5px]' files={files} file={file} />
          }
          {preview && <DownloadIcon className='top-[8px] right-[8px]' file={file} />}
        </div>
      ))}
    </div>

    {/* audio render  todo:improve style*/}
    <div className={`columns-1 md:columns-1`}>
      {files?.filter(i => i.previewType == 'audio').map((file, index) => (
        <div className='group relative flex p-2 items-center gap-2 cursor-pointer tansition-all rounded-2xl'>
          <audio src={file.preview} id="player" playsInline controls className='rounded-2xl w-full' />
          {!file.uploadPromise?.loading?.value && !preview &&
            <DeleteIcon files={files} className='absolute z-10 right-[5px] top-[5px] group-hover:opacity-100 opacity-0' file={file} />
          }
          {preview && <DownloadIcon className='top-[8px] right-[8px]' file={file} />}
        </div>
      ))}
    </div >


    {/* other file render  */}
    <div className={`grid grid-cols-${(columns - 1) < 1 ? 1 : (columns - 1)} md:grid-cols-${columns} gap-2 mt-3 select-none`}>
      {files?.filter(i => i.previewType == 'other').map((file, index) => (
        <div onClick={() => {
          if (preview) {
            helper.download.downloadByLink(file.uploadPromise.value)
          }
        }} className='relative flex p-2 w-full items-center gap-2 cursor-pointer bg-sencondbackground hover:bg-hover tansition-all rounded-md group'>
          <FileIcons path={file.name} isLoading={file.uploadPromise?.loading?.value} />
          <div className='truncate text-sm font-bold'>{file.name}</div>
          {!file.uploadPromise?.loading?.value && !preview &&
            <DeleteIcon className='ml-auto group-hover:opacity-100 opacity-0' files={files} file={file} />}
        </div>
      ))}
    </div >
  </>
})

const FilesAttachmentRender = observer(({ files, preview, columns }: { files: Attachment[], preview?: boolean, columns?: number }) => {
  const [handledFiles, setFiles] = useState<FileType[]>([])
  useEffect(() => {
    setFiles(HandleFileType(files))
  }, [files])
  return <AttachmentsRender files={handledFiles} preview={preview} columns={columns} />
})

export { AttachmentsRender, FilesAttachmentRender }

