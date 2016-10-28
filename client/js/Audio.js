export default class Audio {
    constructor(isPrimary) {
        console.log('initializing audio');
        this.level = 0;
        this.isPrimary = isPrimary;
        if (isPrimary) {
            Audio.getStream().then((stream) => {
                this.playStream(stream);
            });
        }
    }
    
    static getStream() {
        return new Promise((resolve, reject) => {
            if (Audio.stream) {
                resolve(Audio.stream);
            } else {
                navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
                    Audio.stream = stream;
                    resolve(stream);
                });
            }
        });
    }

    setPosition(vector) {
        if(this.panner) {
            this.panner.setPosition(vector.x, vector.y, vector.z);
        }
    }
    
    getLevel() {
        return this.level;
    }

    static setListener(matrixWorld) {
        const position = new THREE.Vector3().setFromMatrixPosition(matrixWorld);
        const listener = Audio.context.listener;
        listener.setPosition(position.x, position.y, position.z);
        const orientation = new THREE.Quaternion().setFromRotationMatrix(matrixWorld);
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(orientation);
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(orientation);
        listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }

    playStream(stream) {
        const context = Audio.context;
        const player = new window.Audio();
        player.muted = true;
        player.srcObject = stream;
        player.play();
        this.source = context.createMediaStreamSource(stream);
        this.scriptNode = context.createScriptProcessor(256);
        this.scriptNode.onaudioprocess = (audioProcessingEvent) => {
            var inputBuffer = audioProcessingEvent.inputBuffer;
            var data = inputBuffer.getChannelData(0);
            var total = 0
            for (var i = 0; i < data.length; i++) {
                total += data[i] * data[i];
            }
            this.level = Math.sqrt(Math.sqrt(total / data.length));
        }
        this.source.connect(this.scriptNode);
        this.scriptNode.connect(context.destination);
        if (!this.isPrimary) {
            this.panner = context.createPanner();
            this.source.connect(this.panner);
            this.panner.connect(context.destination);
        }
    }
    
    dispose() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.scriptNode) {
            this.scriptNode.disconnect();
            this.scriptNode = null;
        }
        if (this.panner) {
            this.panner.disconnect();
            this.panner = null;
        }
    }
}

const AudioContext = window.AudioContext || window.webkitAudioContext;
Audio.context = new AudioContext();