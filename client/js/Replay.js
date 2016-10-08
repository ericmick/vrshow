export default class Replay {
    constructor(peering) {
        this.messageListener = null;
        this.sendListener = null;
        this.recording = [];
        this.peering = peering;
        this.playing = false;
    }
    recordMe() {
        this.sendListener = this.peering.addEventListener('send', (event) => {
            this.recording.push(Object.assign({
                time: new Date().getTime()
            }, event.detail));
        });
    }
    recordOthers() {
        this.messageListener = this.peering.addEventListener('message', (event) => {
            this.recording.push(Object.assign({
                time: new Date().getTime()
            }, event.detail));
        });
    }
    recordAll() {
        this.recordMe();
        this.recordOthers();
    }
    stopRecording() {
        if(this.sendListener) {
            this.peering.removeEventListener('send', this.sendListener);
            this.sendListener = null;
        }
        if(this.messageListener) {
            this.peering.removeEventListener('message', this.messageListener);
            this.messageListener = null;
        }
    }
    render() {
        const now = new Date().getTime() - this.startOffset;
        while (this.recording[this.playbackIndex].time <= now) {
            this.peering.receive(this.recording[this.playbackIndex]);
            if (++this.playbackIndex >= this.recording.length) {
                this.playbackIndex = 0;
                if (this.isLooping) {
                    this.startOffset = new Date().getTime() - this.recording[0].time;
                } else {
                    this.stopPlaying();
                }
            }
        }
    }
    play(isLooping) {
        if (this.recording.length == 0) {
            return;
        }
        this.isLooping = !!this.isLooping;
        this.playbackIndex = 0;
        this.startOffset = new Date().getTime() - this.recording[0].time;
        this.renderInterval = setInterval(() => this.render(), 30);
    }
    stopPlaying() {
        return this.renderInterval && clearInterval(this.renderInterval);
    }
}