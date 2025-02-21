/**
 * This file contains the root router of your tRPC-backend
 */
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { router, t } from '../trpc';
import { aiRouter } from './ai';
import { attachmentsRouter } from './attachment';
import { noteRouter } from './note';
import { tagRouter } from './tag';
import { userRouter } from './user';
import { configRouter } from './config';
import { publicRouter } from './public';
import { taskRouter } from './task';
import { Context } from '../context';
import { analyticsRouter } from './analytics';
import { commentRouter } from './comment';
import { followsRouter } from './follows';
import { notificationRouter } from './notification';
import { pluginRouter } from './plugin';

export const appRouter = router({
  ai: aiRouter,
  notes: noteRouter,
  tags: tagRouter,
  users: userRouter,
  attachments: attachmentsRouter,
  config: configRouter,
  public: publicRouter,
  task: taskRouter,
  analytics: analyticsRouter,
  comments: commentRouter,
  follows: followsRouter,
  notifications: notificationRouter,
  plugin: pluginRouter
});

export const createCaller = t.createCallerFactory(appRouter);

//not recommend to use this
export const adminCaller = createCaller({ id: '1', name: 'admin', sub: '1', role: 'superadmin', exp: 0, iat: 0 });

export const userCaller = (ctx: Context) => {
  return createCaller(ctx);
};

export type AppRouter = typeof appRouter;
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
