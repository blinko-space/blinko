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
  token: string = '';
  role: string = '';

  wait() {
    return new Promise<UserStore>((res, rej) => {
      if (this.id && this.token) {
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
    return !!this.token;
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

  use() {
    const { data: session } = useSession();
    const { t, i18n } = useTranslation()
    const { setTheme } = useTheme()
    const router = useRouter()
    useEffect(() => {
      const userStore = RootStore.Get(UserStore);
      if (!userStore.isLogin && session) {
        console.log(session.user)
        //@ts-ignore
        userStore.ready({ ...session.user, token: session.token });
        userStore.userInfo.call(Number(this.id)).then(async () => {
          const config = userStore.blinko.config.value || await userStore.blinko.config.getOrCall();
          setTheme(config?.theme ?? 'light')
          document.documentElement.setAttribute('data-color-mode', config?.theme ?? 'light')
          RootStore.Get(BaseStore).changeLanugage(i18n, config?.language ?? 'en');
        });
      }
    }, [session]);

    useEffect(() => {
      eventBus.on('user:signout', () => {
        if (router.pathname == '/signup' || router.pathname == '/api-doc' || router.pathname.includes('/share')) {
          return
        }
        router.push('/signin')
      })
    }, []);
  }
}
