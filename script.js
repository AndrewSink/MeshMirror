import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8e8e8); // Light gray background
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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Brighter ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
directionalLight2.position.set(-5, 5, -5);
scene.add(directionalLight2);

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
    
    // Position mesh towards the left, accounting for mirrored space
    const size = bbox.getSize(new THREE.Vector3());
    geometry.translate(-size.x * 0.5, 0, 0);

    scene.add(mesh);
    
    // Position camera for optimal viewing
    positionCamera(mesh, null);
}, undefined, function (error) {
    console.error('An error happened', error);
});

console.log('Happy birthday, Gary!')
const controls = new OrbitControls(camera, renderer.domElement);

controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE
}

// Initialize TransformControls
let transformControls;

// Helper function to position camera for optimal viewing
function positionCamera(mesh, mirrorMesh = null) {
    let box, size, center, maxDim;
    
    if (mirrorMesh) {
        // Calculate bounding box that encompasses both models
        box = new THREE.Box3().setFromObject(mesh);
        const mirrorBox = new THREE.Box3().setFromObject(mirrorMesh);
        box.union(mirrorBox); // Combine both bounding boxes
        
        size = box.getSize(new THREE.Vector3());
        center = box.getCenter(new THREE.Vector3());
        maxDim = Math.max(size.x, size.y, size.z);
    } else {
        // Single model view
        box = new THREE.Box3().setFromObject(mesh);
        size = box.getSize(new THREE.Vector3());
        center = box.getCenter(new THREE.Vector3());
        maxDim = Math.max(size.x, size.y, size.z);
    }
    
    // Calculate view dimensions
    const viewWidth = size.x * 1.2;
    const viewHeight = size.y * 1.2;
    
    // Calculate distance based on field of view
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.max(viewWidth, viewHeight) / Math.tan(fov / 2);
    
    // Position camera slightly elevated and straight on
    camera.position.set(
        center.x,
        center.y + maxDim * 0.2,  // Slight elevation
        center.z + cameraDistance * 0.7
    );
    
    // Look at the center
    controls.target.set(center.x, center.y, center.z);
    controls.update();
}

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
        
        // Position mesh towards the left, accounting for mirrored space
        const size = bbox.getSize(new THREE.Vector3());
        geometry.translate(-size.x * 0.5, 0, 0);

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
        mirrorYExists = false;

        scene.add(mesh);

        // Position camera for optimal viewing
        positionCamera(mesh, false);

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

        exportButton.disabled = true;
        
        // Adjust camera back to single model view
        positionCamera(userMesh, null);
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
        mirrorMesh.position.x += (size.x);

        mirrorMesh.name = 'mirrorMesh';
        scene.add(mirrorMesh);

        mirrorYExists = true;
        document.getElementById('exportButton').disabled = false;
        
        // Adjust camera to fit both models - pass both meshes
        positionCamera(userMesh, mirrorMesh);
    }
});

document.getElementById('resetButton').addEventListener('click', function () {
    // Remove all meshes from the scene
    const userMesh = scene.getObjectByName('userMesh');
    const mirrorMesh = scene.getObjectByName('mirrorMesh');

    if (userMesh) {
        scene.remove(userMesh);
    }
    if (mirrorMesh) {
        scene.remove(mirrorMesh);
    }

    // Reset mirror state
    mirrorYExists = false;

    // Disable export button
    document.getElementById('exportButton').disabled = true;

    // Clear file input
    document.getElementById('fileInput').value = '';

    // Load default toad model
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
        
        // Position mesh towards the left, accounting for mirrored space
        const size = bbox.getSize(new THREE.Vector3());
        geometry.translate(-size.x * 0.5, 0, 0);

        scene.add(mesh);
        
        // Position camera for optimal viewing
        positionCamera(mesh, false);
    }, undefined, function (error) {
        console.error('An error happened', error);
    });
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

