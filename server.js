const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Stocker les connexions : userId -> socketId
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("Client connecté:", socket.id);

  // Enregistrement de l'utilisateur (mobile ou admin)
  socket.on("register", ({ userId, role }) => {
    connectedUsers.set(userId, { socketId: socket.id, role });
    console.log(`Utilisateur enregistré: ${userId} (${role})`);

    // Les admins rejoignent la room "admin"
    if (role === "admin" || role === "staff") {
      socket.join("admin");
    }
  });

  // Rejoindre la room d'une commande (pour le chat)
  socket.on("joinOrder", ({ orderId }) => {
    socket.join(`order_${orderId}`);
    console.log(`${socket.id} a rejoint order_${orderId}`);
  });

  // Quitter la room d'une commande
  socket.on("leaveOrder", ({ orderId }) => {
    socket.leave(`order_${orderId}`);
  });

  // Message de chat
  socket.on("sendMessage", ({ orderId, senderId, senderName, senderRole, text }) => {
    io.to(`order_${orderId}`).emit("newMessage", {
      orderId,
      senderId,
      senderName,
      senderRole,
      text,
      createdAt: new Date().toISOString(),
    });
  });

  // Admin tape en cours
  socket.on("typing", ({ orderId, userName }) => {
    socket.to(`order_${orderId}`).emit("userTyping", { orderId, userName });
  });

  socket.on("stopTyping", ({ orderId }) => {
    socket.to(`order_${orderId}`).emit("userStopTyping", { orderId });
  });

  socket.on("disconnect", () => {
    // Retirer l'utilisateur des connexions
    for (const [userId, data] of connectedUsers.entries()) {
      if (data.socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log("Client déconnecté:", socket.id);
  });
});

app.set("io", io);
app.set("connectedUsers", connectedUsers);

const port = process.env.PORT || 3002;
server.listen(port, "0.0.0.0", () => {
  console.log("Serveur OnCartonne démarré sur le port", port);
});
