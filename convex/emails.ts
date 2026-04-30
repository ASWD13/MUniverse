import { Resend } from "resend";
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendAnnouncementNotifications = action({
  args: {
    announcementId: v.id("announcements"),
    title: v.string(),
    content: v.string(),
    targetRoles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set. Skipping email notifications.");
    }

    // 1. Get all users who should receive this
    const users = await ctx.runQuery(internal.emails.getRecipients, {
      targetRoles: args.targetRoles,
    });

    // 2. Create in-app notifications (via internal mutation)
    await ctx.runMutation(internal.emails.createInAppNotifications, {
      userIds: users.map((u) => u._id),
      announcementId: args.announcementId,
      content: `New announcement: ${args.title}`,
    });

    // 3. Send emails to users who have them enabled
    const emailRecipients = users.filter(
      (u) => u.email && u.preferences?.emailNotifications !== false
    );

    if (emailRecipients.length > 0 && apiKey) {
      const resend = new Resend(apiKey);
      try {
        await resend.emails.send({
          from: "MUniverse <onboarding@resend.dev>",
          to: emailRecipients.map((u) => u.email!),
          subject: `New Announcement: ${args.title}`,
          text: args.content,
        });
      } catch (error) {
        console.error("Failed to send emails:", error);
      }
    }
  },
});

export const getRecipients = internalQuery({
  args: { targetRoles: v.array(v.string()) },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) => args.targetRoles.includes(u.role));
  },
});

export const createInAppNotifications = internalMutation({
  args: {
    userIds: v.array(v.id("users")),
    announcementId: v.id("announcements"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    for (const userId of args.userIds) {
      await ctx.db.insert("notifications", {
        userId,
        type: "announcement",
        content: args.content,
        isRead: false,
        relatedId: args.announcementId,
      });
    }
  },
});
