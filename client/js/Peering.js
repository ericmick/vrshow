import Peer from './Peer';
import Audio from './Audio';

export default class Peering {
    constructor(onPeer, context = window) {
        console.log('initializing peering');
        this.onPeer = onPeer;
        this.peers = {};
        this.connect();
        this.room = null;
        this.element = context.document.createElement('a');
    }

    removePeer(target) {
        if (this.peers[target]) {
            if (this.peers[target].dataChannel) {
                this.peers[target].dataChannel.close();
            }
            if (this.peers[target].audio) {
                this.peers[target].audio.dispose();
            }
            if (this.peers[target].audioStream) {
                this.peers[target].audioStream.close();
            }
            if (this.peers[target].connection) {
                this.peers[target].connection.close();
            }
            this.peers[target].triggerEvent('close');
            delete this.peers[target];
        }
    }

    leaveRoom(fromRoom) {
        return new Promise((resolve, reject) => {
            if(fromRoom) {
                // Leave rooms
                this.room = null;
                console.log(`Leaving room: ${fromRoom}`);
                for(let peer in this.peers) {
                    this.removePeer(peer);
                }
                resolve();
            } else {
                resolve();
            }
        });
    }

    joinRoom(toRoom) {
        return new Promise((resolve, reject) => {
            if(toRoom) {
                this.room = toRoom;
                console.log(`Entering room: ${toRoom}`);
                this.socket.emit('callme', toRoom);
                console.log(`sent callme to room ${toRoom}`);
                resolve();
            } else {
                resolve();
            }
        });
    }

    connect() {
        const socket = this.socket = io('/peering');
        socket.on('new', () => {
            console.log('new socket');
            if(this.room) {
                this.joinRoom(this.room);
            }
        });
        socket.on('callme', (message) => {
            console.log('got callme', message);
            const target = message.name;

            // remove peer if it already exists
            this.removePeer(target);

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
            if (this.peers[answer.name]) {
                console.log('got answer', answer);
                const description = new RTCSessionDescription(answer.sdp);
                description.name = answer.name;
                this.peers[answer.name].connection.setRemoteDescription(description);
            } else {
                console.log('discarding answer', answer);
            }
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
    }

    makePeerConnection(target, needsDataChannel) {
        if(this.peers[target]) {
            return new Promise((resolve, reject) => {
                resolve(this.peers[target].connection);
            });
        }
        const socket = this.socket;
        this.peers[target] = new Peer(target);
        const connection = this.peers[target].connection = new RTCPeerConnection({
            iceServers: [{
                urls: ['stun:stun.l.google.com:19302']
            }],
            rtcpMuxPolicy: 'require'
        });
        connection.addEventListener('negotiationneeded', (event) => {
            console.log('negotiationneeded', event);
        });
        connection.addEventListener('iceconnectionstatechange', (event) => {
            if(connection.iceConnectionState == 'closed'
                || connection.iceConnectionState == 'failed') {
                const badState = connection.iceConnectionState;
                console.log(badState, target, connection);
                if(this.peers[target]) {
                    this.peers[target].triggerEvent('close');
                }
            } else if(connection.iceConnectionState == 'disconnected') {
                console.log('disconnected', target, connection);
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
            this.audioStream = event.streams[0];
            audio.playStream(this.audioStream);
        });
        connection.addEventListener('addstream', (event) => {
            console.log('addstream', event);
            this.audioStream = event.stream;
            audio.playStream(this.audioStream);
        });
        connection.addEventListener('datachannel', (event) => {
            console.log('datachannel', event);
            this.peers[target].dataChannel = event.channel;
            this.handleDataChannel(target, event.channel);
        });
        if(needsDataChannel) {
            console.log('createDataChannel', 'avatar');
            let dataChannel = connection.createDataChannel('avatar');
            this.peers[target].dataChannel = dataChannel;
            this.handleDataChannel(target, dataChannel);
        }
        const returnConnection = () => {
            return connection;
        };
        return Audio.getStream().then((stream) => {
            connection.addStream(stream);
        }).then(returnConnection).catch(returnConnection);
    }
    
    handleDataChannel(target, dataChannel) {
        dataChannel.addEventListener('open', (event) => {
            console.log('datachannel open', event);
            this.onPeer(this.peers[target]);
        });
        dataChannel.addEventListener('message', (event) => {
            this.triggerEvent('message', {
                target: target,
                data: event.data
            });
            this.peers[target].triggerEvent('message', {
                data: event.data
            });
        });
        dataChannel.addEventListener('close', (event) => {
            this.removePeer(target);
        });
    }
    
    triggerEvent(type, detail) {
        var event = new CustomEvent(type, {detail: detail});
        this.element.dispatchEvent(event);
    }
    
    addEventListener(...args) {
        return this.element.addEventListener.apply(this.element, args);
    }
    
    removeEventListener(...args) {
        return this.element.removeEventListener.apply(this.element, args);
    }
    
    receive(message) {
        const target = message.target || 'self';
        if(!this.peers[target]) {
            this.peers[target] = new Peer(target);
            this.onPeer(this.peers[target]);
        }
        const peer = this.peers[target];
        peer.triggerEvent('message', message);
    }

    send(data) {
        for(let i in this.peers) {
            let channel = this.peers[i].dataChannel;
            if(channel && channel.readyState === 'open') {
                channel.send(data);
            }
        }
        this.triggerEvent('send', {
            data: data
        });
    }
}