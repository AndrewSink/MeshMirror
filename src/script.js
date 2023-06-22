import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd3d3d3);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("canvas-container").appendChild(renderer.domElement);
let originalMeshColor;  // Add this line
let mirrorYExists = false;

const lightBlue = new THREE.Color(0xadd8e6); // Light blue

const material = new THREE.MeshStandardMaterial({ color: lightBlue });
material.receiveShadow = true;
material.castShadow = true;

const ambientLight = new THREE.AmbientLight(0x909090); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight2.position.set(15, 15, 15);
scene.add(directionalLight2);

const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight3.position.set(-10, -10, -10);
scene.add(directionalLight3);

renderer.shadowMap.enabled = true;


const loader = new STLLoader();
loader.load('toad.stl', function (geometry) {
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: lightBlue });
    material.receiveShadow = true;
    material.castShadow = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'userMesh';

    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = bbox.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.translate(-10, 0, 0);

    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y + (distance * 3), center.z + (distance * 2));
    controls.target.set(center.x, center.y, center.z);
    controls.update();
}, undefined, function (error) {
    console.error('An error happened', error);
});

console.log('Happy birthday, Gary!')
const controls = new OrbitControls(camera, renderer.domElement);

// Initialize TransformControls
let transformControls;

window.addEventListener('resize', function () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

document.getElementById('uploadButton').addEventListener('click', function () {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function () {
    let file = this.files[0];  // Declare 'file' with 'let'
    const reader = new FileReader();
    reader.addEventListener('load', function (event) {
        const loader = new STLLoader();
        const geometry = loader.parse(event.target.result);
        geometry.rotateX(-Math.PI / 2);

        const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
        const bboxcenter = bbox.getCenter(new THREE.Vector3());
        geometry.translate(-bboxcenter.x, -bboxcenter.y, -bboxcenter.z);
        geometry.translate(-10, 0, 0); // Or the amount you prefer

        const material = new THREE.MeshStandardMaterial({ color: lightBlue });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'userMesh';

        // Remove previous models from the scene
        const previousUserMesh = scene.getObjectByName('userMesh');
        const previousMirrorMesh = scene.getObjectByName('mirrorMesh');

        if (transformControls && transformControls.object) {
            transformControls.detach(transformControls.object);
        }


        if (previousUserMesh) {
            scene.remove(previousUserMesh);
        }
        if (previousMirrorMesh) {
            scene.remove(previousMirrorMesh);
        }
        document.getElementById('exportButton').disabled = true;


        scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.y, size.z);


        // camera.position.set(center.x, center.y + distance, center.z + distance);

        controls.target.set(center.x, center.y, center.z);
        controls.update();

    });
    reader.readAsArrayBuffer(file);
});

document.getElementById('mirrorYButton').addEventListener('click', function () {
    let userMesh = scene.getObjectByName('userMesh');
    let previousMirrorMesh = scene.getObjectByName('mirrorMesh');
    let exportButton = document.getElementById('exportButton'); // Reference to the export button
    if (mirrorYExists && previousMirrorMesh) {
        scene.remove(previousMirrorMesh);
        mirrorYExists = false;
        userMesh.material.color.setHex(originalMeshColor);
        userMesh.material.opacity = 1;

        exportButton.disabled = true; // Disable the export button when the mirrored mesh is removed
    } else if (userMesh) {
        if (previousMirrorMesh) {
            scene.remove(previousMirrorMesh);
        }
        originalMeshColor = userMesh.material.color.getHex();
        userMesh.material.color.set(0xD5EBF2); // Light white
        userMesh.material.transparent = true;
        userMesh.material.opacity = 0.5; // 50% translucent

        let mirrorMesh = userMesh.clone();
        mirrorMesh.material = new THREE.MeshStandardMaterial({ color: lightBlue });
        mirrorMesh.scale.x *= -1;
        mirrorMesh.position.z = userMesh.position.z;


        let boundingBox = new THREE.Box3().setFromObject(userMesh);
        let size = boundingBox.getSize(new THREE.Vector3());
        mirrorMesh.position.x += (size.x);  // Subtracting a constant value


        mirrorMesh.name = 'mirrorMesh';
        scene.add(mirrorMesh);

        mirrorYExists = true;
        document.getElementById('exportButton').disabled = false;
    }
});

document.getElementById('exportButton').addEventListener('click', function () {
    console.log('Export button selected')
    const exporter = new STLExporter();

    let mirrorMesh = scene.getObjectByName('mirrorMesh');
    let clonedGeometry = mirrorMesh.geometry.clone();
    clonedGeometry.rotateX(Math.PI / 2);

    // Subtract the position of the original mesh.
    clonedGeometry.translate(-mirrorMesh.position.x, -mirrorMesh.position.y, -mirrorMesh.position.z);

    // Apply transformations to the geometry.
    clonedGeometry.applyMatrix4(mirrorMesh.matrix);

    // Add the position back.
    clonedGeometry.translate(mirrorMesh.position.x, mirrorMesh.position.y, mirrorMesh.position.z);

    // Calculate the bounding box of the clonedGeometry
    clonedGeometry.computeBoundingBox();

    // Align clonedGeometry's z position with mirrorMesh's z position
    clonedGeometry.translate(0, 0, mirrorMesh.position.z - clonedGeometry.boundingBox.min.z);

    // Align clonedGeometry's x position with mirrorMesh's x position
    clonedGeometry.translate(mirrorMesh.position.x - clonedGeometry.boundingBox.min.x, 0, 0);

    // Flip all the normals and reverse winding order.
    let positionAttribute = clonedGeometry.attributes.position;
    let normalAttribute = clonedGeometry.attributes.normal;

    if (positionAttribute && normalAttribute) {
        // Reverse the winding order.
        for (let i = 0; i < positionAttribute.count; i += 3) {
            let temp1 = positionAttribute.getX(i);
            let temp2 = positionAttribute.getY(i);
            let temp3 = positionAttribute.getZ(i);

            positionAttribute.setXYZ(i, positionAttribute.getX(i + 2), positionAttribute.getY(i + 2), positionAttribute.getZ(i + 2));
            positionAttribute.setXYZ(i + 2, temp1, temp2, temp3);
        }
        positionAttribute.needsUpdate = true;

        // Flip normals.
        for (let i = 0; i < normalAttribute.count; i++) {
            normalAttribute.setX(i, normalAttribute.getX(i) * -1);
            normalAttribute.setY(i, normalAttribute.getY(i) * -1);
            normalAttribute.setZ(i, normalAttribute.getZ(i) * -1);
        }
        normalAttribute.needsUpdate = true;
    }

    let tempMesh = new THREE.Mesh(clonedGeometry, mirrorMesh.material);

    if (tempMesh) {
        let stlString = exporter.parse(tempMesh, { binary: true });

        // Here we create a blob with the STL string and create an Object URL
        // to be used as the href for a download link.
        let blob = new Blob([stlString], { type: 'text/plain' });
        let url = URL.createObjectURL(blob);

        // We create a link element and simulate a click to download the file.
        let downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'Mirrored_Mesh.stl';
        downloadLink.click();
    } else {
        console.log('No mirrored mesh found to export.');
    }
});

