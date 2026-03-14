const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("Client connecté:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client déconnecté:", socket.id);
  });
});

app.set("io", io);

const port = process.env.PORT || 3002;
server.listen(port, "0.0.0.0", () => {
  console.log("Serveur OnCartonne démarré sur le port", port);
});
