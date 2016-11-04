import * as THREE from 'three';

export default class VirtualCamera extends THREE.Object3D {
    constructor(size = 0.1, resolution = 720, aspectRatio = 16/9) {
        super();
        this.sceneCamera = new THREE.PerspectiveCamera(80, aspectRatio, 0.1, 1000);
        this.renderTarget = new THREE.WebGLRenderTarget(aspectRatio * resolution, resolution, { format: THREE.RGBFormat });

        // Create camera box
        const monitorGeometry = new THREE.BoxGeometry(size*aspectRatio, size, size*aspectRatio);
        this.monitor = new THREE.Mesh(monitorGeometry, new THREE.MeshBasicMaterial({
            map: this.renderTarget.texture
        }));
        this.monitor.add(this.sceneCamera);
        this.monitor.rotateY(Math.PI);
        this.add(this.monitor);
    }
    render(scene, renderer) {
        this.monitor.visible = false;
        renderer.render(scene, this.sceneCamera, this.renderTarget, true);
        this.monitor.visible = true;
    }
}