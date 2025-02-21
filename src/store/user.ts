import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { RootStore } from './root';
import { Store } from './standard/base';
import { eventBus } from '@/lib/event';
import { makeAutoObservable } from 'mobx';
import { PromiseState } from './standard/PromiseState';
import { api } from '@/lib/trpc';
import { BlinkoStore } from './blinkoStore';
import { BaseStore } from './baseStore';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';

export class UserStore implements User, Store {
  sid = 'user';
  constructor() {
    makeAutoObservable(this)
  }
  id: string = '';
  name?: string = '';
  nickname?: string = '';
  image?: string = '';
  role: string = '';
  theme: any = 'light';
  isSetup: boolean = false;
  languageInitialized: boolean = false;
  themeInitialized: boolean = false;
  isHubInitialized: boolean = false;

  wait() {
    return new Promise<UserStore>((res, rej) => {
      if (this.id) {
        res(this);
      }

      //@ts-ignore
      this.event.once('user:ready', (user) => {
        res(this);
      });
    });
  }

  get isSuperAdmin() {
    return this.role === 'superadmin'
  }

  static wait() {
    return RootStore.Get(UserStore).wait();
  }

  get isLogin() {
    return !!this.name;
  }

  get blinko() {
    return RootStore.Get(BlinkoStore)
  }

  userInfo = new PromiseState({
    function: async (id: number) => {
      return await api.users.detail.query({ id })
    }
  })

  canRegister = new PromiseState({
    function: async () => {
      return await api.users.canRegister.mutate()
    }
  })

  setData(args: Partial<UserStore>) {
    Object.assign(this, args);
  }

  ready(args: Partial<UserStore>) {
    this.setData(args);
  }

  clear() {
    this.id = ''
    this.name = ''
    this.nickname = ''
    this.image = ''
    this.role = ''
    this.isSetup = false
  }

  updatePWAColor(theme: string) {
    const themeColor = theme === 'dark' ? '#1C1C1E' : '#F8F8F8';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', themeColor);
  }

  async initializeSettings(setTheme: (theme: string) => void, i18n: any) {
    const savedLanguage = localStorage.getItem('userLanguage');
    const savedTheme = localStorage.getItem('userTheme');
    const savedHubEnabled = localStorage.getItem('hubEnabled');

    if (savedHubEnabled === 'true' && !this.isHubInitialized) {
      const base = RootStore.Get(BaseStore);
      base.routerList.splice(2, 0, {
        title: "hub",
        href: '/hub',
        icon: 'fluent:people-community-16-regular'
      });
      this.isHubInitialized = true;
    }

    if (savedLanguage && !this.languageInitialized) {
      RootStore.Get(BaseStore).changeLanugage(i18n, savedLanguage);
      this.languageInitialized = true;
    }

    if (savedTheme && !this.themeInitialized) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const themeToSet = savedTheme === 'system' ? systemTheme : savedTheme;
      setTheme(themeToSet);
      this.updatePWAColor(themeToSet);
      this.themeInitialized = true;
    }

    const darkElement = document.querySelector('.dark')
    const lightElement = document.querySelector('.light')
    const config = await this.blinko.config.call();

    if (config?.themeColor && config?.themeForegroundColor) {
      if (darkElement) {
        //@ts-ignore
        darkElement.style.setProperty('--primary', config.themeColor)
        //@ts-ignore
        darkElement.style.setProperty('--primary-foreground', config.themeForegroundColor)
      }
      if (lightElement) {
        //@ts-ignore
        lightElement.style.setProperty('--primary', config.themeColor)
        //@ts-ignore
        lightElement.style.setProperty('--primary-foreground', config.themeForegroundColor)
      }
    }

    if (config?.isUseBlinkoHub !== (savedHubEnabled === 'true')) {
      localStorage.setItem('hubEnabled', String(config?.isUseBlinkoHub));
      const base = RootStore.Get(BaseStore);
      
      if (config?.isUseBlinkoHub && !this.isHubInitialized) {
        base.routerList.splice(2, 0, {
          title: "hub",
          href: '/hub',
          icon: 'fluent:people-community-16-regular'
        });
        this.isHubInitialized = true;
      } else if (!config?.isUseBlinkoHub && this.isHubInitialized) {
        const hubIndex = base.routerList.findIndex(route => route.href === '/hub');
        if (hubIndex !== -1) {
          base.routerList.splice(hubIndex, 1);
        }
        this.isHubInitialized = false;
      }
    }

    if (this.isLogin) {
      try {

        if (config) {
          if (config.language && config.language !== savedLanguage) {
            localStorage.setItem('userLanguage', config.language);
            RootStore.Get(BaseStore).changeLanugage(i18n, config.language);
          }

          if (config.theme && config.theme !== savedTheme) {
            localStorage.setItem('userTheme', config.theme);
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            const newTheme = config.theme === 'system' ? systemTheme : config.theme;
            setTheme(newTheme);
            this.updatePWAColor(newTheme);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user config:', error);
      }
    }
  }

  use() {
    const { data: session } = useSession();
    const { t, i18n } = useTranslation()
    const { setTheme, theme } = useTheme()
    const router = useRouter()

    useEffect(() => {
      this.initializeSettings(setTheme, i18n);
    }, []);

    useEffect(() => {
      const userStore = RootStore.Get(UserStore);
      if (!userStore.isLogin && session && session.user) {
        //@ts-ignore
        userStore.ready({ ...session.user });
        this.initializeSettings(setTheme, i18n);
        userStore.userInfo.call(Number(this.id))
        userStore.canRegister.call()
      }
    }, [session]);

    useEffect(() => {
      eventBus.on('user:signout', () => {
        if (router.pathname == '/signup' || router.pathname == '/api-doc' || router.pathname.includes('/share')) {
          return
        }
        localStorage.removeItem('username')
        localStorage.removeItem('password')
        RootStore.Get(UserStore).clear()
        router.push('/signin')
      })
    }, []);
  }
}
