import '../styles/globals.css';
import '../styles/nprogress.css';
import '../styles/github-markdown.css';
import "swagger-ui-react/swagger-ui.css";
import 'react-photo-view/dist/react-photo-view.css';
import '@/lib/i18n'
import NProgress from 'nprogress';
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { NextUIProvider } from '@nextui-org/react';
import { Router } from 'next/router';
import { initStore } from '@/store/init';
import { Inspector, InspectParams } from 'react-dev-inspector';
import { CommonLayout } from '@/components/Layout';
import { AppProvider } from '@/store/module/AppProvider';
import { motion } from 'motion/react';
import { BlinkoMultiSelectPop } from '@/components/BlinkoMultiSelectPop';
import { BlinkoMusicPlayer } from '@/components/BlinkoMusicPlayer';
import { LoadingPage } from '@/components/Common/LoadingPage';
import { PluginManagerStore } from '@/store/plugin/pluginManagerStore';
import { RootStore } from '@/store';
import { api } from '@/lib/trpc';

const MyApp = ({ Component, pageProps }) => {
  const [isLoading, setIsLoading] = useState(true);
  initStore();
  useProgressBar();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    RootStore.Get(PluginManagerStore).initInstalledPlugins();
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <>
      <Inspector
        keys={['control', 'shift', 'c']}
        disableLaunchEditor={true}
        onClickElement={({ codeInfo }: InspectParams) => {
          if (!codeInfo?.absolutePath) return
          const { absolutePath, lineNumber, columnNumber } = codeInfo
          window.open(`vscode://file/${absolutePath}:${lineNumber}:${columnNumber}`)
        }}
      />
      <SessionProvider session={pageProps.session}>
        <NextUIProvider>
          <ThemeProvider attribute="class" enableSystem={false} >
            <AppProvider />
            <CommonLayout>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Component {...pageProps} />
                <BlinkoMultiSelectPop />
              </motion.div>
            </CommonLayout>
          </ThemeProvider>
        </NextUIProvider>
      </SessionProvider>
      <BlinkoMusicPlayer />
    </>
  );
};

export default MyApp;

const useProgressBar = () => {
  const routeChangeStart = (url: string, { shallow }) => {
    if (shallow) return;
    NProgress.start();
  };

  const routeChangeEnd = (url: string, { shallow }) => {
    if (shallow) return;
    NProgress.done(true);
  };

  useEffect(() => {
    Router.events.on('routeChangeStart', routeChangeStart);
    Router.events.on('routeChangeComplete', routeChangeEnd);
    Router.events.on('routeChangeError', routeChangeEnd);

    return () => {
      Router.events.off('routeChangeStart', routeChangeStart);
      Router.events.off('routeChangeComplete', routeChangeEnd);
      Router.events.off('routeChangeError', routeChangeEnd);
    };
  }, []);
};
