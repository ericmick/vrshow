export default class Audio {
    constructor() {
        console.log('initializing audio');
        navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
            Audio.stream = stream;
        });
    }

    static getStream() {
        if(Audio.stream) {
            return new Promise((resolve, reject) => resolve(Audio.stream));
        }
        return navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
            Audio.stream = stream;
            return stream;
        });
    }

    setPosition(vector) {
        if(this.panner) {
            this.panner.setPosition(vector.x, vector.y, vector.z);
        }
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
        const source = context.createMediaStreamSource(stream);
        this.panner = context.createPanner();
        source.connect(this.panner);
        this.panner.connect(context.destination);
    }
}

Audio.context = new window.AudioContext();