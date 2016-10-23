module.exports = class Peering {
  constructor(io) {
    this.sessions = {};
    this.io = io;
    io.on('connection', (socket) => {
      const sid = socket.id;
      if (!this.sessions[sid]) {
        this.sessions[sid] = {};
        console.log('new session', sid);
      }
      this.sessions[sid].getSocket = () => {
        return socket;
      };
      socket.on('callme', (room) => {

        for(let oldRoom in socket.rooms) {
          socket.leave(socket.rooms[oldRoom]);
        }

        socket.join(room);
        socket.to(room).emit('callme', {
          name: sid
        });
      });
      socket.on('offer', (offer) => {
        offer.name = sid;
        io.sockets[offer.target].emit('offer', offer);
      });
      socket.on('answer', (answer) => {
        answer.name = sid;
        io.sockets[answer.target].emit('answer', answer);
      });
      socket.on('icecandidate', (message) => {
        message.name = sid;
        io.sockets[message.target].emit('icecandidate', message);
      });
    });
  }
}