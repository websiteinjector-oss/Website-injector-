const firebaseConfig = {
apiKey: "AIzaSyBikwOco-WFuucTCKQR2a15V_wVXha5Y1Y",
authDomain: "website-857ee.firebaseapp.com",
databaseURL: "https://website-857ee-default-rtdb.firebaseio.com/",
projectId: "website-857ee"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let user="";
let data={};
let downloadsStatus={};
let downloadIntervals={};


// AUTO LOGIN
window.onload=function(){

let saved=localStorage.getItem("apkUser");

if(saved){

user=saved;

document.getElementById("login").style.display="none";
document.getElementById("app").style.display="block";

document.getElementById("profileName").textContent=user;

showTab("home");
switchHomeTab("latest");

load();
loadDownloadsStatus();

}

}


// CAPTCHA
let captchaValue="";

function makeCaptcha(){

let chars="ABCDEFGHJKLMNP123456789";

captchaValue="";

for(let i=0;i<5;i++){

captchaValue+=chars[Math.floor(Math.random()*chars.length)];

}

document.getElementById("captcha").innerHTML=captchaValue;

}

makeCaptcha();


// LOGIN
function login(){
  let u=document.getElementById("user").value;
  let p=document.getElementById("password").value;
  let c=document.getElementById("capInput").value;

  if(c!==captchaValue){
    alert("Wrong captcha");
    makeCaptcha();
    return;
  }

  if(!u||!p){
    alert("Username & Password required");
    return;
  }

  // ✅ Check Firebase first
  db.ref("users/"+u).get().then(snapshot=>{
    if(snapshot.exists()){
      // User exists, check password
      let savedPass = snapshot.val().password;
      if(savedPass === p){
        afterLogin(u);
      } else {
        alert("Incorrect password!");
      }
    } else {
      // User doesn't exist → register
      db.ref("users/"+u).set({password:p,lastLogin:Date.now()});
      alert("New user registered!");
      afterLogin(u);
    }
  }).catch(err=>{
    console.error(err);
    alert("Database error!");
  });
}

// ✅ After login helper
function afterLogin(u){
  user = u;
  localStorage.setItem("apkUser",user);
  document.getElementById("login").style.display="none";
  document.getElementById("app").style.display="block";
  document.getElementById("profileName").textContent=user;
  showTab("home"); switchHomeTab("latest");
  load();
  loadDownloadsStatus();
}



// LOGOUT
function logout(){

if(confirm("Logout?")){

localStorage.removeItem("apkUser");
location.reload();

}

}


// TABS
function showTab(t){

document.querySelectorAll(".tab").forEach(e=>e.style.display="none");
document.getElementById(t).style.display="block";

}

function switchHomeTab(tab){

document.querySelectorAll(".home-tab").forEach(e=>e.style.display="none");
document.getElementById(tab).style.display="block";

}


// ICON PREVIEW + CHECK
function showPreview(event){

let file=event.target.files[0];

if(!file)return;

let img=new Image();

img.onload=function(){

if(img.width<128||img.height<128){

alert("Icon must be at least 128x128");

document.getElementById("iconFile").value="";
return;

}

let reader=new FileReader();

reader.onload=e=>{

document.getElementById("previewIcon").src=e.target.result;

};

reader.readAsDataURL(file);

};

img.src=URL.createObjectURL(file);

}


// FILE → BASE64
function fileToBase64(file,callback){

let reader=new FileReader();

reader.onload=e=>callback(e.target.result);

reader.readAsDataURL(file);

}


// UPLOAD
function upload(){

let name=document.getElementById("name").value;
let desc=document.getElementById("desc").value;
let apk=document.getElementById("apk").value;
let iconFile=document.getElementById("iconFile").files[0];

if(!name||!apk||!iconFile){

alert("App Name, APK, and Icon required");
return;

}

fileToBase64(iconFile,iconData=>{

let node=db.ref("apks").push();

node.set({

appName:name,
description:desc,
apkURL:apk,
icon:iconData,
uploadedBy:user,
downloads:0,
time:Date.now()

});

alert("Uploaded!");

});

}


// LOAD APKS
function load(){

db.ref("apks").on("value",snap=>{

data=snap.val()||{};
render();

});

}


// DOWNLOAD STATUS
function loadDownloadsStatus(){

db.ref("downloadsStatus/"+user).on("value",snap=>{

downloadsStatus=snap.val()||{};
render();

});

}


// RENDER
function render(){

let latest=document.getElementById("latest");
let top=document.getElementById("top");
let my=document.getElementById("my");

latest.innerHTML="";
top.innerHTML="";
my.innerHTML="";

let arr=Object.keys(data).map(k=>({id:k,...data[k]}));

let search=document.getElementById("search").value.toLowerCase();

arr=arr.filter(a=>a.appName.toLowerCase().includes(search));

arr.sort((a,b)=>b.time-a.time);

arr.forEach(a=>latest.appendChild(makeCard(a)));

arr.sort((a,b)=>b.downloads-a.downloads);

arr.forEach(a=>top.appendChild(makeCard(a)));

arr.filter(a=>a.uploadedBy==user).forEach(a=>my.appendChild(makeCard(a)));

}


// CARD
function makeCard(a){

let d=document.createElement("div");

d.className="apk";

let status=downloadsStatus[a.id]||"";

let btnText=status=="done"?"Done":"Download";

let deleteBtn="";

if(a.uploadedBy===user){

deleteBtn="<button class='delete-btn' onclick='deleteAPK(\""+a.id+"\")'>Delete</button>";

}

d.innerHTML=

"<img src='"+a.icon+"'>"+
"<div><b>"+a.appName+"</b><br>"+
a.description+"<br>"+
"by "+a.uploadedBy+"<br>"+
"<span>Downloads: "+a.downloads+"</span><br>"+
"<button class='like-btn' onclick='likeAPK(\""+a.id+"\")'>Like</button>"+
deleteBtn+
"<div class='progress-container'><div class='progress-bar' id='p_"+a.id+"'></div></div>"+
"<button onclick='startDownload(\""+a.id+"\")'>"+btnText+"</button>"+
"</div>";

return d;

}


// LIKE
function likeAPK(id){

db.ref("apks/"+id+"/likes/"+user).set(true);

alert("Liked!");

}


// DELETE
function deleteAPK(id){

if(confirm("Delete this APK?")){

db.ref("apks/"+id).remove();

}

}


// DOWNLOAD
function startDownload(id){

let a=data[id];

if(downloadsStatus[id]=="done"){

alert("Already downloaded");
return;

}

let pb=document.getElementById("p_"+id);

let progress=0;

if(downloadIntervals[id])clearInterval(downloadIntervals[id]);

downloadIntervals[id]=setInterval(()=>{

progress+=5;

pb.style.width=progress+"%";

if(progress>=100){

clearInterval(downloadIntervals[id]);

window.open(a.apkURL,"_blank");

db.ref("downloadsStatus/"+user+"/"+id).set("done");

db.ref("apks/"+id+"/downloads").transaction(n=>(n||0)+1);

loadDownloadsStatus();

}

},200);

}


// UPDATE
function updateAPK(id){

let a=data[id];

let newName=prompt("App Name",a.appName);
let newDesc=prompt("Description",a.description);
let newAPK=prompt("MediaFire APK Link",a.apkURL);

if(!newName||!newAPK)return;

db.ref("apks/"+id).update({

appName:newName,
description:newDesc,
apkURL:newAPK,
time:Date.now()

});

alert("Updated");

}
// CHANGE USERNAME
function changeUsername(){

let newUser = prompt("Enter new username");

if(!newUser) return;

if(newUser.length < 3){
alert("Username too short");
return;
}

db.ref("users/"+newUser).once("value",snap=>{

if(snap.exists()){
alert("Username already taken");
return;
}

// copy old data
db.ref("users/"+user).once("value",old=>{

db.ref("users/"+newUser).set(old.val());

// delete old username
db.ref("users/"+user).remove();

// update uploaded APK owner
db.ref("apks").once("value",snap2=>{
let all=snap2.val()||{};
Object.keys(all).forEach(id=>{
if(all[id].uploadedBy==user){
db.ref("apks/"+id+"/uploadedBy").set(newUser);
}
});
});

user=newUser;
localStorage.setItem("apkUser",newUser);
document.getElementById("profileName").innerText=newUser;

alert("Username changed!");

});

});

}


// CHANGE PASSWORD
function changePassword(){

let newPass = prompt("Enter new password");

if(!newPass) return;

if(newPass.length < 4){
alert("Password too short");
return;
}

db.ref("users/"+user+"/password").set(newPass);

alert("Password changed!");

}