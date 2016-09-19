export default class Audio {
  constructor() {
    this.context = new window.AudioContext();
    this.peers = {};
  }
  getStream() {
    return navigator.mediaDevices.getUserMedia({audio: true});
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
      const connection = this.makePeerConnection(message.name);
      this.peers[message.name] = connection;
      this.getStream().then((stream) => {
        connection.addStream(stream);
      });
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
      if (!this.peers[offer.name]) {
        connection = this.makePeerConnection(offer.name);
        this.peers[offer.name] = connection;
        this.getStream().then((stream) => {
          connection.addStream(stream);
        })
      }
      connection = this.peers[offer.name];
      connection.setRemoteDescription(description).then(() => {
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
    socket.emit('callme');
    console.log('sent callme');
  }
  makePeerConnection(target) {
    const socket = this.socket;
    const connection = new RTCPeerConnection({
      iceServers: []
    }, {
      optional: [
        {DtlsSrtpKeyAgreement: true},
        {RtpDataChannels: true}
      ]
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
    socket.on('icecandidate', (message) => {
      console.log('got icecandidate', message);
      const candidate = new RTCIceCandidate(message.candidate);
      connection.addIceCandidate(candidate).catch((e) => console.error(e));
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
      const player = new Audio();
      player.srcObject = event.streams[0];
      player.play();
    });
    connection.addEventListener('addstream', (event) => {
      console.log('addstream', event);
      const player = new window.Audio();
      player.srcObject = event.stream;
      player.play();
    });
    return connection;
  }
}