const { GoogleAuth } = require("google-auth-library");
const axios = require("axios");
const DeviceToken = require("../models/DeviceToken");
const Notification = require("../models/Notification");

const MY_PROJECT_ID = process.env.FIREBASEPROJECTID;
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${MY_PROJECT_ID}/messages:send`;
const SERVICE_ACCOUNT_KEY_FILE = "./my-service-account.json";

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  return await auth.getAccessToken();
}

async function sendPushNotification(token, title, body, badge, data = {}) {
  const accessToken = await getAccessToken();

  const messagePayload = {
    validate_only: false,
    message: {
      token,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          channel_id: "default",
          sound: "default",
          notification_priority: "PRIORITY_HIGH",
          default_vibrate_timings: true,
          default_sound: true,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: { title, body },
            badge,
            sound: "default",
          },
        },
      },
      data,
    },
  };

  try {
    const response = await axios.post(FCM_ENDPOINT, messagePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log("Notification envoyee :", response.data);
    return { success: true };
  } catch (error) {
    const errorCode =
      error.response?.data?.error?.details?.[0]?.errorCode ||
      error.response?.data?.error?.status;
    console.error("Erreur notification :", error.response?.data || error.message);
    return { success: false, errorCode };
  }
}

/**
 * Envoie une notification push a tous les tokens FCM d'un utilisateur.
 * Nettoie automatiquement les tokens invalides.
 */
async function sendNotificationToUser(userId, title, body, badge, data = {}) {
  // Sauvegarder la notification en base
  try {
    await Notification.create({
      userId,
      title,
      body,
      type: data.type || "general",
      data,
    });
  } catch (saveErr) {
    console.log("Erreur sauvegarde notification:", saveErr.message);
  }

  // Calculer le vrai badge (nombre de notifications non lues)
  const unreadCount = await Notification.countDocuments({ userId, read: false });

  const tokens = await DeviceToken.find({ userId });
  if (tokens.length === 0) return;

  const invalidTokenIds = [];

  for (const entry of tokens) {
    const result = await sendPushNotification(entry.token, title, body, unreadCount, data);

    if (!result.success && ["UNREGISTERED", "NOT_FOUND"].includes(result.errorCode)) {
      console.log(`Token invalide pour user ${userId}, suppression...`);
      invalidTokenIds.push(entry._id);
    }
  }

  if (invalidTokenIds.length > 0) {
    await DeviceToken.deleteMany({ _id: { $in: invalidTokenIds } });
    console.log(`${invalidTokenIds.length} token(s) invalide(s) supprime(s)`);
  }
}

module.exports = { sendPushNotification, sendNotificationToUser };
