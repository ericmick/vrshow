import Audio from './Audio';

export default class Peering {
  constructor(onReceiveDataChannel) {
    console.log('initializing peering');
    var audio = new Audio();
    this.getAudioStream = () => audio.getStream();
    this.onReceiveAudioStream = (stream) => audio.playStream(stream);
    this.onReceiveDataChannel = onReceiveDataChannel;
    this.peers = {};
    this.connect();
  }
  connect() {
    const socket = this.socket = io('/peering');
    socket.on('callme', (message) => {
      console.log('got callme', message);
      if (this.peers[message.name]) {
        this.peers[message.name].connection.close();
        this.peers[message.name] = null;
      }
      this.makePeerConnection(message.name);
    });
    socket.on('answer', (answer) => {
      console.log('got answer', answer);
      const description = new RTCSessionDescription(answer.sdp);
      description.name = answer.name;
      this.peers[answer.name].connection.setRemoteDescription(description);
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
        this.peers[message.name].connection.addIceCandidate(candidate).catch((e) => console.error(e));
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
        resolve(this.peers[target].connection);
      });
    }
    const socket = this.socket;
    this.peers[target] = {};
    const connection = this.peers[target].connection = new RTCPeerConnection({
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
      this.onReceiveAudioStream(event.streams[0]);
    });
    connection.addEventListener('addstream', (event) => {
      console.log('addstream', event);
      this.onReceiveAudioStream(event.stream);
    });
    connection.addEventListener('datachannel', (event) => {
      console.log('datachannel', event);
      this.onReceiveDataChannel(event.channel);
    });
    return this.getAudioStream().then((stream) => {
      connection.addStream(stream);
    }).then(() => {
      let dataChannel = connection.createDataChannel('avatar');
      this.peers[target].dataChannel = dataChannel;
      dataChannel.addEventListener('open', () => {
        console.log('datachannel open');
        this.onReceiveDataChannel(dataChannel);
      });
      return connection;
    });
  }
  send(data) {
    for (let i in this.peers) {
      this.peers[i].dataChannel.send(data);
    }
  }
}