const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// SET STATIC FOLDER
app.use(express.static(path.join(__dirname, "public")))

// START SERVER
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

//--------- HANDLE A SOCKET CONNECTION REQUEST FROM WEB CLIENT-------

// This array has the connections that we are going to handle. Rest all connections are going to be ignored 
const connections = [null, null]
// The socket parameter here is the connecting socket or the socket of the player that has connected.
// socket connection with client
io.on('connection', socket => {
  // FIND AN AVAILABLE PLAYER NUMBER
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i
      break
    }
  }

  // TELL THE CONNECTING CLIENT WHAT PLAYER NUMBER THEY ARE
  socket.emit('player-number', playerIndex)

  console.log(`Player ${playerIndex} has connected`)

  // IGNORE PLAYER 3
  if (playerIndex === -1) return

  // Purpose of this line is to let other players know whether they are connected or not.
  // We are saying in this line that the user is not ready at the moment as the user will not be ready in the begining  
  connections[playerIndex] = false

  // TELL EVERYONE WHAT PLAYER NUMBER JUST CONNECTED
  // 'broadcast' sets a modifier for a subsequent event emission that the event data will only be broadcast to every sockets but the sender.
  // 'emit' tells communicates message to the connected socket and 'broadcast' tells message to every socket except the connected socket  
  socket.broadcast.emit('player-connection', playerIndex)

  // HANDLE DISCONNECT
  socket.on('disconnect', () => {
    console.log(`Player ${playerIndex} disconnected`)
    connections[playerIndex] = null
    // TELL EVERYONE WHAT PLAYER NUMBER JUST DISCONNECTED
    socket.broadcast.emit('player-connection', playerIndex)
  })

  // ON READY
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex)
    connections[playerIndex] = true
  })

  // CHECK PLAYERS CONNECTIONS
  // We will be recieving requests from the client side to check if other player is connected. 
  // We can search the request by the name of 'check-players' or whatever we want to check   
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players)
  })

  // ON FIRE RECIEVED
  socket.on('fire', id => {
    console.log(`Shot fired from ${playerIndex}`, id)

    //EMIT THE MOVE TO THE OTHER PLAYER
    socket.broadcast.emit('fire', id)
  })

  // ON FIRE REPLY
  // To let the user know if they hit or not
  socket.on('fire-reply', square => {
    console.log(square)

    // FORWARD THE REPLY TO THE OTHER PLAYER
    socket.broadcast.emit('fire-reply', square)
  })

  // TIMEOUT CONNECTION
  setTimeout(() => {
    connections[playerIndex] = null
    socket.emit('timeout')
    socket.disconnect()
  }, 600000) // 10 MINUTE LIMIT PER PLAYER
})