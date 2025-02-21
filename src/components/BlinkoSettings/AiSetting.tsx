import { observer } from "mobx-react-lite";
import { AccordionItem, Accordion, Autocomplete, AutocompleteItem, Button, Card, Code, Input, Select, SelectItem, Switch, Tooltip, Chip, Slider } from "@nextui-org/react";
import { RootStore } from "@/store";
import { BlinkoStore } from "@/store/blinkoStore";
import { PromiseCall } from "@/store/standard/PromiseState";
import { Icon } from "@iconify/react";
import { api } from "@/lib/trpc";
import { AiStore } from "@/store/aiStore";
import { useTranslation } from "react-i18next";
import { Item, ItemWithTooltip } from "./Item";
import { useEffect } from "react";
import { useMediaQuery } from "usehooks-ts";
import { ShowRebuildEmbeddingProgressDialog } from "../Common/RebuildEmbeddingProgress";
import { showTipsDialog } from "../Common/TipsDialog";
import TagSelector from "@/components/Common/TagSelector";
import { CollapsibleCard } from "../Common/CollapsibleCard";

export const AiSetting = observer(() => {
  const blinko = RootStore.Get(BlinkoStore)
  const ai = RootStore.Get(AiStore)
  const { t } = useTranslation()
  const isPc = useMediaQuery('(min-width: 768px)')

  const store = RootStore.Local(() => ({
    isVisible: false,
    isEmbeddingKeyVisible: false,
    apiKey: '',
    apiVersion: '',
    embeddingApiKey: '',
    embeddingApiEndpoint: '',
    apiEndPoint: '',
    aiModel: '',
    embeddingModel: '',
    embeddingTopK: 2,
    embeddingScore: 1.5,
    embeddingLambda: 0.5,
    showEmeddingAdvancedSetting: false,
    excludeEmbeddingTagId: null as number | null,
    setIsOpen(open: boolean) {
      this.isOpen = open;
    }
  }))

  useEffect(() => {
    store.apiEndPoint = blinko.config.value?.aiApiEndpoint!
    store.apiVersion = blinko.config.value?.aiApiVersion!
    store.apiKey = blinko.config.value?.aiApiKey!
    store.aiModel = blinko.config.value?.aiModel!
    store.embeddingModel = blinko.config.value?.embeddingModel!
    store.embeddingTopK = blinko.config.value?.embeddingTopK!
    store.embeddingScore = blinko.config.value?.embeddingScore!
    store.embeddingLambda = blinko.config.value?.embeddingLambda!
    store.embeddingApiEndpoint = blinko.config.value?.embeddingApiEndpoint!
    store.embeddingApiKey = blinko.config.value?.embeddingApiKey!
    store.excludeEmbeddingTagId = blinko.config.value?.excludeEmbeddingTagId!
  }, [blinko.config.value])

  return (
    <CollapsibleCard
      icon="mingcute:ai-line"
      title="AI"
    >
      <Item
        leftContent={<div className="flex items-center gap-2">
          {t('use-ai')}
          <Tooltip content={<div className="w-[300px] flex flex-col gap-2">
            <div>{t('in-addition-to-the-gpt-model-there-is-a-need-to-ensure-that-it-is-possible-to-invoke-the')}<Code color="primary">text-embedding</Code></div>
            <div>{t('speech-recognition-requires-the-use-of')}<Code color="primary">whisper</Code></div>
          </div>}>
            <Icon icon="proicons:info" width="18" height="18" />
          </Tooltip>
        </div>}
        rightContent={<Switch
          isSelected={blinko.config.value?.isUseAI}
          onChange={e => {
            PromiseCall(api.config.update.mutate({
              key: 'isUseAI',
              value: e.target.checked
            }), { autoAlert: false })
          }}
        />} />
      <Item
        leftContent={<>{t('model-provider')}</>}
        rightContent={
          <Select
            radius="lg"
            selectedKeys={[blinko.config.value?.aiModelProvider!]}
            onSelectionChange={key => {
              const value = Array.from(key)[0] as string
              blinko.config.value!.aiModelProvider = value as any
              PromiseCall(api.config.update.mutate({
                key: 'aiModelProvider',
                value: value
              }), { autoAlert: false })
            }}
            size="sm"
            className="w-[200px]"
            label={t('select-model-provider')}
          >
            {ai.modelProviderSelect.map((item) => (
              <SelectItem key={item.value ?? ''} value={item.value} startContent={item.icon}>
                {item.label}
              </SelectItem>
            ))}
          </Select>} />

      {
        ai.modelSelect[blinko.config.value?.aiModelProvider!] && <Item
          leftContent={<ItemWithTooltip
            content={ai.modelSelectUILabel[blinko.config.value?.aiModelProvider!]?.modelTitle}
            toolTipContent={ai.modelSelectUILabel[blinko.config.value?.aiModelProvider!]?.modelTooltip} />}
          rightContent={
            <Autocomplete
              radius="lg"
              allowsCustomValue={true}
              selectedKey={store.aiModel ?? ''}
              inputValue={store.aiModel ?? ''}
              onInputChange={e => {
                store.aiModel = e
              }}
              onBlur={e => {
                PromiseCall(api.config.update.mutate({
                  key: 'aiModel',
                  value: store.aiModel
                }), { autoAlert: false })
              }}
              onSelectionChange={(key) => {
                store.aiModel = key as string
              }}
              size="sm"
              className="w-[200px]"
              label={t('select-model')}
            >
              {ai.modelSelect[blinko.config.value?.aiModelProvider!]!.map((item) => (
                <AutocompleteItem key={item.value} value={item.value}>
                  {item.label}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          } />
      }

      {ai.embeddingSelect[blinko.config.value?.aiModelProvider!] && (
        <Item
          type={isPc ? 'row' : 'col'}
          leftContent={<div className="flex items-center gap-2"> <ItemWithTooltip
            content={<>{t('embedding-model')}</>} toolTipContent={<div className="w-[300px] flex flex-col gap-2">
              <div>{t('embedding-model-description')}</div>
            </div>} /> <Chip size="sm" color="warning" className="text-white cursor-pointer" onClick={() => store.showEmeddingAdvancedSetting = !store.showEmeddingAdvancedSetting}>Advanced</Chip></div>}
          rightContent={
            <div className="flex w-full ml-auto justify-start">
              <Autocomplete
                radius="lg"
                allowsCustomValue={true}
                inputValue={store.embeddingModel ?? ''}
                selectedKey={store.embeddingModel ?? ''}
                onInputChange={e => {
                  store.embeddingModel = e
                }}
                onBlur={e => {
                  PromiseCall(api.config.update.mutate({
                    key: 'embeddingModel',
                    value: store.embeddingModel
                  }), { autoAlert: false })
                }}
                onSelectionChange={(key) => {
                  store.embeddingModel = key as string
                }}
                size="sm"
                className={`${isPc ? 'w-[250px]' : 'w-full'}`}
                label={t('embedding-model')}
              >
                {ai.embeddingSelect[blinko.config.value?.aiModelProvider!]!.map((item) => (
                  <AutocompleteItem key={item.value} value={item.value}>
                    {item.label}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </div>
          } />
      )}

      {
        store.showEmeddingAdvancedSetting && <Item
          className="ml-6"
          type={isPc ? 'row' : 'col'}
          leftContent={<>{t('embedding-api-endpoint')}</>}
          rightContent={
            <div className="flex md:w-[300px] w-full ml-auto justify-start">
              <Input
                size='sm'
                label={t('api-endpoint')}
                variant="bordered"
                className="w-full"
                placeholder="https://api.openapi.com/v1/"
                value={store.embeddingApiEndpoint}
                onChange={e => {
                  store.embeddingApiEndpoint = e.target.value
                }}
                onBlur={() => {
                  PromiseCall(api.config.update.mutate({
                    key: 'embeddingApiEndpoint',
                    value: store.embeddingApiEndpoint
                  }), { autoAlert: false })
                }}
              />
            </div>
          } />
      }

      {
        store.showEmeddingAdvancedSetting && <Item
          className="ml-6"
          type={isPc ? 'row' : 'col'}
          leftContent={<>{t('embedding-api-key')}</>}
          rightContent={
            <div className="flex md:w-[300px] w-full ml-auto justify-start">
              <Input
                size='sm'
                label="API key"
                variant="bordered"
                className="w-full"
                placeholder="Enter your embedding api key"
                value={store.embeddingApiKey}
                onChange={e => {
                  store.embeddingApiKey = e.target.value
                }}
                onBlur={() => {
                  PromiseCall(api.config.update.mutate({
                    key: 'embeddingApiKey',
                    value: store.embeddingApiKey
                  }), { autoAlert: false })
                }}
                endContent={
                  <button className="focus:outline-none" type="button" onClick={e => store.isEmbeddingKeyVisible = !store.isEmbeddingKeyVisible}>
                    {store.isEmbeddingKeyVisible ? (
                      <Icon icon="mdi:eye-off" width="20" height="20" />
                    ) : (
                      <Icon icon="mdi:eye" width="20" height="20" />
                    )}
                  </button>
                }
                type={store.isEmbeddingKeyVisible ? "text" : "password"}
              />
            </div>
          } />
      }

      {
        store.showEmeddingAdvancedSetting && <Item
          className="ml-6"
          type={isPc ? 'row' : 'col'}
          leftContent={<ItemWithTooltip
            content={<>Top K</>} toolTipContent={<div className="md:w-[300px] flex flex-col gap-2">
              <div>{t('top-k-description')}</div>
            </div>} />}
          rightContent={
            <div className="flex md:w-[300px] w-full ml-auto justify-start">
              <Slider
                onChangeEnd={e => {
                  PromiseCall(api.config.update.mutate({
                    key: 'embeddingTopK',
                    value: store.embeddingTopK
                  }), { autoAlert: false })
                }}
                onChange={e => {
                  store.embeddingTopK = Number(e)
                }}
                value={store.embeddingTopK}
                size="md"
                step={1}
                color="foreground"
                label={'value'}
                showSteps={true}
                maxValue={10}
                minValue={1}
                defaultValue={2}
                className="w-full"
              />
            </div>
          } />
      }

      {
        store.showEmeddingAdvancedSetting && <Item
          className="ml-6"
          type={isPc ? 'row' : 'col'}
          leftContent={<ItemWithTooltip
            content={<>Score</>}
            toolTipContent={<div className="md:w-[300px] flex flex-col gap-2">
              <div>{t('embedding-score-description')}</div>
            </div>} />}
          rightContent={
            <div className="flex md:w-[300px] w-full ml-auto justify-start">
              <Slider
                onChangeEnd={e => {
                  PromiseCall(api.config.update.mutate({
                    key: 'embeddingScore',
                    value: store.embeddingScore
                  }), { autoAlert: false })
                }}
                onChange={e => {
                  store.embeddingScore = Number(e)
                }}
                value={store.embeddingScore}
                size="md"
                step={0.1}
                color="foreground"
                label={'value'}
                showSteps={true}
                maxValue={2.0}
                minValue={0.1}
                defaultValue={0.8}
                className="w-full"
              />
            </div>
          } />
      }
      {
        store.showEmeddingAdvancedSetting && <Item
          className="ml-6"
          type={isPc ? 'row' : 'col'}
          leftContent={<ItemWithTooltip
            content={<>Embedding Lambda</>}
            toolTipContent={<div className="md:w-[300px] flex flex-col gap-2">
              <div>{t('embedding-lambda-description')}</div>
            </div>} />}
          rightContent={
            <div className="flex md:w-[300px] w-full ml-auto justify-start">
              <Slider
                onChangeEnd={e => {
                  PromiseCall(api.config.update.mutate({
                    key: 'embeddingLambda',
                    value: store.embeddingLambda
                  }), { autoAlert: false })
                }}
                onChange={e => {
                  store.embeddingLambda = Number(e)
                }}
                value={store.embeddingLambda}
                size="md"
                step={0.1}
                color="foreground"
                label={'value'}
                showSteps={true}
                maxValue={1.0}
                minValue={0.1}
                defaultValue={0.3}
                className="w-full"
              />
            </div>
          } />
      }

      {
        store.showEmeddingAdvancedSetting && (
          <Item
            className="ml-6"
            type={isPc ? 'row' : 'col'}
            leftContent={<div className="flex flex-col gap-1">
              <ItemWithTooltip content={<>{t('exclude-tag-from-embedding')}</>} toolTipContent={t('exclude-tag-from-embedding-tip')} />
              <div className="text-desc text-xs">{t('exclude-tag-from-embedding-desc')}</div>
            </div>}
            rightContent={
              <TagSelector
                selectedTag={store.excludeEmbeddingTagId?.toString() || null}
                onSelectionChange={(key) => {
                  store.excludeEmbeddingTagId = key ? Number(key) : null
                  PromiseCall(api.config.update.mutate({
                    key: 'excludeEmbeddingTagId',
                    value: key ? Number(key) : null
                  }), { autoAlert: false })
                }}
              />} />
        )
      }

      {
        blinko.config.value?.aiModelProvider != 'Ollama' &&
        <Item
          type={isPc ? 'row' : 'col'}
          leftContent={<div className="flex flex-col ga-1">
            <div>API Key</div>
            <div className="text-desc text-xs">{t('user-custom-openai-api-key')}</div>
          </div>}
          rightContent={
            <Input
              size='sm'
              label="API key"
              variant="bordered"
              className="w-full md:w-[300px]"
              placeholder="Enter your api key"
              value={store.apiKey}
              onChange={e => { store.apiKey = e.target.value }}
              onBlur={e => {
                PromiseCall(api.config.update.mutate({
                  key: 'aiApiKey',
                  value: store.apiKey
                }), { autoAlert: false })
              }}
              endContent={
                <button className="focus:outline-none" type="button" onClick={e => store.isVisible = !store.isVisible} aria-label="toggle password visibility">
                  {store.isVisible ? (
                    <Icon icon="mdi:eye-off" width="20" height="20" />
                  ) : (
                    <Icon icon="mdi:eye" width="20" height="20" />
                  )}
                </button>
              }
              type={store.isVisible ? "text" : "password"}
            />
          } />
      }

      {
        blinko.config.value?.aiModelProvider == 'AzureOpenAI' &&
        <Item
          type={isPc ? 'row' : 'col'}
          leftContent={<div className="flex flex-col ga-1">
            <>{t('user-custom-azureopenai-api-version')}</>
          </div>}
          rightContent={
            <Input
              variant="bordered"
              className="w-full md:w-[300px]"
              placeholder="Enter API version"
              value={store.apiVersion}
              onChange={e => { store.apiVersion = e.target.value }}
              onBlur={e => {
                PromiseCall(api.config.update.mutate({
                  key: 'aiApiVersion',
                  value: store.apiVersion
                }), { autoAlert: false })
              }}
              type="text"
            />
          } />
      }

      <Item
        type={isPc ? 'row' : 'col'}
        leftContent={< div className="flex flex-col gap-1" >
          <>{ai.modelSelectUILabel[blinko.config.value?.aiModelProvider!]?.endpointTitle}</>
          <div className="text-desc text-xs">{ai.modelSelectUILabel[blinko.config.value?.aiModelProvider!]?.endpointTooltip}</div>
        </div >}
        rightContent={< Input
          size='sm'
          label={t('api-endpoint')}
          variant="bordered"
          className="w-full md:w-[300px]"
          placeholder="https://api.openapi.com/v1/"
          value={store.apiEndPoint}
          onChange={e => { store.apiEndPoint = e.target.value }}
          onBlur={e => {
            PromiseCall(api.config.update.mutate({
              key: 'aiApiEndpoint',
              value: store.apiEndPoint
            }), { autoAlert: false })
          }}
        />} />


      <Item
        type={isPc ? 'row' : 'col'}
        leftContent={<div className="flex flex-col  gap-2">
          <div>{t('rebuild-embedding-index')}</div>
          <div className="text-desc text-xs">{t('notes-imported-by-other-means-may-not-have-embedded-vectors')}</div>
        </div>}
        rightContent={
          <div className="flex w-full ml-auto justify-end gap-2">
            <Button color='danger' startContent={<Icon icon="mingcute:refresh-4-ai-line" width="20" height="20" />} onPress={() => {
              showTipsDialog({
                title: t('force-rebuild-embedding-index'),
                content: t('if-you-have-a-lot-of-notes-you-may-consume-a-certain-number-of-tokens'),
                onConfirm: () => {
                  ShowRebuildEmbeddingProgressDialog(true)
                }
              })
            }}>{t('force-rebuild')}</Button>
            <Button color='primary' startContent={<Icon icon="mingcute:refresh-4-ai-line" width="20" height="20" />} onPress={() => {
              showTipsDialog({
                title: t('rebuild-embedding-index'),
                content: t('if-you-have-a-lot-of-notes-you-may-consume-a-certain-number-of-tokens'),
                onConfirm: () => {
                  ShowRebuildEmbeddingProgressDialog()
                }
              })
            }}>{t('rebuild')}</Button>
          </div>
        } />

    </CollapsibleCard>
  );
})