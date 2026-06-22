import { getDatabase } from "@/lib/mongo-db";
import { ObjectId } from "mongodb";

export interface Notification {
  _id?: string | ObjectId;
  userId: string | null; // null represents a global announcement/system-wide alert
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "security";
  isRead: boolean;
  createdAt: Date;
}

export const notificationService = {
  /**
   * Create a notification for a specific user
   */
  async createNotification(
    userId: string | null,
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "security" = "info"
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.collection("notifications").insertOne({
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date(),
      });
      return true;
    } catch (err) {
      console.error("[notification-service] createNotification failed:", err);
      return false;
    }
  },

  /**
   * Broadcast an announcement to all registered users by inserting
   * a notification record for each user. Also inserts one with userId: null.
   */
  async sendAnnouncement(
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "security" = "info"
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      const users = await db.collection("users").find({}, { projection: { id: 1 } }).toArray();
      
      const now = new Date();
      const notifications = users
        .filter((u) => u.id)
        .map((u) => ({
          userId: u.id,
          title,
          message,
          type,
          isRead: false,
          createdAt: now,
        }));

      // Add a global record (userId: null)
      notifications.push({
        userId: null,
        title,
        message,
        type,
        isRead: false,
        createdAt: now,
      });

      if (notifications.length > 0) {
        await db.collection("notifications").insertMany(notifications);
      }
      return true;
    } catch (err) {
      console.error("[notification-service] sendAnnouncement failed:", err);
      return false;
    }
  },

  /**
   * Retrieve notifications for a user, including global ones (userId: null)
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const db = await getDatabase();
      // Fetch both user-specific and global notifications
      const list = await db
        .collection("notifications")
        .find({
          $or: [{ userId }, { userId: null }],
        })
        .sort({ createdAt: -1 })
        .toArray();

      return list as unknown as Notification[];
    } catch (err) {
      console.error("[notification-service] getNotifications failed:", err);
      return [];
    }
  },

  /**
   * Mark all user's notifications as read
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.collection("notifications").updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
      );
      return true;
    } catch (err) {
      console.error("[notification-service] markAllAsRead failed:", err);
      return false;
    }
  },

  /**
   * Mark a specific notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const query = {
        _id: new ObjectId(notificationId),
        $or: [{ userId }, { userId: null }],
      };
      await db.collection("notifications").updateOne(query, {
        $set: { isRead: true },
      });
      return true;
    } catch (err) {
      console.error("[notification-service] markAsRead failed:", err);
      return false;
    }
  },

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const db = await getDatabase();
      return await db.collection("notifications").countDocuments({
        userId,
        isRead: false,
      });
    } catch (err) {
      console.error("[notification-service] getUnreadCount failed:", err);
      return 0;
    }
  },
};
