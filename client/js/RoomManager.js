import Peering from './Peering';
import Avatar from './Avatar';
import Replay from './Replay';

export default class RoomManager {
    constructor(user) {
        this.user = user;
        this.otherAvatars = [];
        this.currentRoom = null;
        this.currentScene = null;
        this.peering = new Peering((peer) => this.onNewPeer(peer));
        
        this.userBuffer = new ArrayBuffer(user.getBufferByteLength());
    }

    onNewPeer(peer) {
        if(!this.currentScene) {
            return;
        }

        const somebody = new Avatar();
        somebody.audio = peer.audio;
        this.otherAvatars.push(somebody);
        this.currentScene.add(somebody);

        const readFromBuffer = (buffer) => {
            somebody.fromBuffer(buffer);
        };
        const messageHandler = (event) => {
            if (event.detail.data.constructor.name == 'ArrayBuffer') {
                readFromBuffer(event.detail.data);
            } else {
                var fileReader = new FileReader();
                fileReader.onload = function() {
                    readFromBuffer(this.result);
                };
                fileReader.readAsArrayBuffer(event.detail.data);
            }
        };
        peer.addEventListener('message', messageHandler);
        peer.addEventListener('close', (event) => {
            // remove avatar from scene
            this.otherAvatars.splice(this.otherAvatars.indexOf(somebody), 1);
            this.currentScene.remove(somebody);
            peer.removeEventListener('message', messageHandler);
            peer.removeEventListener('close', messageHandler);
        });
    }

    changeRooms(fromRoom, toRoom) {
        if(this.currentScene) {
            this.currentScene.detach();
        }
        this.currentRoom = toRoom;
        return this.peering.leaveRoom(fromRoom)
            .then(() => this.getRoom(toRoom))
            .then((roomObj) => this.initializeRoom(roomObj))
            .then(() => this.peering.joinRoom(toRoom))
    }

    initializeRoom(roomObject) {
        this.currentScene = roomObject;
        this.currentScene.add(this.user);
        return this.currentScene.initialize();
    }

    update(delta, renderer) {
        for (const avatar of this.otherAvatars) {
            avatar.update(delta);
        }

        this.currentScene.update(delta, renderer);

        this.user.update(delta);
        
        // send user position
        this.user.toBuffer(this.userBuffer);
        this.peering.send(this.userBuffer);
    }
    
    get(url) {
        return new Promise((resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        if (xhr.status === 200) {
                            resolve(xhr.responseText);
                        } else {
                            reject(xhr.status + ' ' + xhr.responseText);
                        }
                    }
                };
                xhr.open('GET', url);
                xhr.send();
            } catch (e) {
                reject(e);
            }
        });
    }
    
    getRoom(roomName) {
        return this.get(`js/rooms/${roomName}.js`).then((script) => {
            const module = eval(script);
            return new module.default(this.user);
        });
    }
}