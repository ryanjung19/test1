import "server-only";
import webpush from "web-push";
import { parseSubscription, type BrowserSubscription } from "./validation";

export interface PushSender {
  send(subscription: BrowserSubscription, payload: { title: string; body: string; url: string; eventId: string }): Promise<{ statusCode: number }>;
}
export class WebPushSender implements PushSender {
  async send(subscription: BrowserSubscription, payload: { title: string; body: string; url: string; eventId: string }) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) throw new Error("VAPID unavailable");
    const response = await webpush.sendNotification(parseSubscription(subscription), JSON.stringify(payload), {
      vapidDetails: { subject, publicKey, privateKey }, TTL: 300, timeout: 10000,
    });
    return { statusCode: response.statusCode };
  }
}
