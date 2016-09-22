export default class Audio {
  constructor() {
    console.log('initializing audio');
    this.context = new window.AudioContext();
    this.peers = {};
    this.connect();
  }
  getStream() {
    if (this.stream) {
      return new Promise((resolve, reject) => resolve(this.stream));
    }
    return navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
      this.stream = stream;
      return stream;
    });
  }
  putStream(stream) {
    const context = this.context;
    const source = context.createMediaStreamSource(stream);
    source.connect(context.destination);
  }
  connect() {
    const socket = this.socket = io('/peering');
    socket.on('callme', (message) => {
      console.log('got callme', message);
      if (this.peers[message.name]) {
        this.peers[message.name].close();
        this.peers[message.name] = null;
      }
      this.makePeerConnection(message.name);
    });
    socket.on('answer', (answer) => {
      console.log('got answer', answer);
      const description = new RTCSessionDescription(answer.sdp);
      description.name = answer.name;
      this.peers[answer.name].setRemoteDescription(description);
    });
    socket.on('offer', (offer) => {
      console.log('got offer', offer);
      const description = new RTCSessionDescription(offer.sdp);
      let connection;
      this.makePeerConnection(offer.name).then((newConnection) => {
        connection = newConnection;
        connection.setRemoteDescription(description);
      }).then(() => {
        return connection.createAnswer();
      }).then(function(answer) {
        return connection.setLocalDescription(answer);
      }).then(() => {
        const message = {
          sdp: connection.localDescription,
          target: offer.name,
          type: 'answer'
        };
        socket.emit('answer', message);
        console.log('sent answer', message);
      });
    });
    socket.on('icecandidate', (message) => {
      console.log('got icecandidate', message);
      const candidate = new RTCIceCandidate(message.candidate);
      if (this.peers[message.name]) {
        this.peers[message.name].addIceCandidate(candidate).catch((e) => console.error(e));
      } else {
        console.log('discarding icecandidate', message);
      }
    });
    socket.emit('callme');
    console.log('sent callme');
  }
  makePeerConnection(target) {
    if (this.peers[target]) {
      return new Promise((resolve, reject) => {
        resolve(this.peers[target]);
      });
    }
    const socket = this.socket;
    const connection = this.peers[target] = new RTCPeerConnection({
        iceServers: [{
          urls: ['stun:stun.l.google.com:19302']
        }],
        rtcpMuxPolicy: 'require'
      }, {
      optional: [
        {DtlsSrtpKeyAgreement: true},
        {RtpDataChannels: true}
      ]
    });
    let disconnectionTimeout = null;
    connection.addEventListener('iceconnectionstatechange', (event) => {
      if (connection.iceConnectionState == 'closed'
        || connection.iceConnectionState == 'failed'
        || connection.iceConnectionState == 'disconnected') {
        const badState = connection.iceConnectionState;
        setTimeout(() => {
          if (connection.iceConnectionState == badState) {
            if (connection.iceConnectionState != 'closed') {
              connection.close();
            }
            console.log('discarding connection', target, connection);
            delete this.peers[target];
          }
        }, 3000);
      } else if (disconnectionTimeout) {
        clearTimeout(disconnectionTimeout);
        disconnectionTimeout = null;
      }
    });
    connection.addEventListener('icecandidate', (event) => {
      if (!event.candidate) {
        console.log('ice complete');
        return;
      }
      const message = {
        type: 'new-ice-candidate',
        target: target,
        candidate: event.candidate
      };
      socket.emit('icecandidate', message);
      console.log('sent icecandidate', message);
    });
    connection.addEventListener('negotiationneeded', (event) => {
      console.log('negotiationneeded', event);
      connection.createOffer().then((offer) => {
        return connection.setLocalDescription(offer);
      }).then(() => {
        const offerMessage = {
          sdp: connection.localDescription,
          target: target,
          type: 'offer'
        };
        socket.emit('offer', offerMessage);
        console.log('sent offer', offerMessage);
      });
    });
    connection.addEventListener('track', (event) => {
      console.log('track', event);
      const player = new window.Audio();
      player.srcObject = event.streams[0];
      player.play();
    });
    connection.addEventListener('addstream', (event) => {
      console.log('addstream', event);
      const player = new window.Audio();
      player.srcObject = event.stream;
      player.play();
    });
    return this.getStream().then((stream) => {
      connection.addStream(stream);
    }).then(() => {
      return connection;
    });
  }
}