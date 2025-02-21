import { observer } from "mobx-react-lite";
import { BasicSetting } from "@/components/BlinkoSettings/BasicSetting";
import { AiSetting } from "@/components/BlinkoSettings/AiSetting";
import { PerferSetting } from "@/components/BlinkoSettings/PerferSetting";
import { TaskSetting } from "@/components/BlinkoSettings/TaskSetting";
import { ImportSetting } from "@/components/BlinkoSettings/ImportSetting";
import { ScrollArea } from "@/components/Common/ScrollArea";
import { UserStore } from "@/store/user";
import { RootStore } from "@/store";
import { UserSetting } from "@/components/BlinkoSettings/UserSetting";
import { AboutSetting } from "@/components/BlinkoSettings/AboutSetting";
import { StorageSetting } from "@/components/BlinkoSettings/StorageSetting";
import { ExportSetting } from "@/components/BlinkoSettings/ExportSetting";
import { MusicSetting } from "@/components/BlinkoSettings/MusicSetting";
import { SSOSetting } from "@/components/BlinkoSettings/SSOSetting";
import { useTranslation } from "react-i18next";
import { JSX } from "react";
import { ScrollableTabs, TabItem } from "@/components/Common/ScrollableTabs";
import { useState } from "react";
import { BlinkoStore } from "@/store/blinkoStore";
import { PluginSetting } from "@/components/BlinkoSettings/PluginSetting";

type SettingItem = {
  key: string;
  title: string;
  icon: string;
  component: JSX.Element;
  requireAdmin: boolean;
  keywords?: string[];
}

const Page = observer(() => {
  const user = RootStore.Get(UserStore)
  const blinkoStore = RootStore.Get(BlinkoStore)
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string>("all")

  const allSettings: SettingItem[] = [
    {
      key: "all",
      title: t('all'),
      icon: "tabler:settings",
      component: <></>,
      requireAdmin: false,
      keywords: ['all', 'settings', '全部', '设置']
    },
    {
      key: "basic",
      title: t('basic-information'),
      icon: "tabler:tool",
      component: <BasicSetting />,
      requireAdmin: false,
      keywords: ['basic', 'information', '基本信息', '基础设置']
    },
    {
      key: "prefer",
      title: t('preference'),
      icon: "tabler:settings-2",
      component: <PerferSetting />,
      requireAdmin: false,
      keywords: ['preference', 'theme', 'language', '偏好设置', '主题', '语言']
    },
    {
      key: "user",
      title: t('user-list'),
      icon: "tabler:users",
      component: <UserSetting />,
      requireAdmin: true,
      keywords: ['user', 'users', '用户', '用户列表']
    },
    {
      key: "ai",
      title: 'AI',
      icon: "mingcute:ai-line",
      component: <AiSetting />,
      requireAdmin: true,
      keywords: ['ai', 'artificial intelligence', '人工智能']
    },
    {
      key: "task",
      title: t('schedule-task'),
      icon: "tabler:list-check",
      component: <TaskSetting />,
      requireAdmin: true,
      keywords: ['task', 'schedule', '任务', '定时任务']
    },
    {
      key: "storage",
      title: t('storage'),
      icon: "tabler:database",
      component: <StorageSetting />,
      requireAdmin: true,
      keywords: ['storage', 'database', '存储', '数据库']
    },
    {
      key: "music",
      title: t('music-settings'),
      icon: "tabler:music",
      component: <MusicSetting />,
      requireAdmin: true,
      keywords: ['music', '音乐设置']
    },
    {
      key: "import",
      title: t('import'),
      icon: "tabler:file-import",
      component: <ImportSetting />,
      requireAdmin: true,
      keywords: ['import', 'data', '导入', '数据导入']
    },
    {
      key: "sso",
      title: t('sso-settings'),
      icon: "tabler:key",
      component: <SSOSetting />,
      requireAdmin: true,
      keywords: ['sso', 'single sign on', '单点登录']
    },
    {
      key: "export",
      title: t('export'),
      icon: "tabler:file-export",
      component: <ExportSetting />,
      requireAdmin: false,
      keywords: ['export', 'data', '导出', '数据导出']
    },
    {
      key: "plugin",
      title: t('plugin-settings'),
      icon: "mingcute:plugin-line",
      component: <PluginSetting />,
      requireAdmin: true,
      keywords: ['plugin', 'plugins', '插件', '插件设置']
    },
    {
      key: "about",
      title: t('about'),
      icon: "tabler:info-circle",
      component: <AboutSetting />,
      requireAdmin: false,
      keywords: ['about', 'information', '关于', '信息']
    }
  ]

  const getVisibleSettings = () => {
    let settings = allSettings.filter(setting => !setting.requireAdmin || user.isSuperAdmin)
    
    if (blinkoStore.searchText) {
      const lowerSearchText = blinkoStore.searchText.toLowerCase()
      settings = settings.filter(setting => 
        setting.title.toLowerCase().includes(lowerSearchText) ||
        setting.keywords?.some(keyword => 
          keyword.toLowerCase().includes(lowerSearchText)
        )
      )
    }
    
    return settings
  }

  const getCurrentComponent = () => {
    if (selected === "all") {
      return getVisibleSettings()
        .filter(setting => setting.key !== "all")
        .map(setting => (
          <div key={setting.key}>{setting.component}</div>
        ))
    }
    const setting = allSettings.find(s => s.key === selected)
    return setting ? <div key={setting.key}>{setting.component}</div> : null
  }

  const tabItems: TabItem[] = getVisibleSettings().map(setting => ({
    key: setting.key,
    title: setting.title,
    icon: setting.icon
  }))

  return <div className="h-full flex flex-col">
    <div className="sticky top-0 z-10 w-full">
      <div className="md:max-w-[980px] md:-translate-x-[3px] mx-3 md:mx-auto backdrop-blur-md bg-background rounded-2xl">
        <ScrollableTabs
          items={tabItems}
          selectedKey={selected}
          onSelectionChange={setSelected}
          color="primary"
        />
      </div>
    </div>
    <ScrollArea onBottom={() => { }} className="flex-1">
      <div className="max-w-[1024px] mx-auto flex flex-col gap-6 px-4 md:px-6 py-4">
        {getCurrentComponent()}
      </div>
    </ScrollArea>
  </div>
});

export default Page