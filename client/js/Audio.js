export default class Audio {
  constructor() {
    console.log('initializing audio');
    this.context = new window.AudioContext();
    this.peers = {};
    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
      this.stream = stream;
    });
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
  playStream(stream) {
    const context = this.context;
    const player = new window.Audio();
    player.muted = true;
    player.srcObject = stream;
    player.play();
    const source = context.createMediaStreamSource(stream);
    source.connect(context.destination);
  }
}