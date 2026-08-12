import './style.css'
import * as  THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import RAPIER from '@dimforge/rapier3d-compat'
const hudElm = document.getElementById('hud');
const levelElm = document.getElementById('level');
const menuElm = document.getElementById('menu');
const startBt = document.getElementById('start-button');
const nextBt = document.getElementById('next-button')
const customerElm = document.getElementById('customer');
const scoreElm = document.getElementById('score');
const orderlist = document.getElementById("order-list");
const resultElm = document.getElementById('result');
const resultitle = document.getElementById('result-title');
const resultDetail = document.getElementById('result-detail');


let mode = 'menu';
const state = {
  level: 1,
  score: 0,
  customer: 1,
  step: 0,
    serving: false,
  targets: [],
  pour:0,
  drop:0,
  spill:0,
}
let playnow = false;
let view,playcamera,render;

// some of these arrays & variables seem pretty useless but hopefully they'll save me time going forward :>
const ingredients = ['Rice', 'Pasta', 'Lentils', 'Chickpeas', 'Tomato Sauce', 'Fried Onions']
const material = []
const allgrain = [] 
const sizes = [0.034, 0.039, 0.031, 0.045, 0.028, 0.038];
const shapes = [];
let bowl = null, last = 0, spacedown = false, world = null,  blocked = false;
RAPIER.init().then(() => new GLTFLoader().loadAsync('/models/bowlnew.glb')).then((gltf) => {bowl = gltf.scene; startBt.disabled = false; startBt.textContent = 'Start Game'});

function updateHUD() {
  levelElm.textContent = `Level: ${state.level}`;
  customerElm.textContent = 'Customer ${state.customer}';
  scoreElm.textContent = 'Score ${state.score}';
  if(state.step > 5) return;
  const li = orderlist.children[state.step];
  if (!li) return;
  li.className = state.pour>= state.targets[state.step] * (1- tol()) ? 'active inband' : 'active';
  li.lastElementChild.textContent = Math.floor(state.pour) + '/' + state.targets[state.step];

}
function initgame(){
  if(playnow) return;
  playnow = true;
  last = performance.now();
  view = new THREE.Scene();
  playcamera = new THREE.PerspectiveCamera(
    50, window.innerWidth / window.innerHeight, 0.1, 100
  );
  playcamera.position.set(0,1.35, 1.7);
  playcamera.lookAt(0,0.73,0);
  render = new THREE.WebGLRenderer({antialias: true, alpha: true});
  render.setSize(window.innerWidth, window.innerHeight);
  render.setPixelRatio(Math.min(window.devicePixelRatio,2));
  render.domElement.id = 'game-canvas';
  document.body.appendChild(render.domElement);
  view.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.5));
  const lihgt = new THREE.DirectionalLight(0xffffff, 1.5);
  lihgt.position.set(3,5,2);
  view.add(lihgt);
  bowl.position.set(0,0.137,0);
  bowl.rotation.y = 0.35;
  bowl.scale.setScalar(0.35);

  view.add(bowl);
  const pourobj = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.03, 0.12, 16 , 1 , true),
    new THREE.MeshStandardMaterial({color:0xb0b6bd, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })
  );
  pourobj.position.set(0,0.5,0);
  view.add(pourobj);
  MakeIngredient();
  ApplyPhysics();
  animate()
}
function animate(){
  requestAnimationFrame(animate);
  render.render(view,playcamera);
}
function MakeIngredient(){
  shapes[0] = new THREE.SphereGeometry(0.03, 6, 5); shapes[0].scale(1.6, 0.5, 0.5);
  shapes[1] = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
  shapes[2] = new THREE.SphereGeometry(0.03, 6, 5); shapes[2].scale(1,0.45,1)
  shapes[3] = new THREE.SphereGeometry(0.04, 8 , 6)
  shapes[4] = new THREE.SphereGeometry(0.02,  6, 5);
  shapes[5] = new THREE.TorusGeometry(0.04, 0.01, 5, 8);

  material[0] = new THREE.MeshStandardMaterial({color: 0xefe3c4 });
  material[1] = new THREE.MeshStandardMaterial({color: 0xe6bf6a });
  material[2] = new THREE.MeshStandardMaterial({color : 0x7d4f27 });
  material[3] = new THREE.MeshStandardMaterial({color:0xd8b273 });
  material[4] = new THREE.MeshStandardMaterial({color: 0xbe2b1d });
  material[5] = new THREE.MeshStandardMaterial({color: 0x9c5a22 });
}
window.addEventListener('resize', () =>{
  if (!render) return;
  playcamera.aspect = window.innerWidth / window.innerHeight;
  playcamera.updateProjectionMatrix();
  render.setSize(window.innerWidth, window.innerHeight);
});

function setMode(newMode) {
  mode = newMode;
  menuElm.classList.toggle('hidden', mode !== 'menu');
  hudElm.classList.toggle('hidden', mode !== 'playing');
  updateHUD();
  if (mode === 'playing') initgame();
}
startBt.addEventListener('click', () => setMode('playing')); 
setMode('menu');