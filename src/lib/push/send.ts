import webpush from "web-push";

import { prisma } from "@/lib/prisma";
import { getVapidConfig } from "@/lib/push/vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function configureWebPush() {
  const vapid = getVapidConfig();
  if (!vapid) {
    throw new Error("vapid_not_configured");
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
}

export async function sendPushToSubscriptions(
  subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>,
  payload: PushPayload,
) {
  configureWebPush();

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  return { sent, failed, removed: staleIds.length };
}

export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany();
  return sendPushToSubscriptions(subscriptions, payload);
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  return sendPushToSubscriptions(subscriptions, payload);
}

export async function sendPushToUserIds(userIds: string[], payload: PushPayload) {
  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { sent: 0, failed: 0, removed: 0, subscriptions: 0, users: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: uniqueIds } },
  });
  const result = await sendPushToSubscriptions(subscriptions, payload);
  return { ...result, subscriptions: subscriptions.length, users: uniqueIds.length };
}

export async function sendPushToEmails(emails: string[], payload: PushPayload) {
  const normalized = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (normalized.length === 0) {
    return { sent: 0, failed: 0, removed: 0, subscriptions: 0, users: 0, matchedUsers: 0 };
  }

  const users = await prisma.user.findMany({
    where: { email: { in: normalized } },
    select: { id: true },
  });
  const result = await sendPushToUserIds(
    users.map((user) => user.id),
    payload,
  );
  return { ...result, matchedUsers: users.length };
}
