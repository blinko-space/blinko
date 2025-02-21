import axios from "axios"
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { getGlobalConfig } from "../config"
import { prisma } from "@/server/prisma";
import { Feed } from "feed";
import { User } from "@/server/context";
import { NextApiRequest } from "next";
import { NextRequest } from "next/server";
import { encode, getToken as getNextAuthToken } from 'next-auth/jwt';

export const SendWebhook = async (data: any, webhookType: string, ctx: { id: string }) => {
  try {
    //@ts-ignore
    const globalConfig = await getGlobalConfig({ ctx })
    if (globalConfig.webhookEndpoint) {
      await axios.post(globalConfig.webhookEndpoint, { data, webhookType, activityType: `blinko.note.${webhookType}` })
    }
  } catch (error) {
    console.log('request webhook error:', error)
  }
}

export function generateTOTP(): string {
  return authenticator.generateSecret();
}

export function generateTOTPQRCode(username: string, secret: string): string {
  return authenticator.keyuri(username, 'Blinko', secret);
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (err) {
    return false;
  }
}


export async function generateFeed(userId: number, origin: string, rows: number = 20) {
  const notes = await prisma.notes.findMany({
    where: {
      accountId: userId,
      isShare: true,
      sharePassword: "",
      OR: [
        {
          shareExpiryDate: {
            gt: new Date()
          }
        },
        {
          shareExpiryDate: null
        }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: rows,
    select: {
      content: true,
      updatedAt: true,
      shareEncryptedUrl: true,
      tags: {
        include: { tag: true }
      },
      account: {
        select: {
          name: true
        }
      },
    }
  });

  const feed = new Feed({
    title: "Blinko Public Notes",
    description: "Latest public notes",
    id: origin,
    link: origin,
    copyright: "All rights reserved",
    updated: new Date(),
    image: `${origin}/logo-dark.png`,
    feedLinks: {
      atom: `${origin}/api/rss/${userId}/atom`,
      rss: `${origin}/api/rss/${userId}/rss`
    },
  });

  notes.forEach(note => {
    const title = note.content.split('\n')[0] || 'Untitled';
    feed.addItem({
      title,
      link: `${origin}/share/${note.shareEncryptedUrl}`,
      description: note.content.substring(0, 200) + '...',
      date: note.updatedAt,
      author: [{
        name: note.account!.name
      }],
      category: note.tags.map(i => {
        return {
          name: i.tag.name
        }
      })
    });
  });

  return feed;
}

let isLoading = false

export const getNextAuthSecret = async () => {
  const configKey = 'NEXTAUTH_SECRET';
  let secret = process.env.NEXTAUTH_SECRET;
  if (isLoading) {
    return secret!
  }
  if (!secret || secret === 'my_ultra_secure_nextauth_secret') {
    const savedSecret = await prisma.config.findFirst({
      where: { key: configKey }
    });
    if (savedSecret) {
      // @ts-ignore
      secret = savedSecret.config.value as string;
    } else {
      const newSecret = crypto.randomBytes(32).toString('base64');
      await prisma.config.create({
        data: {
          key: configKey,
          config: { value: newSecret }
        }
      });
      secret = newSecret;
    }
  }
  isLoading = false
  return secret;
}

export const getToken = async (req: NextApiRequest | NextRequest) => {
  const secret = await getNextAuthSecret();
  return await getNextAuthToken({ req, secret }) as User;
}
