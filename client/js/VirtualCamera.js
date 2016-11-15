import * as THREE from 'three';

export default class VirtualCamera extends THREE.Object3D {
    constructor(size = 0.1, resolution = 720, aspectRatio = 16/9) {
        super();
        this.camera = new THREE.PerspectiveCamera(80, aspectRatio, 0.1, 1000);
        this.renderTarget = new THREE.WebGLRenderTarget(aspectRatio * resolution, resolution, { format: THREE.RGBFormat });

        // Create camera box
        const monitorGeometry = new THREE.BoxGeometry(size*aspectRatio, size*aspectRatio, size);
        this.monitor = new THREE.Mesh(monitorGeometry, new THREE.MeshBasicMaterial({
            map: this.renderTarget.texture
        }));
        this.monitor.add(this.camera);
        this.add(this.monitor);
    }

    render(scene, renderer) {
        this.monitor.visible = false;
        renderer.render(scene, this.camera, this.renderTarget, true);
        this.monitor.visible = true;
    }

    tiltCameraLens(radians) {
        this.sceneCamera.rotateX(radians);
    }
}