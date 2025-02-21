import { RootStore } from "@/store";
import { ResourceStore } from "@/store/resourceStore";
import { observer } from "mobx-react-lite";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/Common/ScrollArea";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable } from 'react-beautiful-dnd-next';
import { toJS } from "mobx";
import { useRouter } from 'next/router';
import { MemoizedResourceItem } from "@/components/BlinkoResource/ResourceItem";
import { ResourceMultiSelectPop } from "@/components/BlinkoResource/ResourceMultiSelectpop";
import { Breadcrumbs, BreadcrumbItem, Button } from "@nextui-org/react";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingAndEmpty } from "@/components/Common/LoadingAndEmpty";
import { PhotoProvider } from "react-photo-view";

const Page = observer(() => {
  const router = useRouter();
  const resourceStore = RootStore.Get(ResourceStore);
  const { t } = useTranslation();
  const resources = useMemo(() =>
    toJS(resourceStore.blinko.resourceList.value) || [],
    [resourceStore.blinko.resourceList.value]
  );

  const selectedItems = resourceStore.selectedItems;

  const handleMoveSelectedToParent = useCallback(async () => {
    if (!resourceStore.currentFolder) return;
    const selectedResources = Array.from(selectedItems)
      .map(id => resources.find(r => r.id === id))
      .filter((item): item is NonNullable<typeof item> => item != null);

    if (selectedResources.length > 0) {
      await resourceStore.moveToParentFolder(selectedResources);
    }
  }, [resourceStore, selectedItems, resources]);

  const folderBreadcrumbs = useMemo(() => {
    if (!resourceStore.currentFolder) return [];
    return ['Root', ...resourceStore.currentFolder.split('/')];
  }, [resourceStore.currentFolder]);

  resourceStore.use(router)

  return (
    <>
      <DragDropContext onDragEnd={resourceStore.handleDragEnd}>
        <ScrollArea
          onBottom={resourceStore.loadNextPage}
          className="md:px-6 h-[calc(100%_-_5px)] md:h-[calc(100vh_-_100px)] px-2 md:max-w-[1000px] w-full overflow-x-hidden mx-auto"
        >
          <div className="flex items-center justify-between ">
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {resourceStore.currentFolder && (
                  <motion.div
                    key={resourceStore.currentFolder}
                    initial={{ y: -10, opacity: 0, height: 0 }}
                    animate={{ y: 0, opacity: 1, height: "auto" }}
                    exit={{ y: -10, opacity: 0, height: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      duration: 0.15
                    }}
                  >
                    <Breadcrumbs variant="solid" className="ml-[-8px]" size='lg'>
                      {folderBreadcrumbs.map((folder, index) => (
                        <BreadcrumbItem
                          key={folder}
                          onPress={() => {
                            if (index === 0) {
                              resourceStore.navigateBack(router);
                            } else {
                              const currentPathSegments = resourceStore.currentFolder?.split('/') || [];
                              const clickedPathLevel = index;
                              const stepsToGoBack = currentPathSegments.length - clickedPathLevel;

                              for (let i = 0; i < stepsToGoBack; i++) {
                                resourceStore.navigateBack(router);
                              }
                            }
                          }}
                        >
                          {folder}
                        </BreadcrumbItem>
                      ))}
                    </Breadcrumbs>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 mt-2 ">
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Button
                  size="sm"
                  color="primary"
                  onPress={resourceStore.handleNewFolder}
                  startContent={<Icon icon="material-symbols:create-new-folder-outline" className="w-5 h-5" />}
                >
                  {t('new-folder')}
                </Button>
              </motion.div>

              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => resourceStore.selectAllFiles(resources)}
                  startContent={<Icon icon="material-symbols:select-all" className="w-5 h-5" />}
                >
                  {t('select-all')}
                </Button>
              </motion.div>

              {selectedItems.size > 0 && resourceStore.currentFolder && resourceStore.currentFolder !== 'Root' && (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                >
                  <Button
                    variant="light"
                    onPress={handleMoveSelectedToParent}
                    startContent={<Icon icon="material-symbols:drive-file-move-outline" className="w-5 h-5" />}
                  >
                    {t('move-to-parent')}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          <LoadingAndEmpty
            isLoading={resourceStore.blinko.resourceList.isLoading}
            isEmpty={!resources.length}
            emptyMessage={t('no-resources-found')}
          />
          <PhotoProvider>
            {resources.length > 0 && (
              <Droppable droppableId="resources">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="py-2 min-h-[200px]"
                  >
                    {resources.map((item, index) => (
                      <MemoizedResourceItem
                        key={item.isFolder ? `folder-${item.folderName}` : `file-${item.id}`}
                        item={item}
                        index={index}
                        isSelected={selectedItems.has(item.id!)}
                        onSelect={resourceStore.toggleSelect}
                        onFolderClick={(folder) => resourceStore.navigateToFolder(folder, router)}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

          </PhotoProvider>

        </ScrollArea>
      </DragDropContext>
      <ResourceMultiSelectPop />
    </>
  );
});

export default Page;