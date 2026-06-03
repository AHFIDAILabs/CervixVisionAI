// services/notificationService.js
const Notification = require("../Models/notification");

async function createNotification({ type, recipient, sender, message, title, referenceModel, referenceId, io }) {
  const notification = await Notification.create({
    type,
    recipient,
    sender,
    message,
    title,
    referenceModel,
    referenceId,
  });

  // If socket.io instance is provided, emit real-time event
  if (io) {
    io.to(recipient.toString()).emit("newNotification", notification);
  }

  return notification;
}

module.exports = { createNotification };
