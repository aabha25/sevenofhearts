import express from "express";
import http from "http";
import { Server } from "socket.io";
import { handleSocket } from "./socket/gameHandler.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  handleSocket(io, socket);
});

server.listen(5000, () =>
  console.log("Server running on 5000")
);