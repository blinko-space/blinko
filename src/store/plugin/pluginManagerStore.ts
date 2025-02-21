/// <reference types="systemjs" />
import { api } from "@/lib/trpc";
import { BasePlugin } from ".";
import { Store } from "../standard/base";
import { eventBus } from "@/lib/event";
import System from 'systemjs/dist/system.js';
import i18n from "@/lib/i18n";
import { PluginApiStore } from './pluginApiStore';
import { RootStore } from "../root";
import { ToastPlugin } from "../module/Toast/Toast";
import { makeAutoObservable } from "mobx";
import { PromisePageState, PromiseState } from "../standard/PromiseState";
import { type PluginInfo, type InstallPluginInput, InstalledPluginInfo } from "@/server/types";
import { StorageState } from "../standard/StorageState";
import { BlinkoStore } from "../blinkoStore";
import { BaseStore } from "../baseStore";
import { ResourceStore } from "../resourceStore";
import { HubStore } from "../hubStore";
import copy from "copy-to-clipboard"

export class PluginManagerStore implements Store {
  sid = 'pluginManagerStore';
  private plugins: Map<string, BasePlugin> = new Map();
  ws: WebSocket | null = null;
  devPluginMetadata: PluginInfo & { withSettingPanel?: boolean };
  latestDevFileName: string = '';
  public isLoading: boolean = false;
  public wsConnectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  devWebscoketUrl = new StorageState<string>({
    key: 'blinko_dev_plugin_ws_url',
    value: ''
  });

  constructor() {
    makeAutoObservable(this);
    this.initBlinkoContext();
    this.autoConnectDevPlugin();
  }

  private autoConnectDevPlugin() {
    const savedUrl = this.devWebscoketUrl.value;
    if (savedUrl) {
      this.connectDevPlugin(savedUrl).catch(() => {
      });
    }
  }

  marketplacePlugins = new PromiseState({
    function: async () => {
      const installedPlugins = await this.installedPlugins.getOrCall();
      const plugins = await api.plugin.getAllPlugins.query();
      return plugins.filter(plugin => !installedPlugins?.some(installedPlugin => installedPlugin.metadata.name === plugin.name));
    }
  })

  installedPlugins = new PromiseState({
    function: async () => {
      const plugins = await api.plugin.getInstalledPlugins.query();
      return plugins;
    }
  })

  isIntalledPluginWithSettingPanel(pluginName: string) {
    return this.plugins.get(pluginName)?.withSettingPanel;
  }

  loadAllPlugins() {
    this.marketplacePlugins.call();
    this.installedPlugins.call();
  }

  async initInstalledPlugins() {
    const plugins = await this.installedPlugins.getOrCall();
    if (plugins) {
      plugins.forEach(plugin => {
        this.loadPlugin(plugin.path);
      });
    }
  }

  async connectDevPlugin(url: string) {
    try {
      if (this.ws) {
        this.ws.close();
      }

      this.devWebscoketUrl.save(url);
      this.wsConnectionStatus = 'disconnected';

      this.ws = new WebSocket(url.replace('http', 'ws'));

      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        try {
          if (this.latestDevFileName) {
            await this.destroyPlugin(this.latestDevFileName);
          }
          this.latestDevFileName = data.fileName;
          this.devPluginMetadata = data.metadata;
          this.wsConnectionStatus = 'connected';
          await this.saveDevPlugin(data.code, data.fileName, data.metadata);
          await this.loadDevPlugin(data.fileName);
          RootStore.Get(ToastPlugin).success(i18n.t('plugin-updated'));
        } catch (error) {
          console.error('Plugin update error:', error);
          this.wsConnectionStatus = 'error';
          RootStore.Get(ToastPlugin).error(i18n.t('plugin-update-failed'));
        }
      };

      this.ws.onopen = () => {
        this.wsConnectionStatus = 'connected';
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.wsConnectionStatus = 'error';
        RootStore.Get(ToastPlugin).error(i18n.t('plugin-connection-failed'));
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.wsConnectionStatus = 'disconnected';
      };

    } catch (error) {
      console.error('Connect dev plugin error:', error);
      this.wsConnectionStatus = 'error';
      throw error;
    }
  }

  initBlinkoContext() {
    if (typeof window !== 'undefined') {
      const pluginApi = RootStore.Get(PluginApiStore);
      const toast = RootStore.Get(ToastPlugin);
      const blinkoStore = RootStore.Get(BlinkoStore);
      const baseStore = RootStore.Get(BaseStore);
      const hubStore = RootStore.Get(HubStore);
      const resourceStore = RootStore.Get(ResourceStore);
      //@ts-ignore
      window.Blinko = {
        api,
        copyToClipboard: copy,
        eventBus,
        i18n,
        //@ts-ignore
        toast,
        version: '1.0.0',
        store: {
          StorageState,
          PromiseState,
          PromisePageState,
          blinkoStore,
          baseStore,
          hubStore,
          resourceStore,
        },
        globalRefresh: () => {
          blinkoStore.updateTicker++;
        },
        addToolBarIcon: pluginApi.addToolBarIcon.bind(pluginApi),
        addRightClickMenu: pluginApi.addRightClickMenu.bind(pluginApi),
        addAiWritePrompt: pluginApi.addAiWritePrompt.bind(pluginApi),
        showDialog: pluginApi.showDialog.bind(pluginApi),
        closeDialog: pluginApi.closeDialog.bind(pluginApi),
      };
    }

    if (typeof window !== 'undefined' && !window.System) {
      window.System = System;
    }
  }

  private async saveDevPlugin(code: string, fileName: string, metadata: any) {
    try {
      await api.plugin.saveDevPlugin.mutate({ code, fileName, metadata });
    } catch (error) {
      console.error('Save dev plugin error:', error);
      throw error;
    }
  }

  private async loadDevPlugin(fileName: string) {
    console.log('loadDevPlugin');
    try {
      const module = await window.System.import(`/plugins/dev/${fileName}`);
      const PluginClass = module.default;
      const plugin = new PluginClass();
      plugin.init();
      if (plugin.withSettingPanel) {
        this.devPluginMetadata.withSettingPanel = true;
      }
      this.plugins.set("dev", plugin);
      return plugin;
    } catch (error) {
      console.error('Load dev plugin error:', error);
    }
  }

  disconnectDevPlugin() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnectionStatus = 'disconnected';
    }
    this.wsConnectionStatus = 'disconnected';
    this.devWebscoketUrl.save('');
  }

  async loadPlugin(pluginPath: string) {
    try {
      const module = await window.System.import(pluginPath);
      const PluginClass = module.default;
      const plugin = new PluginClass();
      plugin.init();
      this.plugins.set(plugin.name, plugin);
      if (plugin.withSettingPanel) {
        this.plugins[plugin.name].withSettingPanel = true;
      }
      return plugin;
    } catch (error) {
      console.error(`load plugin error: ${pluginPath}`, error);
    }
  }

  getPluginInstanceByName(pluginName: string) {
    return this.plugins.get(pluginName);
  }

  async destroyPlugin(pluginName: string) {
    console.log('destroyPlugin', pluginName);
    try {
      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        plugin.destroy();
        this.plugins.delete(pluginName);
      }
    } catch (error) {
      console.error(`destroy plugin error: ${pluginName}`, error);
    }
    try {

      await window.System.delete(`/plugins/dev/${pluginName}`);
    } catch (error) {
      console.error(`destroy plugin error: ${pluginName}`, error);
    }
  }

  async installPlugin(plugin: PluginInfo) {
    try {
      await api.plugin.installPlugin.mutate(plugin);
      await this.marketplacePlugins.call();
      await this.initInstalledPlugins();
    } catch (error) {
      console.error('Install plugin error:', error);
      throw error;
    }
  }

  async uninstallPlugin(id: number) {
    try {
      await api.plugin.uninstallPlugin.mutate({ id });
      await this.installedPlugins.call();
      window.location.reload();
    } catch (error) {
      console.error('Uninstall plugin error:', error);
      throw error;
    }
  }
}
