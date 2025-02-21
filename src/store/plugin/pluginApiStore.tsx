import { RootStore } from "../root";
import { DialogStandaloneStore } from "../module/DialogStandalone";
import { Store } from "../standard/base";
import { PluginRender } from "./pluginRender";
import { Note } from "@/server/types";
export type ToolbarIcon = {
  name: string;
  icon: string;
  tooltip: string;
  content: () => HTMLElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
}

export type RightClickMenu = {
  name: string;
  label: string;
  icon?: string;
  onClick: (note: Note) => void;
  disabled?: boolean;
}

export type DialogOptions = {
  title: string;
  content: () => HTMLElement;
}

export class PluginApiStore implements Store {
  sid = 'pluginApiStore';
  autoObservable = true

  customToolbarIcons: ToolbarIcon[] = [];
  customRightClickMenus: RightClickMenu[] = [];
  customAiPrompts: { name: string; prompt: string; icon?: string }[] = [];

  addToolBarIcon(options: ToolbarIcon) {
    const sameNameIndex = this.customToolbarIcons.findIndex(item => item.name === options.name);
    if (sameNameIndex !== -1) {
      this.customToolbarIcons[sameNameIndex] = {
        ...options,
        placement: options.placement || 'top',
        maxWidth: options.maxWidth || 300,
      };
      return;
    }
    this.customToolbarIcons.push({
      name: options.name,
      icon: options.icon,
      content: options.content,
      placement: options.placement || 'top',
      maxWidth: options.maxWidth || 300,
      tooltip: options.tooltip,
    });
  }

  addRightClickMenu(options: RightClickMenu) {
    const sameNameIndex = this.customRightClickMenus.findIndex(item => item.name === options.name);
    if (sameNameIndex !== -1) {
      this.customRightClickMenus[sameNameIndex] = options;
      console.log('this.customRightClickMenus', this.customRightClickMenus);
      return;
    }
    this.customRightClickMenus.push(options);
    console.log('this.customRightClickMenus', this.customRightClickMenus);
  }

  showDialog(options: DialogOptions) {
    RootStore.Get(DialogStandaloneStore).setData({
      isOpen: true,
      title: options.title,
      content:<PluginRender content={options.content} />,
    });
  }

  closeDialog() {
    RootStore.Get(DialogStandaloneStore).setData({
      isOpen: false,
    });
  }

  addAiWritePrompt(name: string, prompt: string, icon?: string) {
    const existingIndex = this.customAiPrompts.findIndex(p => p.name === name);
    if (existingIndex !== -1) {
      this.customAiPrompts[existingIndex] = { name, prompt, icon };
    } else {
      this.customAiPrompts.push({ name, prompt, icon });
    }
  }
}