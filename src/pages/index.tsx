import { BlinkoStore } from '@/store/blinkoStore';
import { _ } from '@/lib/lodash';
import { observer } from 'mobx-react-lite';
import Masonry from 'react-masonry-css';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/router';
import { BlinkoEditor } from '@/components/BlinkoEditor';
import { ScrollArea } from '@/components/Common/ScrollArea';
import { BlinkoCard } from '@/components/BlinkoCard';
import { useMediaQuery } from 'usehooks-ts';
import { BlinkoAddButton } from '@/components/BlinkoAddButton';
import { LoadingAndEmpty } from '@/components/Common/LoadingAndEmpty';

const Home = observer(() => {
  const { t } = useTranslation();
  const isPc = useMediaQuery('(min-width: 768px)')
  const blinko = RootStore.Get(BlinkoStore)
  blinko.useQuery(useRouter())
  const store = RootStore.Local(() => ({
    editorHeight: 30,
    get showEditor() {
      return !blinko.noteListFilterConfig.isArchived && !blinko.noteListFilterConfig.isRecycle
    },
    get showLoadAll() {
      return blinko.noteList.isLoadAll
    }
  }))

  return (
    <div
      style={{
        maxWidth: blinko.config.value?.maxHomePageWidth ? `${blinko.config.value?.maxHomePageWidth}px` : '100%'
      }}
      className={`md:p-0 relative h-full flex flex-col-reverse md:flex-col mx-auto`}>

      {store.showEditor && isPc && <div className='px-2 md:px-6' >
        <BlinkoEditor mode='create' key='create-key' onHeightChange={height => {
          if (!isPc) return
          store.editorHeight = height
        }} />
      </div>}
      {!isPc && <BlinkoAddButton />}

      <LoadingAndEmpty
        isLoading={blinko.noteList.isLoading}
        isEmpty={blinko.noteList.isEmpty}
      />

      {
        !blinko.noteList.isEmpty && <ScrollArea
          onBottom={() => blinko.onBottom()}
          style={{ height: store.showEditor ? `calc(100% - ${(isPc ? store.editorHeight : 0)}px)` : '100%' }}
          className={`px-2 mt-0 md:mt-4 md:px-6 w-full h-full transition-all scroll-area`}>
          <Masonry
            breakpointCols={{
              default: blinko.config?.value?.largeDeviceCardColumns ? Number(blinko.config?.value?.largeDeviceCardColumns) : 2,
              1280: blinko.config?.value?.mediumDeviceCardColumns ? Number(blinko.config?.value?.mediumDeviceCardColumns) : 2,
              768: blinko.config?.value?.smallDeviceCardColumns ? Number(blinko.config?.value?.smallDeviceCardColumns) : 1
            }}
            className="card-masonry-grid"
            columnClassName="card-masonry-grid_column">
            {
              blinko.noteList?.value?.map(i => {
                return <BlinkoCard key={i.id} blinkoItem={i} />
              })
            }
          </Masonry>
          {store.showLoadAll && <div className='select-none w-full text-center text-sm font-bold text-ignore my-4'>{t('all-notes-have-been-loaded', { items: blinko.noteList.value?.length })}</div>}
        </ScrollArea>
      }
    </div>
  );
});

export default Home;
