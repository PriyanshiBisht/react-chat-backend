const express = require('express');

const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
app.use(cors());
const bcrypt = require('bcrypt');
const jwt = require ('jsonwebtoken');
 const User = require('./User');
 const Message = require('./Message');
 app.use(express.json());
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "https://react-chat-ten-tau.vercel.app" }
});
let onlineUsers = {};
io.on('connection', (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("user_online", (username) => {
    onlineUsers[username] = socket.id;
  });

  socket.on("send_message", (data) => {
    const receiverSocketId = onlineUsers[data.receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", data);
    }
  });
});


server.listen(3001, () => {
  console.log("Server running on port 3001");
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));
 


app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if(user){
    return res.json({ message: "Username already exists" });
  }
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const user = new User({ username, password: hash });
      await user.save();
      const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);
      res.json({ message: "User registered successfully", token });
    });
  });
});
app.post('/messages', async (req, res) => {
  const { sender, receiver, text,timestamp } = req.body;
  const message = new Message({ sender, receiver, text,timestamp });
  await message.save();
  res.json({ message: "Message sent" });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  if (!user) {
    return res.json({ message: "Invalid credentials" });
  }
  
  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
       const token = jwt.sign({ username: user.username },process.env.JWT_SECRET);
      res.json({ message: "Login successful",token });
    } else {
      res.json({ message: "Invalid credentials" });
    }
  });
});
app.get('/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});
app.get('/messages/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  
  const messages = await Message.find({
    $or: [
      { sender: user1, receiver: user2 },
      { sender: user2, receiver: user1 }
    ]
  });
  
  res.json(messages);
});