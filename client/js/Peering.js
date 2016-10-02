import Audio from './Audio';

export default class Peering {
    constructor(onPeer) {
        console.log('initializing peering');
        this.onPeer = onPeer;
        this.peers = {};
        this.connect();
    }

    connect() {
        const socket = this.socket = io('/peering');
        socket.on('callme', (message) => {
            console.log('got callme', message);
            const target = message.name;
            if (this.peers[target]) {
                this.peers[target].connection.close();
                this.peers[target] = null;
            }
            this.makePeerConnection(message.name, true).then((connection) => {
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
            if(this.peers[message.name]) {
                this.peers[message.name].connection.addIceCandidate(candidate).catch((e) => console.error(e));
            } else {
                console.log('discarding icecandidate', message);
            }
        });
        socket.emit('callme');
        console.log('sent callme');
    }

    makePeerConnection(target, needsDataChannel) {
        if(this.peers[target]) {
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
        });
        let disconnectionTimeout = null;
        connection.addEventListener('negotiationneeded', (event) => {
            console.log('negotiationneeded', event);
        });
        connection.addEventListener('iceconnectionstatechange', (event) => {
            if(connection.iceConnectionState == 'closed'
                || connection.iceConnectionState == 'failed'
                || connection.iceConnectionState == 'disconnected') {
                const badState = connection.iceConnectionState;
                setTimeout(() => {
                    if(connection.iceConnectionState == badState) {
                        if(connection.iceConnectionState != 'closed') {
                            connection.close();
                        }
                        console.log('discarding connection', target, connection);
                        delete this.peers[target];
                    }
                }, 3000);
            } else if(disconnectionTimeout) {
                clearTimeout(disconnectionTimeout);
                disconnectionTimeout = null;
            }
        });
        connection.addEventListener('icecandidate', (event) => {
            if(!event.candidate) {
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
        const audio = this.peers[target].audio = new Audio();
        connection.addEventListener('track', (event) => {
            console.log('track', event);
            audio.playStream(event.streams[0]);
        });
        connection.addEventListener('addstream', (event) => {
            console.log('addstream', event);
            audio.playStream(event.stream);
        });
        connection.addEventListener('datachannel', (event) => {
            console.log('datachannel', event);
            this.peers[target].dataChannel = event.channel;
            this.onPeer(this.peers[target]);
        });
        if(needsDataChannel) {
            console.log('createDataChannel', 'avatar');
            let dataChannel = connection.createDataChannel('avatar');
            this.peers[target].dataChannel = dataChannel;
            dataChannel.addEventListener('open', (event) => {
                console.log('datachannel open', event);
                this.onPeer(this.peers[target]);
            });
        }
        const returnConnection = () => {
            return connection;
        };
        return audio.getStream().then((stream) => {
            connection.addStream(stream);
        }).then(returnConnection).catch(returnConnection);
    }

    send(data) {
        for(let i in this.peers) {
            let channel = this.peers[i].dataChannel;
            if(channel && channel.readyState === 'open') {
                channel.send(data);
            }
        }
    }
}