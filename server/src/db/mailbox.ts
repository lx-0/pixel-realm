/**
 * Mailbox data access layer.
 *
 * Handles persistent mail (player-to-player and system) and notification
 * records (toast history) for each player.
 *
 * Mail expires after MAIL_EXPIRY_DAYS. Unclaimed attachments are returned
 * to sender via a new "return" system mail before the message is purged.
 */

import { eq, and, isNull, lt, desc } from "drizzle-orm";
import { getDb } from "./client";
import {
  mailMessages,
  playerNotifications,
  playerState,
  inventory,
  type MailMessage,
  type PlayerNotification,
} from "./schema";

export const MAIL_EXPIRY_DAYS = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MailDetail {
  id: string;
  senderId: string | null;
  senderName: string;
  subject: string;
  body: string;
  attachmentGold: number;
  attachmentItemId: string | null;
  attachmentQty: number;
  isRead: boolean;
  attachmentClaimed: boolean;
  sentAt: Date;
  expiresAt: Date;
}

export interface SendMailOptions {
  senderId: string | null; // null = system
  senderName: string;
  recipientId: string;
  subject: string;
  body: string;
  attachmentGold?: number;
  attachmentItemId?: string | null;
  attachmentQty?: number;
}

export interface SendMailResult {
  success: boolean;
  mailId?: string;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + MAIL_EXPIRY_DAYS);
  return d;
}

// ── Mail operations ───────────────────────────────────────────────────────────

/** Get a player's inbox (non-deleted, non-expired). */
export async function getMailbox(playerId: string): Promise<MailDetail[]> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select()
    .from(mailMessages)
    .where(
      and(
        eq(mailMessages.recipientId, playerId),
        isNull(mailMessages.deletedAt),
        // expiresAt > now handled in application (Drizzle gt needs column > value)
      ),
    )
    .orderBy(desc(mailMessages.sentAt))
    .limit(100);

  return rows
    .filter((r) => r.expiresAt > now)
    .map((r) => ({
      id: r.id,
      senderId: r.senderId,
      senderName: r.senderName,
      subject: r.subject,
      body: r.body,
      attachmentGold: r.attachmentGold,
      attachmentItemId: r.attachmentItemId ?? null,
      attachmentQty: r.attachmentQty,
      isRead: r.isRead,
      attachmentClaimed: r.attachmentClaimed,
      sentAt: r.sentAt,
      expiresAt: r.expiresAt,
    }));
}

/** Count unread mail for a player. */
export async function getUnreadMailCount(playerId: string): Promise<number> {
  const inbox = await getMailbox(playerId);
  return inbox.filter((m) => !m.isRead).length;
}

/** Send a mail message. Deducts gold from sender if attaching gold. */
export async function sendMail(opts: SendMailOptions): Promise<SendMailResult> {
  const db = getDb();
  const {
    senderId,
    senderName,
    recipientId,
    subject,
    body,
    attachmentGold = 0,
    attachmentItemId = null,
    attachmentQty = 0,
  } = opts;

  // Deduct gold from player sender if attaching gold
  if (senderId && attachmentGold > 0) {
    const [senderState] = await db
      .select({ gold: playerState.gold })
      .from(playerState)
      .where(eq(playerState.playerId, senderId));
    if (!senderState || senderState.gold < attachmentGold) {
      return { success: false, error: "Not enough gold to attach." };
    }
    await db
      .update(playerState)
      .set({ gold: senderState.gold - attachmentGold })
      .where(eq(playerState.playerId, senderId));
  }

  const [inserted] = await db
    .insert(mailMessages)
    .values({
      senderId: senderId ?? null,
      senderName,
      recipientId,
      subject: subject.slice(0, 120),
      body: body.slice(0, 4000),
      attachmentGold,
      attachmentItemId,
      attachmentQty,
      expiresAt: expiresAt(),
    })
    .returning({ id: mailMessages.id });

  // Create notification for recipient
  await createNotification({
    playerId: recipientId,
    kind: "mail",
    title: "New Mail",
    body: `From ${senderName}: ${subject.slice(0, 60)}`,
  });

  return { success: true, mailId: inserted.id };
}

/** Send system mail (no sender, no gold deduction). */
export async function sendSystemMail(
  recipientId: string,
  subject: string,
  body: string,
  attachmentGold = 0,
  attachmentItemId: string | null = null,
  attachmentQty = 0,
): Promise<void> {
  await sendMail({
    senderId: null,
    senderName: "System",
    recipientId,
    subject,
    body,
    attachmentGold,
    attachmentItemId,
    attachmentQty,
  });
}

/** Mark a mail message as read. */
export async function markMailRead(mailId: string, playerId: string): Promise<void> {
  const db = getDb();
  await db
    .update(mailMessages)
    .set({ isRead: true })
    .where(
      and(eq(mailMessages.id, mailId), eq(mailMessages.recipientId, playerId)),
    );
}

/** Claim the gold/item attachment from a mail. Delivers to recipient's inventory/wallet. */
export async function claimMailAttachment(
  mailId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const [mail] = await db
    .select()
    .from(mailMessages)
    .where(
      and(
        eq(mailMessages.id, mailId),
        eq(mailMessages.recipientId, playerId),
        isNull(mailMessages.deletedAt),
      ),
    );

  if (!mail) return { success: false, error: "Mail not found." };
  if (mail.attachmentClaimed) return { success: false, error: "Attachment already claimed." };
  if (mail.attachmentGold === 0 && !mail.attachmentItemId) {
    return { success: false, error: "No attachment on this mail." };
  }

  // Award gold
  if (mail.attachmentGold > 0) {
    const [state] = await db
      .select({ gold: playerState.gold })
      .from(playerState)
      .where(eq(playerState.playerId, playerId));
    if (state) {
      await db
        .update(playerState)
        .set({ gold: state.gold + mail.attachmentGold })
        .where(eq(playerState.playerId, playerId));
    }
  }

  // Award item
  if (mail.attachmentItemId && mail.attachmentQty > 0) {
    await db.insert(inventory).values({
      playerId,
      itemId: mail.attachmentItemId,
      quantity: mail.attachmentQty,
    });
  }

  await db
    .update(mailMessages)
    .set({ attachmentClaimed: true, isRead: true })
    .where(eq(mailMessages.id, mailId));

  return { success: true };
}

/** Soft-delete a mail (player's view). */
export async function deleteMail(mailId: string, playerId: string): Promise<void> {
  const db = getDb();
  await db
    .update(mailMessages)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(mailMessages.id, mailId), eq(mailMessages.recipientId, playerId)),
    );
}

/**
 * Expire old mail. For each expired message with unclaimed attachments,
 * attempt to return gold to the original sender before deleting.
 * Call this from a periodic job.
 */
export async function expireOldMail(): Promise<number> {
  const db = getDb();
  const now = new Date();

  const expired = await db
    .select()
    .from(mailMessages)
    .where(and(lt(mailMessages.expiresAt, now), isNull(mailMessages.deletedAt)));

  let count = 0;
  for (const mail of expired) {
    // Return unclaimed gold to sender
    if (!mail.attachmentClaimed && mail.attachmentGold > 0 && mail.senderId) {
      const [senderState] = await db
        .select({ gold: playerState.gold })
        .from(playerState)
        .where(eq(playerState.playerId, mail.senderId));
      if (senderState) {
        await db
          .update(playerState)
          .set({ gold: senderState.gold + mail.attachmentGold })
          .where(eq(playerState.playerId, mail.senderId));
        // Notify sender
        await createNotification({
          playerId: mail.senderId,
          kind: "mail",
          title: "Mail Returned",
          body: `Unclaimed gold (${mail.attachmentGold}g) from "${mail.subject}" was returned.`,
        });
      }
    }
    await db
      .update(mailMessages)
      .set({ deletedAt: now })
      .where(eq(mailMessages.id, mail.id));
    count++;
  }
  return count;
}

// ── Notification operations ───────────────────────────────────────────────────

export interface NotificationInput {
  playerId: string;
  kind: string;
  title: string;
  body: string;
}

/** Create a persistent notification record for a player. */
export async function createNotification(input: NotificationInput): Promise<void> {
  const db = getDb();
  await db.insert(playerNotifications).values({
    playerId: input.playerId,
    kind: input.kind,
    title: input.title.slice(0, 100),
    body: input.body.slice(0, 255),
  });
}

/** Get the 50 most recent notifications for a player. */
export async function getNotifications(playerId: string): Promise<PlayerNotification[]> {
  const db = getDb();
  return db
    .select()
    .from(playerNotifications)
    .where(eq(playerNotifications.playerId, playerId))
    .orderBy(desc(playerNotifications.createdAt))
    .limit(50);
}

/** Count unread notifications. */
export async function getUnreadNotificationCount(playerId: string): Promise<number> {
  const notes = await getNotifications(playerId);
  return notes.filter((n) => !n.isRead).length;
}

/** Mark all notifications as read. */
export async function markAllNotificationsRead(playerId: string): Promise<void> {
  const db = getDb();
  await db
    .update(playerNotifications)
    .set({ isRead: true })
    .where(eq(playerNotifications.playerId, playerId));
}
