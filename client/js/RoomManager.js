import Peering from './Peering';
import Avatar from './Avatar';
import Replay from './Replay';

import Lobby from './rooms/Lobby';
import Vestibule from './rooms/Vestibule';

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
        this.currentRoom = toRoom;
        return this.peering.leaveRoom(fromRoom)
            .then(() => this.getRoom(toRoom))
            .then((roomObj) => this.initializeRoom(roomObj))
            .then(() => this.peering.joinRoom(toRoom))
    }

    // TODO remove, and use changeRooms directly
    toggleRooms() {
        if(this.currentRoom == 'Lobby') {
            this.changeRooms('Lobby', 'Vestibule');
        } else {
            this.changeRooms('Vestibule', 'Lobby');
        }
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
    
    // TODO: Replace with loading room via ajax
    getRoom(roomName) {
        return new Promise((resolve) => {
            if(roomName == 'Lobby') {
                resolve(new Lobby(this.user));
            } else {
                resolve(new Vestibule(this.user));
            }
        });
    }
}