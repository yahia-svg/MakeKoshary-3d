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
const barElm = document.getElementById('pourbar');
const barBand = document.getElementById('pourband');
const barFill = document.getElementById('pourfill');
const barMark = document.getElementById('pourmark');
const barLabel = document.getElementById('pourlabel');
const barName = document.getElementById('pourname');


const BAR_MAX = 1.35;
let mode = 'menu';
const state = {
  level: 1,
  score: 0,
  customer: 1,
  step: 0,
    fulfiled: false,
  targets: [],
  pour:0,
  drop:0,
  spill:0,
  short: 0,
}
let playnow = false;
let view,playcamera,render;

// some of these arrays & variables seem pretty useless but hopefully they'll save me time going forward :>
const ingredients = ['Rice', 'Lentils', 'Pasta', 'Chickpeas', 'Tomato Sauce', 'Fried Onions']
const material = []
const allgrain = [] 
const sizes = [0.057, 0.036, 0.043, 0.03, 0.028, 0.038];
const shapes = [];
let bowl = null, last = 0, spacedown = false, world = null,  pouring = false, armed = true;
RAPIER.init().then(() => new GLTFLoader().loadAsync('/models/bowlnew.glb')).then((gltf) => {bowl = gltf.scene; startBt.disabled = false; startBt.textContent = 'Start Game'});

function updateHUD() {
  levelElm.textContent = `Level: ${state.level}`;
  customerElm.textContent = `Customer ${state.customer}`;
  scoreElm.textContent = `Score ${state.score}`;
  updateBar();
  if(state.step > 5) return;
  const li = orderlist.children[state.step];
  if (!li) return;
  li.className = inband() ? 'active inband' : 'active';
    li.lastElementChild.textContent = Math.floor(state.pour) + '/' + state.targets[state.step];
}
function inband(){
  const t = state.targets[state.step];
  if (t === undefined) return false;
  return Math.abs(state.pour - t) <= t * tol();
}
function updateBar(){
  const t = state.targets[state.step];
  if(!barElm) return;
  if( t === undefined || state.fulfiled || mode !== 'playing'){
    barElm.classList.add('hidden');
    return;
  }
  barElm.classList.remove('hidden');
  const tl = tol();
  barMark.style.left = (100/ BAR_MAX) + '%';
  barBand.style.left = ((1-tl) * 100 / BAR_MAX) + '%';
  barBand.style.width = (2 * tl * 100 / BAR_MAX) + '%';
  barFill.style.width = Math.min(100, state.pour * 100 / (t * BAR_MAX)) + '%';
  barFill.className = state.pour > t * (1 + tl) ? 'over' : (inband() ? 'good' : '');
  barName.textContent = ingredients[state.step];
  barLabel.textContent = Math.floor(state.pour) + ' / ' + t;

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
  const lihgt = new THREE.DirectionalLight(0xffffff, -1);
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
function MakeIngredient(){
  shapes[0] = new THREE.SphereGeometry(0.05, 6, 5); shapes[0].scale(1.6, 0.5, 0.5);
  shapes[1] = new THREE.SphereGeometry(0.035, 6, 5);
  shapes[2] = new THREE.CylinderGeometry(0.03, 0.03, 0.10, 8);
  shapes[3] = new THREE.SphereGeometry(0.02, 8 , 6)
  shapes[4] = new THREE.SphereGeometry(0.02,  6, 5);
  shapes[5] = new THREE.TorusGeometry(0.04, 0.01, 5, 8);

  material[0] = new THREE.MeshStandardMaterial({color: 0xefe3c4 });
  material[1] = new THREE.MeshStandardMaterial({color : 0x7d4f27 });
  material[2] = new THREE.MeshStandardMaterial({color: 0xe6bf6a });
  material[3] = new THREE.MeshStandardMaterial({color:0xd8b273 });
  material[4] = new THREE.MeshStandardMaterial({color: 0xbe2b1d });
  material[5] = new THREE.MeshStandardMaterial({color: 0x9c5a22 });
}

function ApplyPhysics(){
  world = new RAPIER.World({x:0, y: -9.81, z:0});
  const bot = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, - 0.05, 0));
    world.createCollider(RAPIER.ColliderDesc.cylinder(0.05, 0.335), bot);
  const walls = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,0.15,0));
  for(let i = 0; i<16; i++){
    const a = i/16 * Math.PI*2;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.015, 0.15, 0.077).setTranslation(Math.cos(a) * 0.35,0,Math.sin(a)*0.35).setRotation({x:0, y:Math.sin(-a/2), z:0, w: Math.cos(-a/2)}),
      walls
    );
  }
}
function tol(){
  return Math.max(0.05, 0.13 - (state.level - 1) * 0.01);
}
function Add(){
  state.step = 0;
  state.drop = 0;
  state.pour = 0;
  state.spill = 0;
  state.short = 0;
  pouring = false;
  armed = !spacedown;
  state.targets = [];
  orderlist.innerHTML = '';
  for(let i = 0; i<6; i++){
    state.targets[i] = Math.round((14 + state.level * 2 + Math.floor(Math.random() * 16)) * 1.3);
    orderlist.innerHTML += '<li><span>' + ingredients[i] + '</span><span>' + state.targets[i] + '</span></li>';
  }
  for (const g of allgrain) {world.removeRigidBody(g.body); view.remove(g.mesh); }
  allgrain.length = 0;
  updateHUD();
}
function drop(offset){
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(offset + (Math.random() - 0.5) * 0.05, 0.5, (Math.random() - 0.5) * 0.05).setLinearDamping(0.03).setCcdEnabled(true)
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(sizes[state.step]).setRestitution(0.05).setFriction(0.85),
    body
  );
  const mesh = new THREE.Mesh(shapes[state.step], material[state.step]);
  mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  view.add(mesh);
  allgrain.push({body,mesh});
  if(allgrain.length > 600){
    const old = allgrain.shift();
    world.removeRigidBody(old.body);
    view.remove(old.mesh);
  }
}
function finish( ){
  if (!pouring) return;
  pouring = false;
  armed = false;
  const t = state.targets[state.step];
  const off = (state.pour - t) /t;
  const miss = Math.abs(off);
  const li = orderlist.children[state.step];
  if(miss <= tol()){
    li.className = 'done';
    state.score += Math.round(100 * (1 - miss));
    if (miss < 0.03) state.score += 50;
  } else if (off > 0) {
    li.className = 'bad';
    state.spill++;
  } else{
    li.className = 'short';
    state.short++;
  }
  li.lastElementChild.textContent = Math.floor(state.pour) + '/' + t;
  state.step++;
  state.pour = 0;
  state.drop = 0;
  if(state.step > 5) fulfil();
  else updateHUD();
}
function fulfil(){
  state.fulfiled = true;
  const clean = state.spill === 0 && state.short === 0;
  if(clean)  state.score += 100;
  resultitle.textContent = clean ? 'perfect' : 'Order Fulfiled';
  const notes = []
  if(state.spill) notes.push ('Overfilled' + state.spill + ' ingredient(s)');
  if(state.short) notes.push('Underfilled' + state.short + ' ingredient(s)');
  resultDetail.textContent = (clean ? 'Noice +100' : notes.join(' . ')) + '\n\n Total score: ' + state.score;
  resultElm.classList.remove('hidden');
  updateHUD();
}
function nextCustomer(){
  resultElm.classList.add('hidden');
  state.fulfiled = false;
  state.customer++;
  state.level = 1 + Math.floor((state.customer -1 )/3);
  Add()
}
function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now-last) / 1000, 0.05);
  last = now;
  if(mode=== 'playing' && !state.fulfiled && spacedown && armed && !pouring && state.step <= 5){
    pouring = true;
    armed = false;
    state.pour = 0;
    state.drop = 0;
  }
  if(pouring){
    state.pour += (8 + (state.level - 1) * 1.5) * dt;
    const over = state.pour > state.targets[state.step] * (1 + tol());
    while (state.drop < Math.floor(state.pour) && state.drop< 400){
      drop(over ? 0.45 : 0);
      state.drop++;
    }
  
  updateHUD();
  if (state.pour > state .targets[state.step] * BAR_MAX) finish();
  }
  if(world) {
    world.step();
    for(let i = allgrain.length - 1; i >= 0; i--){
      const p = allgrain[i].body.translation();
      const r = allgrain[i].body.rotation();
      if(p.y < -1){
        world.removeRigidBody(allgrain[i].body);
        view.remove(allgrain[i].mesh);
        allgrain.splice(i,1);
        continue;
      }
      allgrain[i].mesh.position.set(p.x, p.y, p.z);
      allgrain[i].mesh.quaternion.set(r.x,r.y,r.z,r.w);
    }
  }
  render.render(view,playcamera);
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
  if (mode === 'playing') {initgame(); Add();};
}
window.addEventListener('keydown', (e) => {
  if(e.code === 'Space') {e.preventDefault(); spacedown = true;}
  if (e.code === 'Enter' && state.fulfiled) nextCustomer();
});
window.addEventListener('keyup', (e) => {
  if(e.code !== 'Space') return;
  spacedown = false;
  if (pouring) finish();
  armed = true;
});
nextBt.addEventListener('click', nextCustomer);
startBt.addEventListener('click', () => setMode('playing')); 
setMode('menu');