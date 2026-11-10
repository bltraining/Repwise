
var data=[["Développé couché",60,"8-10",4],["Rowing barre",50,"8-10",4],["Développé militaire",30,"10",3]];
var ex=document.getElementById("ex");
data.forEach(function(d){var e=document.createElement("div");e.className="ex",h="";
for(var i=1;i<=d[3];i++)h+='<div class="sr"><span class="sn">'+i+'</span><input class="kg" type="number" inputmode="decimal" value="'+d[1]+'" aria-label="Charge série '+i+'"><input class="rp" type="number" inputmode="numeric" value="'+d[2].split("-")[0]+'" aria-label="Répétitions série '+i+'"><button class="set ck" aria-label="Valider la série '+i+'">✓</button></div>';
e.innerHTML='<div class="h"><span class="n">'+d[0]+'</span><span class="m">'+d[3]+' séries</span></div><div class="m">Objectif : '+d[2]+' reps · note tes reps en direct</div><div class="sh"><span></span><span>kg</span><span>reps</span><span></span></div>'+h;
ex.appendChild(e)});
var T={k:2200,p:140,g:240,l:70,f:30},M=[["Petit-déjeuner · flocons, œufs, fruit",520,30,60,16,8],["Déjeuner · poulet, riz, légumes",680,45,70,22,6]];
var F={"Poulet (blanc, cuit)":[165,31,0,3.6,0],"Bœuf haché 5% (cuit)":[180,27,0,8,0],"Saumon (cuit)":[206,22,0,12,0],"Thon au naturel":[116,26,0,1,0],"Œuf entier":[143,12.6,.7,9.5,0],"Riz (cuit)":[130,2.7,28,.3,.4],"Pâtes (cuites)":[158,5.8,31,.9,1.8],"Pommes de terre (cuites)":[87,1.9,20,.1,1.8],"Flocons d'avoine":[370,13,60,7,10],"Pain complet":[250,10,43,3.5,7],"Lentilles (cuites)":[116,9,20,.4,7.9],"Brocoli (cuit)":[35,2.4,7,.4,3.3],"Banane":[89,1.1,23,.3,2.6],"Pomme":[52,.3,14,.2,2.4],"Avocat":[160,2,9,15,6.7],"Yaourt grec nature":[97,9,4,5,0],"Fromage blanc 0%":[47,8,4,.2,0],"Amandes":[579,21,22,50,12.5],"Huile d'olive":[884,0,0,100,0]};
function nut(){var s=[0,0,0,0,0];M.forEach(function(m){for(var i=0;i<5;i++)s[i]+=m[i+1]});
var L=[["Calories",s[0],T.k,"kcal"],["Protéines",s[1],T.p,"g"],["Glucides",s[2],T.g,"g"],["Lipides",s[3],T.l,"g"],["Fibres",s[4],T.f,"g"]];
document.getElementById("macs").innerHTML=L.map(function(x){return '<div class="mac"><div class="t">'+x[0]+'<span>'+Math.round(x[1])+' / '+x[2]+' '+x[3]+'</span></div><div class="b"><i style="width:'+Math.min(100,x[1]/x[2]*100)+'%"></i></div></div>'}).join("");
var ml=document.getElementById("meals");ml.innerHTML="";M.forEach(function(m,mi){var d=document.createElement("div");d.className="meal";var a=document.createElement("div");a.textContent=m[0];var b=document.createElement("span");b.textContent=m[1]+" kcal · P "+m[2]+" · G "+m[3]+" · L "+m[4]+" · F "+m[5];d.appendChild(a);d.appendChild(b);var x=document.createElement("button");x.className="rm";x.textContent="Retirer";x.dataset.i=mi;x.setAttribute("aria-label","Retirer "+m[0]);d.appendChild(x);ml.appendChild(d)});
var t=[];if(s[2]>T.g*1.1)t.push("Glucides au-dessus de ta cible aujourd'hui. Inutile de les supprimer : répartis-les plutôt autour de ta séance.");
else if(s[2]<T.g*.35&&s[0]>900)t.push("Glucides plutôt bas pour l'instant. Évite de trop les baisser : ils alimentent tes séances et ta récupération.");
if(s[1]<T.p*.5&&s[0]>900)t.push("Les protéines sont en retard : pense à une source de protéines au prochain repas.");
if(s[3]>T.l*1.2)t.push("Lipides un peu élevés, à équilibrer sur les prochains repas.");
if(s[0]>T.k*1.1)t.push("Tu dépasses ta cible calorique du jour, sans conséquence si cela reste ponctuel.");
if(!t.length)t.push("Bonne répartition pour l'instant, tu es sur la bonne voie.");
document.getElementById("ianal").textContent=t.join(" ")}
document.getElementById("fa").onclick=function(){var n=fs.value,g=+document.getElementById("fg2").value;if(!n){tw("Choisis un aliment dans la liste.");fs.focus();return}if(!(g>0)){tw("Indique une quantité en grammes.");document.getElementById("fg2").focus();return}if(!F[n])return;var d=F[n],r=g/100;M.push([n+" · "+g+" g",Math.round(d[0]*r),+(d[1]*r).toFixed(1),+(d[2]*r).toFixed(1),+(d[3]*r).toFixed(1),+(d[4]*r).toFixed(1)]);document.getElementById("fg2").value="100";fs.value="";prev();nut();tw(n+" ajouté à ta journée ✓")};
nut();
function tw(m){if(window.toast)window.toast(m)}
var fs=document.getElementById("fs");Object.keys(F).forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=k;fs.appendChild(o)});
function prev(){var n=fs.value,g=+document.getElementById("fg2").value,p=document.getElementById("fprev");if(!n||!(g>0)){p.textContent="";return}var d=F[n],r=g/100;p.textContent="≈ "+Math.round(d[0]*r)+" kcal · P "+(d[1]*r).toFixed(1)+" · G "+(d[2]*r).toFixed(1)+" · L "+(d[3]*r).toFixed(1)+" · F "+(d[4]*r).toFixed(1)}
fs.onchange=prev;document.getElementById("fg2").oninput=prev;
var MODE="auto";
function donut(){var p=4*T.p,g=4*T.g,l=9*T.l,k=p+g+l||1,a=[[p,"#FF8A4C","Protéines",T.p],[g,"#F2C14E","Glucides",T.g],[l,"#4FD1C5","Lipides",T.l]],o=25,s="";
a.forEach(function(x){var q=x[0]/k*100;s+='<circle cx="21" cy="21" r="15.9155" fill="none" stroke="'+x[1]+'" stroke-width="5" stroke-dasharray="'+q+' '+(100-q)+'" stroke-dashoffset="'+o+'"/>';o-=q});
document.getElementById("pie").innerHTML='<svg viewBox="0 0 42 42" width="104" height="104"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" stroke-width="5"/>'+s+'<text x="21" y="21.5" text-anchor="middle" font-size="6" font-weight="600" fill="currentColor" font-family="ui-monospace,monospace">'+T.k+'</text><text x="21" y="27" text-anchor="middle" font-size="3" fill="var(--mut)">kcal</text></svg>';
document.getElementById("pleg").innerHTML=a.map(function(x){return '<div style="font-size:13px;margin:3px 0"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+x[1]+';margin-right:8px"></span>'+x[2]+' <span style="color:var(--mut)">'+Math.round(x[0]/k*100)+'% · '+x[3]+' g</span></div>'}).join("")}
function goals(){var w=+document.getElementById("gw").value||0,h=+document.getElementById("gh").value||0,n=document.getElementById("gnote");
if(MODE=="auto"){if(w>0&&h>0){var k=Math.round((10*w+6.25*h-228)*1.55/10)*10,p=Math.round(1.8*w),l=Math.round(k*.25/9),g=Math.round((k-4*p-9*l)/4);T={k:k,p:p,g:g,l:l,f:Math.round(k/1000*14)};document.getElementById("gp").value=p;document.getElementById("gg").value=g;document.getElementById("gl").value=l}n.textContent="Estimation générique à partir de ta taille et de ton poids : moins précise qu'un calcul sur mesure."}
else{var p2=+document.getElementById("gp").value||0,g2=+document.getElementById("gg").value||0,l2=+document.getElementById("gl").value||0;T={k:Math.round(4*p2+4*g2+9*l2),p:p2,g:g2,l:l2,f:T.f};n.textContent=(T.k>0&&T.k<1200)?"En dessous de 1 200 kcal, parles-en d'abord avec ton coach.":"Objectifs personnalisés : les calories se calculent à partir de tes grammes."}
donut();nut()}
function setMode(m){MODE=m;document.getElementById("ma").classList.toggle("on",m=="auto");document.getElementById("mp").classList.toggle("on",m=="perso");["gp","gg","gl"].forEach(function(i){document.getElementById(i).disabled=(m=="auto")});goals()}
document.getElementById("ma").onclick=function(){setMode("auto")};document.getElementById("mp").onclick=function(){setMode("perso")};
["gh","gw","gp","gg","gl"].forEach(function(i){document.getElementById(i).oninput=goals});
document.getElementById("sub").onclick=function(){document.getElementById("prem").classList.remove("locked");document.querySelector("#premc .tag").textContent="Premium actif · Proposition de l'IA"};
setMode("auto");
var H=0,HB=0;
var GL=function(f){return '<svg viewBox="0 0 30 40" width="30" height="40"><path d="M5 4h20l-3 32q0 2-2 2H10q-2 0-2-2z" fill="'+(f?'#5FB0C8':'#fff')+'" fill-opacity="'+(f?.7:.07)+'" stroke="'+(f?'#5FB0C8':'var(--mut)')+'" stroke-width="1.6"/></svg>'};
var BOT='<svg viewBox="0 0 40 90" width="34" height="76"><path d="M15 3h10v8l5 8v62q0 6-6 6H16q-6 0-6-6V19l5-8z" fill="#4E8FA3" fill-opacity=".55" stroke="#4E8FA3" stroke-width="1.6"/><rect x="14" y="1" width="12" height="4" rx="1" fill="#4E8FA3"/></svg>';
function hyd(){var b=Math.floor(H/4),r=H%4,h="";for(var i=0;i<b;i++)h+='<button type="button" class="bt'+(b>HB&&i==b-1?' fuse':'')+'" aria-label="Retirer un verre">'+BOT+'<span>1 L</span></button>';for(var j=0;j<4;j++)h+='<button type="button" class="gl" data-j="'+j+'" aria-label="'+(j<r?'Retirer ce verre':'Ajouter un verre')+'">'+GL(j<r)+'</button>';HB=b;var hy=document.getElementById("hy");hy.innerHTML=h;hy.querySelectorAll(".gl").forEach(function(e){e.onclick=function(){var j=+e.dataset.j;H=Math.min(24,b*4+(j<r?j:j+1));hyd()}});hy.querySelectorAll(".bt").forEach(function(e){e.onclick=function(){H=Math.max(0,H-1);hyd()}});document.getElementById("hl").textContent=(H*.25).toLocaleString("fr-FR",{minimumFractionDigits:1,maximumFractionDigits:2})+" L"}
hyd();
document.querySelectorAll(".nav button").forEach(function(b){b.onclick=function(){
document.querySelectorAll(".nav button").forEach(function(x){x.classList.remove("on")});b.classList.add("on");
document.querySelectorAll(".view").forEach(function(v){v.classList.remove("on")});document.getElementById(b.dataset.v).classList.add("on");if(b.dataset.v==="x"&&window.loadCassandre)window.loadCassandre()}});
function done(t){document.getElementById("prop").innerHTML='<div class="msg">'+t+'</div>'}
function bindDemoRefuse(){var r=document.getElementById("refuse"),v=document.getElementById("valide");if(v)v.onclick=function(){done("Programme validé et publié pour le client")};if(r)r.onclick=function(){done("Programme refusé")}}
bindDemoRefuse();
(function(){
var EX={"Squat":[["Quadriceps","Fessiers"],["Ischios","Abdos"]],"Presse à cuisses":[["Quadriceps"],["Fessiers","Ischios"]],"Fentes":[["Quadriceps","Fessiers"],["Ischios"]],"Soulevé de terre roumain":[["Ischios","Fessiers"],["Dos"]],"Développé couché":[["Pectoraux"],["Triceps","Épaules"]],"Développé incliné haltères":[["Pectoraux","Épaules"],["Triceps"]],"Développé militaire":[["Épaules"],["Triceps"]],"Élévations latérales":[["Épaules"],[]],"Tractions":[["Dos"],["Biceps"]],"Tirage vertical":[["Dos"],["Biceps"]],"Rowing barre":[["Dos"],["Biceps","Épaules"]],"Curl biceps":[["Biceps"],[]],"Extension triceps poulie":[["Triceps"],[]],"Gainage":[["Abdos"],[]],"Crunch":[["Abdos"],[]]};
var SP={Push:["Développé couché","Développé incliné haltères","Développé militaire","Élévations latérales","Extension triceps poulie"],Pull:["Tractions","Tirage vertical","Rowing barre","Curl biceps","Gainage"],Jambes:["Squat","Presse à cuisses","Fentes","Soulevé de terre roumain","Crunch"]};
var TY=["Push","Pull","Jambes"],BASE={Quadriceps:72,Ischios:72,Fessiers:72,Dos:72,Pectoraux:72,"Épaules":60,Triceps:60,Biceps:48,Abdos:36},NOW=new Date(),S=[],c=0,$=function(i){return document.getElementById(i)};
var KG={"Squat":80,"Presse à cuisses":140,"Fentes":24,"Soulevé de terre roumain":70,"Développé couché":60,"Développé incliné haltères":22,"Développé militaire":35,"Élévations latérales":8,"Tractions":5,"Tirage vertical":55,"Rowing barre":50,"Curl biceps":14,"Extension triceps poulie":25,"Gainage":10,"Crunch":20};
for(var d=1;d<=400;d++)if([1,3,4,6].indexOf(d%7)>-1){var t=TY[c++%3],dt=new Date(NOW);dt.setDate(dt.getDate()-d);dt.setHours(18,0,0,0);S.push({date:dt,t:t,ex:SP[t].map(function(e,i){var q=3+((d+i)%2),kg=Math.max(2.5,Math.round(KG[e]*(1-.22*d/400)/2.5)*2.5),k=[],r=[];for(var j=0;j<q;j++){k.push(kg);r.push(8+((d+i)%3)-(j==q-1?1:0))}return{n:e,s:q,k:k,r:r}})})}
var CATG={},ORDER=["Pectoraux","Dos","Épaules","Biceps","Triceps","Abdos","Quadriceps","Ischios","Fessiers"];
function nrm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}
var KW=[[/(souleve de terre|deadlift|rdl|roumain|good ?morning)/,["Ischios","Fessiers"],["Dos"]],[/(leg curl|curl (jambe|ischio|allonge|assis)|ischio|nordic)/,["Ischios"],["Fessiers"]],[/(leg extension|extension (des )?(jambe|quadri)|quadri)/,["Quadriceps"],[]],[/(squat|presse|leg press|hack|fente|lunge|bulgare|step ?up|chaise)/,["Quadriceps","Fessiers"],["Ischios"]],[/(hip thrust|pont|fessier|glute|abduct|kickback jambe)/,["Fessiers"],["Ischios"]],[/(dips|pompe|push.?up)/,["Pectoraux","Triceps"],["Épaules"]],[/(couche|bench|ecarte|pec|butterfly|chest|poitrine|incline|decline)/,["Pectoraux"],["Triceps","Épaules"]],[/(militaire|overhead|arnold|elevation|oiseau|face pull|epaule|shoulder|developpe assis)/,["Épaules"],["Triceps"]],[/(traction|pull.?up|chin|tirage|rowing|row\b|pull.?over|lat|dorsa|shrug|haussement|trapeze|dos)/,["Dos"],["Biceps"]],[/(triceps|barre au front|skull|extension (poulie|nuque)|kickback)/,["Triceps"],[]],[/(curl|biceps|marteau|hammer)/,["Biceps"],[]],[/(gainage|planche|plank|crunch|abdo|releve de jambes|russian|sit.?up|obliqu|roulette|ab wheel|mountain)/,["Abdos"],[]]];
var GRP=[[/pec/,["Pectoraux"],["Triceps","Épaules"]],[/dos/,["Dos"],["Biceps"]],[/epaule/,["Épaules"],["Triceps"]],[/biceps/,["Biceps"],[]],[/triceps/,["Triceps"],[]],[/bras/,["Biceps","Triceps"],[]],[/(abdo|gainage|core|tronc)/,["Abdos"],[]],[/quadri/,["Quadriceps"],["Fessiers"]],[/ischio/,["Ischios"],["Fessiers"]],[/fessier/,["Fessiers"],["Ischios"]],[/(jambe|cuisse)/,["Quadriceps","Fessiers"],["Ischios"]]];
function musc(n){if(EX[n])return EX[n];var s=nrm(n),i;for(i=0;i<KW.length;i++)if(KW[i][0].test(s))return[KW[i][1],KW[i][2]];var g=nrm(CATG[n]);if(g)for(i=0;i<GRP.length;i++)if(GRP[i][0].test(g))return[GRP[i][1],GRP[i][2]];return[[],[]]}
function wsets(s){var m={};s.ex.forEach(function(e){var x=musc(e.n),q=+e.s||0;x[0].forEach(function(k){m[k]=(m[k]||0)+q});x[1].forEach(function(k){m[k]=(m[k]||0)+q/2})});return m}
// Fatigue : chaque séance ajoute une fatigue proportionnelle au nombre de séries, qui se résorbe
// linéairement sur un temps de récupération propre au muscle (plus long si le volume est élevé).
function recState(now){var R={};ORDER.forEach(function(k){R[k]={k:k,f:0,h:0}});S.forEach(function(s){var h=Math.max(0,(now-s.date)/36e5);if(h>BASE.Quadriceps*1.5)return;var m=wsets(s);for(var k in m){if(!R[k]||!m[k])continue;var need=BASE[k]*Math.min(1.25,Math.max(.5,.5+m[k]/10)),left=need-h;if(left<=0)continue;R[k].f+=Math.min(100,12+m[k]*9)*left/need;R[k].h=Math.max(R[k].h,left)}});return ORDER.map(function(k){var g=R[k];g.pct=Math.max(0,Math.min(100,Math.round(100-g.f)));if(g.pct>=100)g.h=0;return g})}
function restTxt(h){if(h<=0)return"Prêt";if(h<20)return"Repos "+Math.max(1,Math.ceil(h))+" h";var j=Math.ceil(h/12)/2;return"Repos "+String(j).replace(".",",")+" j"}
var out;function drawRec(){out=recState(Date.now());var tired=out.some(function(g){return g.pct<100});if(tired)out.sort(function(a,b){return a.pct-b.pct||ORDER.indexOf(a.k)-ORDER.indexOf(b.k)});
$("rec").innerHTML=out.map(function(g){var col=g.pct<40?"#E5584C":g.pct<80?"#F2C14E":"var(--ok)",arc="M10 50 A40 40 0 0 1 90 50";return '<div class="gz" role="img" aria-label="'+g.k+' : récupération '+g.pct+' %, '+(g.h>0?restTxt(g.h).toLowerCase():"prêt")+'"><svg viewBox="0 0 100 58"><path d="'+arc+'" fill="none" stroke="var(--line)" stroke-width="9" stroke-linecap="round"/>'+(g.pct>0?'<path d="'+arc+'" fill="none" stroke="'+col+'" stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray="'+g.pct+' 200"/>':'')+'<text x="50" y="50" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor">'+g.pct+'%</text></svg><b>'+g.k+'</b><small>'+restTxt(g.h)+'</small></div>'}).join("")}
setInterval(function(){if(!document.hidden)drawRec()},300000);document.addEventListener("visibilitychange",function(){if(!document.hidden)drawRec()});
drawRec();
var pad=function(x){return String(x).padStart(2,"0")},kD=function(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())},mon=function(d){var x=new Date(d);x.setDate(x.getDate()-(x.getDay()+6)%7);return x},ago=function(i,u){var x=new Date(NOW);x.setDate(x.getDate()-i*u);return x};
var LB={j:"Jour",s:"Semaine",m:"Mois",a:"Année"},MO={
j:{n:14,key:kD,step:function(i){return ago(i,1)},lab:function(d){return d.getDate()},lng:function(d){return d.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}},
s:{n:12,key:function(d){return kD(mon(d))},step:function(i){return mon(ago(i,7))},lab:function(d){return d.getDate()+"/"+(d.getMonth()+1)},lng:function(d){return "Sem. du "+d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}},
m:{n:12,key:function(d){return d.getFullYear()+"-"+d.getMonth()},step:function(i){return new Date(NOW.getFullYear(),NOW.getMonth()-i,1)},lab:function(d){return "jfmamjjasond".charAt(d.getMonth())},lng:function(d){return d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}},
a:{n:2,key:function(d){return ""+d.getFullYear()},step:function(i){return new Date(NOW.getFullYear()-i,0,1)},lab:function(d){return d.getFullYear()},lng:function(d){return ""+d.getFullYear()}}},mode="s";
var lim=15;
function hist(){drawRec();var M=MO[mode],P=[],ix={};for(var i=M.n-1;i>=0;i--){var dd=M.step(i),p={d:dd,s:0,v:0};P.push(p);ix[M.key(dd)]=p}
S.forEach(function(s){var p=ix[M.key(s.date)];if(p){p.s++;p.v+=s.ex.reduce(function(a,e){return a+e.s},0)}});
var mx=Math.max.apply(null,P.map(function(p){return p.v}).concat(1)),sl=340/P.length,bw=Math.min(sl-6,44),ts=0,tv=0,st=Math.ceil(P.length/7),b="";
P.forEach(function(p,i){ts+=p.s;tv+=p.v;var h=p.v/mx*110,x=i*sl+(sl-bw)/2;b+='<rect x="'+x+'" y="'+(120-h)+'" width="'+bw+'" height="'+h+'" rx="4" fill="'+(i==P.length-1?'#FF8F55':'rgba(255,143,85,.35)')+'"/>';if(i%st==(P.length-1)%st)b+='<text x="'+(x+bw/2)+'" y="138" text-anchor="middle" font-size="11" fill="#B8A798">'+M.lab(p.d)+'</text>'});
$("hchart").innerHTML=b;$("hsum").textContent=ts+" séances · "+tv+" séries sur la période affichée";
var st0=new Date(P[0].d);st0.setHours(0,0,0,0);var rows=[];S.forEach(function(x,i){if(x.date>=st0)rows.push(i)});
$("hlist").innerHTML=rows.slice(0,lim).map(function(i){var x=S[i],n=x.ex.reduce(function(a,e){return a+e.s},0);return '<button class="row ses" data-i="'+i+'"><div>'+x.date.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})+'<br><span>'+esc(x.t)+' · '+n+' séries'+(x.fb?' · '+esc(x.fb):'')+'</span></div><span>'+Math.round(vol(x)).toLocaleString("fr-FR")+' kg ›</span></button>'}).join("")+(rows.length>lim?'<button class="btn" id="hmore" style="margin-top:12px">Afficher plus ('+(rows.length-lim)+')</button>':"")||'<div class="sub">Aucune séance sur cette période.</div>'}
$("hseg").innerHTML=Object.keys(LB).map(function(k){return '<button class="set'+(k==mode?' on':'')+'" data-k="'+k+'">'+LB[k]+'</button>'}).join("");
$("hseg").onclick=function(e){var k=e.target.dataset.k;if(!k)return;mode=k;lim=15;[].forEach.call($("hseg").children,function(x){x.classList.toggle("on",x.dataset.k==k)});hist()};hist();
var hd='<circle cx="60" cy="16" r="11" fill="#4A3B31"/>';
function drawMap(P1,Q1){var f=function(m){return P1[m]?"#FF8F55":Q1[m]?"rgba(255,143,85,.38)":"#4A3B31"},E=function(m,x,y,a,b){return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+a+'" ry="'+b+'" fill="'+f(m)+'"/>'},R=function(m,x,y,w,h){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+f(m)+'"/>'},N=function(x,y,w,h){return R("-",x,y,w,h)};
$("mmap").innerHTML='<g transform="translate(10,0)">'+hd+E("Épaules",36,44,9,9)+E("Épaules",84,44,9,9)+E("Pectoraux",50,57,11,9)+E("Pectoraux",70,57,11,9)+R("Biceps",24,56,9,26)+R("Biceps",87,56,9,26)+N(22,84,8,28)+N(90,84,8,28)+R("Abdos",48,68,24,36)+R("Quadriceps",40,108,15,52)+R("Quadriceps",65,108,15,52)+N(41,162,13,40)+N(66,162,13,40)+'</g><g transform="translate(130,0)">'+hd+R("Dos",44,46,32,46)+E("Épaules",36,44,9,9)+E("Épaules",84,44,9,9)+R("Triceps",24,56,9,26)+R("Triceps",87,56,9,26)+N(22,84,8,28)+N(90,84,8,28)+E("Fessiers",52,106,12,10)+E("Fessiers",68,106,12,10)+R("Ischios",40,118,15,42)+R("Ischios",65,118,15,42)+N(41,162,13,40)+N(66,162,13,40)+'</g><text x="70" y="220" text-anchor="middle" font-size="12" fill="#B8A798">Face</text><text x="190" y="220" text-anchor="middle" font-size="12" fill="#B8A798">Dos</text>'}
function vol(x){return x.ex.reduce(function(a,e){return a+e.k.reduce(function(b,k,j){return b+k*e.r[j]},0)},0)}
function mxk(e){return Math.max.apply(null,e.k)}
function fm(k){return String(k).replace(".",",")}
var cur={i:0,m:null};
function prog(){var se=S[cur.i],met=cur.m,pts=[],same=S.filter(function(x,i){return i>=cur.i&&x.t==se.t}).slice(0,12).reverse();
same.forEach(function(x){var v;if(met==null)v=vol(x);else{var e=x.ex.filter(function(y){return y.n==met})[0];if(!e)return;v=mxk(e)}pts.push({d:x.date,v:v})});
$("spc").innerHTML=[""].concat(se.ex.map(function(e){return e.n})).map(function(nm){return '<button class="set'+((nm||null)==met?' on':'')+'" data-m="'+esc(nm)+'">'+(nm?esc(nm):"Volume total")+'</button>'}).join("");
var n=pts.length,g=$("spg");
if(n<2){g.innerHTML='<text x="170" y="70" text-anchor="middle" font-size="13" fill="#B8A798">Pas encore assez de séances pour tracer une courbe.</text>';$("spn").textContent="";return}
var vs=pts.map(function(q){return q.v}),lo=Math.min.apply(null,vs),hi=Math.max.apply(null,vs),X=function(i){return 24+292*i/(n-1)},Y=function(v){return hi==lo?66:108-(v-lo)/(hi-lo)*84},pl=pts.map(function(q,i){return X(i).toFixed(1)+","+Y(q.v).toFixed(1)}).join(" "),dt=function(d){return d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})},ft=function(v){return (Math.round(v*10)/10).toLocaleString("fr-FR")+" kg"};
g.innerHTML='<polyline fill="none" stroke="#FF8F55" stroke-width="2.5" stroke-linejoin="round" points="'+pl+'"/>'+pts.map(function(q,i){return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(q.v).toFixed(1)+'" r="'+(i==n-1?5:3)+'" fill="'+(i==n-1?'#FF8F55':'#352A23')+'" stroke="#FF8F55" stroke-width="2"/>'}).join("")+'<text x="24" y="'+(Y(vs[0])-10)+'" font-size="11" fill="#B8A798">'+ft(vs[0])+'</text><text x="316" y="'+(Y(vs[n-1])-12)+'" text-anchor="end" font-size="11" fill="#F7EEE5">'+ft(vs[n-1])+'</text><text x="24" y="132" font-size="11" fill="#B8A798">'+dt(pts[0].d)+'</text><text x="316" y="132" text-anchor="end" font-size="11" fill="#B8A798">'+dt(pts[n-1].d)+'</text>';
var ch=Math.round((vs[n-1]/vs[0]-1)*100);$("spn").textContent=(ch>0?"+":"")+ch+" % depuis le "+dt(pts[0].d)+" · "+n+" séances comparées ("+se.t+")"}
$("spc").onclick=function(e){var b=e.target.closest(".set");if(!b)return;cur.m=b.dataset.m||null;prog()};
function showSum(se,title,sub,hid,idx){var nS=0,nR=0,V=0,P1={},Q1={};
se.ex.forEach(function(e){e.k.forEach(function(k,j){nS++;nR+=e.r[j];V+=k*e.r[j]});var mu=musc(e.n);mu[0].forEach(function(x){P1[x]=1});mu[1].forEach(function(x){Q1[x]=1})});
for(var k in P1)delete Q1[k];
cur.se=se;fbDraw();$("stitle").textContent=title;$("ssub").textContent=sub;
$("skp").innerHTML='<div><b>'+nS+'</b><span>séries</span></div><div><b>'+nR+'</b><span>répétitions</span></div><div><b>'+Math.round(V).toLocaleString("fr-FR")+'</b><span>kg soulevés</span></div>';
$("sres").innerHTML=se.ex.map(function(e){return '<div class="row"><div>'+esc(e.n)+'<br><span>'+e.k.map(function(k,j){return fm(k)+" kg × "+e.r[j]}).join(" · ")+'</span></div></div>'}).join("");
drawMap(P1,Q1);$("mdet").innerHTML='<div class="row">Principal<span>'+(Object.keys(P1).join(", ")||"non renseigné")+'</span></div><div class="row">Secondaire<span>'+(Object.keys(Q1).join(", ")||"aucun")+'</span></div>';
$("sprog").hidden=hid;$("sact").hidden=hid;cur.edit=false;$("sedit").textContent="Corriger les séries";$("sdel").textContent="Supprimer la séance";if(!hid){cur.i=idx;cur.m=null;prog()}
$("sum").classList.add("on");$("sum").scrollTop=0}
function oses(i){var se=S[i];showSum(se,"Séance du "+se.date.toLocaleDateString("fr-FR",{day:"numeric",month:"long"}),se.t+" · résumé",false,i)}
$("hlist").onclick=function(e){var b=e.target.closest("button");if(!b)return;if(b.id=="hmore"){lim+=15;hist();return}if(b.dataset.i!=null)oses(+b.dataset.i)};
function finish(btn,host,sub){var t0=btn.dataset.t||(btn.dataset.t=btn.textContent),se={date:new Date(),t:sub,ex:[]};
[].forEach.call(host.children,function(e){var o={n:e.querySelector(".n").textContent,s:0,k:[],r:[]};
[].forEach.call(e.querySelectorAll(".sr"),function(row){if(!row.querySelector(".ck").classList.contains("on"))return;o.k.push(+row.querySelector(".kg").value||0);o.r.push(+row.querySelector(".rp").value||0);o.s++});
if(o.s)se.ex.push(o)});
if(!se.ex.length){btn.textContent="Valide au moins une série avec ✓";setTimeout(function(){btn.textContent=t0},2200);return}
if(!btn.dataset.saved){btn.dataset.saved="1";S.unshift(se);hist();save(se);draftClear(host==ex?"d":"c")}
showSum(se,"Séance terminée",sub+" · résumé",true);
btn.textContent="Séance enregistrée ✓";btn.style.background="var(--ok)"}
$("fin").onclick=function(){finish(this,ex,"Haut du corps")};
$("sclose").onclick=function(){$("sum").classList.remove("on")};
var CL=[{n:"Alex M.",f:0},{n:"Camille R.",f:0},{n:"Julien D.",f:0}];
function prem(on){$("prem").classList.toggle("locked",!on);document.querySelector("#premc .tag").textContent=on?"Premium offert par ton coach · Proposition de l’IA":"Proposition de l'IA"}
function acc(){var k=CL.filter(function(x){return x.f}).length;$("acc").innerHTML=CL.map(function(x,i){return '<div class="row"><div>'+x.n+'<br><span>'+(x.f?"Tous les avantages, sans paiement":"Accès standard")+'</span></div><button class="sw'+(x.f?' on':'')+'" data-i="'+i+'" aria-label="Accès offert pour '+x.n+'"></button></div>'}).join("")}
$("acc").onclick=function(e){var b=e.target.closest(".sw");if(!b)return;var i=+b.dataset.i;CL[i].f=CL[i].f?0:1;if(i==0)prem(!!CL[0].f);acc()};acc();
$("meals").onclick=function(e){var b=e.target.closest("button.rm");if(!b)return;var at=+b.dataset.i,m=M.splice(at,1)[0];nut();if(LIVE&&m)Promise.resolve(m.p).then(function(){return m.id&&SB.from("journal_repas").delete().eq("id",m.id)}).then(function(r){if(r&&r.error)throw r.error}).catch(function(){M.splice(Math.min(at,M.length),0,m);nut();toast("Suppression impossible : l’aliment a été remis.")})};
function sel(q){return [].map.call(document.querySelectorAll('.chs[data-q="'+q+'"] .on'),function(b){return b.textContent})}
document.querySelectorAll(".chs").forEach(function(g){g.onclick=function(e){var b=e.target.closest(".set");if(!b)return;if(!g.dataset.multi)[].forEach.call(g.children,function(x){x.classList.remove("on")});b.classList.toggle("on")}});
$("qs").onclick=function(){var n=sel("s")[0],o=sel("o")[0],m=sel("m"),r=$("qn").value.trim();
if(!n||!o){$("qerr").textContent="Choisis le nombre de séances et ton objectif.";return}
var rec=n+" séances par semaine · objectif : "+o.toLowerCase()+" · à renforcer : "+(m.length?m.join(", ").toLowerCase():"aucune demande")+(r?" · remarque : "+r:"");
$("qc").innerHTML='<div class="tag">Réponses envoyées</div><div style="font:600 18px system-ui,sans-serif;margin:6px 0">Ton prochain programme se prépare</div><div class="sub" id="qrec"></div><p class="sub" style="margin-top:10px">Il apparaîtra ici après validation de ton coach.</p>';
$("qrec").textContent=rec;sendQ(n,o,m,r);var p=!LIVE&&document.querySelector("#prop .sub");if(p)p.textContent="Bilan de "+U.name+" : "+rec+". Programme de 4 semaines proposé en conséquence."};
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

$("dl").innerHTML=Object.keys(EX).map(function(k){return '<option value="'+k+'">'}).join("");
fillCat(Object.keys(EX).map(function(n){return{nom:n,g:"Exercices (démo)"}}));
var CX=[];
function rl(){$("clist").innerHTML=CX.map(function(x,i){return '<div class="row">'+esc(x.n)+'<span>'+x.s+' séries · <button class="rm" data-i="'+i+'" aria-label="Retirer '+esc(x.n)+'">Retirer</button></span></div>'}).join("")}
$("ca").onclick=function(){var n=$("ce").value.trim(),q=Math.max(1,Math.min(8,+$("cm").value||3));if(!n)return;CX.push({n:n,s:q});$("ce").value="";$("cerr").textContent="";rl()};
$("clist").onclick=function(e){var i=e.target.dataset.i;if(i==null)return;CX.splice(+i,1);rl()};
$("cgo").onclick=function(){if(!CX.length){$("cerr").textContent="Ajoute au moins un exercice.";return}
$("ctitle").textContent=$("cn").value.trim()||"Ma séance";
$("cex").innerHTML=CX.map(function(x){var h="";for(var i=1;i<=x.s;i++)h+='<div class="sr"><span class="sn">'+i+'</span><input class="kg" type="number" inputmode="decimal" placeholder="kg" aria-label="Charge série '+i+'"><input class="rp" type="number" inputmode="numeric" placeholder="reps" aria-label="Répétitions série '+i+'"><button class="set ck" aria-label="Valider la série '+i+'">✓</button></div>';return '<div class="ex"><div class="h"><span class="n">'+esc(x.n)+'</span><span class="m">'+x.s+' séries</span></div>'+(lt(x.n)?'<div class="m" style="color:var(--pri)">'+esc(lt(x.n))+'</div>':'')+'<div class="sh"><span></span><span>kg</span><span>reps</span><span></span></div>'+h+'</div>'}).join("");
addSaAll($("cex"));$("cfin").dataset.saved="";$("cfin").textContent="Terminer ma séance";$("cfin").style.background="";$("cform").hidden=true;$("clive").hidden=false};
$("cex").onclick=function(e){var b=e.target.closest(".ck");if(!b)return;var rp=b.parentNode.querySelector(".rp");if(!b.classList.contains("on")&&!rp.value){rp.focus();return}b.classList.toggle("on");var nx=b.parentNode.nextElementSibling;if(b.classList.contains("on")&&nx&&nx.classList.contains("sr")){var nk=nx.querySelector(".kg"),nr=nx.querySelector(".rp");if(!nk.value)nk.value=b.parentNode.querySelector(".kg").value;if(!nr.value)nr.value=rp.value}};
$("cedit").onclick=function(){$("clive").hidden=true;$("cform").hidden=false};
$("cfin").onclick=function(){finish(this,$("cex"),$("ctitle").textContent)};
function lt(n){for(var i=0;i<S.length;i++){var e=S[i].ex.filter(function(y){return y.n==n})[0];if(e){var same=e.k.every(function(k){return k==e.k[0]});return "Dernière fois : "+(same?fm(e.k[0])+" kg × "+e.r.join(", "):e.k.map(function(k,j){return fm(k)+" × "+e.r[j]}).join(" · "))}}return ""}
[].forEach.call(ex.children,function(e){var d=lt(e.querySelector(".n").textContent);if(d){var m=document.createElement("div");m.className="m";m.style.color="var(--pri)";m.textContent=d;e.querySelector(".sh").before(m)}});
function editRes(){var se=S[cur.i];$("sres").innerHTML=se.ex.map(function(e){return '<div class="ex"><div class="n">'+esc(e.n)+'</div><div class="sh"><span></span><span>kg</span><span>reps</span><span></span></div>'+e.k.map(function(k,j){return '<div class="sr"><span class="sn">'+(j+1)+'</span><input class="kg" type="number" inputmode="decimal" value="'+k+'"><input class="rp" type="number" inputmode="numeric" value="'+e.r[j]+'"><button class="set rms" aria-label="Retirer la série">✕</button></div>'}).join("")+'</div>'}).join("")}
$("sres").onclick=function(e){var r=e.target.closest(".rms");if(r)r.closest(".sr").remove()};
$("sedit").onclick=function(){if(!cur.edit){cur.edit=true;this.textContent="Enregistrer les corrections";editRes();return}
var old=S[cur.i].ex,out=[];[].forEach.call($("sres").children,function(blk,a){var k=[],r=[];[].forEach.call(blk.querySelectorAll(".sr"),function(row){var kg=+row.querySelector(".kg").value||0,rp=+row.querySelector(".rp").value||0;if(rp>0){k.push(kg);r.push(rp)}});if(k.length)out.push({n:old[a].n,s:k.length,k:k,r:r})});
if(!out.length){remove(S.splice(cur.i,1)[0]);hist();$("sum").classList.remove("on");return}
S[cur.i].ex=out;hist();save(S[cur.i]);oses(cur.i)};
var arm=0;$("sdel").onclick=function(){var b=this;if(!arm){arm=1;b.textContent="Confirmer la suppression";setTimeout(function(){arm=0;b.textContent="Supprimer la séance"},3000);return}arm=0;remove(S.splice(cur.i,1)[0]);hist();$("sum").classList.remove("on")};
var U={name:"Alex M.",email:""},REST=90,rt=null,left=0;
function ini(n){var w=n.trim().split(/[\s.\-_]+/).filter(Boolean);return(w.length>1?w[0][0]+w[1][0]:(w[0]||"?").slice(0,2)).toUpperCase()}
function who(){var i=ini(U.name);$("av").textContent=i;$("avb").textContent=i;$("sn").textContent=U.name;$("se").textContent=U.email||"E-mail non renseigné";$("un").value=U.name;$("ue").value=U.email;$("hi").textContent="Bonjour, "+U.name.split(" ")[0]}
function abo(){var lk=$("prem").classList.contains("locked"),off=LIVE?PF.acces_offert:CL[0].f,b=$("uabb");$("uab").textContent=lk?"Gratuit":off?"Premium offert":"Premium · 5 € / mois";b.textContent=lk?(LIVE?"Passer en Premium · 5 € / mois, sans engagement":"Passer en Premium · 5 € / mois, sans engagement"):"Résilier mon abonnement (sans frais)";b.hidden=!lk&&(LIVE||!!off);b.dataset.c=""}
$("av").onclick=function(){who();abo();$("set").classList.add("on");$("set").scrollTop=0;$("setx").focus();if(LIVE&&PF.stripe_customer_id)syncPremium().then(abo)};
$("setx").onclick=function(){$("set").classList.remove("on")};
$("usv").onclick=function(){var n=$("un").value.trim(),b=this;if(!n){$("un").focus();return}U.name=n;U.email=$("ue").value.trim();who();b.textContent="Enregistré ✓";setTimeout(function(){b.textContent="Enregistrer"},1800)};
$("urc").onclick=function(e){var b=e.target.closest(".set");if(!b)return;REST=+b.dataset.s;[].forEach.call(this.children,function(x){x.classList.toggle("on",x==b)})};
$("urm").onclick=function(){this.classList.toggle("on")};
$("uabb").onclick=function(){var b=this;if($("prem").classList.contains("locked")){$("set").classList.remove("on");$("sub").click();return}
if(!b.dataset.c){b.dataset.c="1";b.textContent="Confirmer la résiliation";setTimeout(function(){if(b.dataset.c)abo()},3000);return}prem(false);abo()};
function signOut(msg){$("set").classList.remove("on");$("sum").classList.remove("on");$("lmsg").textContent=msg;$("lp").value="";$("lerr").textContent="";$("login").classList.add("on");$("login").scrollTop=0;stopRest()}
$("ulo").onclick=function(){signOut("Tu es déconnecté. À bientôt !")};
$("udel").onclick=function(){var b=this;if(!b.dataset.c){b.dataset.c="1";b.textContent="Confirmer la suppression du compte";setTimeout(function(){b.dataset.c="";b.textContent="Supprimer mon compte"},3000);return}b.dataset.c="";b.textContent="Supprimer mon compte";signOut("Ton compte a été supprimé.")};
function go(){var em=$("le").value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){$("lerr").textContent="Entre une adresse e-mail valide.";return}if(!$("lp").value){$("lerr").textContent="Entre ton mot de passe.";return}
U.email=em;who();$("login").classList.remove("on");document.querySelector('.nav button[data-v="c"]').click();scrollTo(0,0)}
$("lgo").onclick=go;$("lp").onkeydown=function(e){if(e.key=="Enter")go()};
function drawRest(){$("rtx").textContent="Repos "+Math.floor(left/60)+":"+pad(left%60)}
function stopRest(){clearInterval(rt);$("rest").hidden=true;document.body.classList.remove("rt")}
function startRest(){clearInterval(rt);left=REST;drawRest();$("rest").hidden=false;document.body.classList.add("rt");
rt=setInterval(function(){left--;if(left<=0){clearInterval(rt);$("rtx").textContent="Repos terminé";if(navigator.vibrate)navigator.vibrate(200);setTimeout(stopRest,3500);return}drawRest()},1000)}
$("r15").onclick=function(){if(left>0){left+=15;drawRest()}};$("rsk").onclick=stopRest;
$("ex").onclick=$("cex").onclick;
document.addEventListener("click",function(e){var b=e.target.closest(".ck");if(b&&b.classList.contains("on")&&(b.closest("#ex")||b.closest("#cex")))startRest()});
function renum(x){var r=x.querySelectorAll(".sr");[].forEach.call(r,function(row,i){row.querySelector(".sn").textContent=i+1;row.querySelector(".kg").setAttribute("aria-label","Charge série "+(i+1));row.querySelector(".rp").setAttribute("aria-label","Répétitions série "+(i+1));row.querySelector(".ck").setAttribute("aria-label","Valider la série "+(i+1))});x.querySelector(".h .m").textContent=r.length+" séries"}
function addSaAll(host){[].forEach.call(host.children,function(e){var d=document.createElement("div");d.className="sa";d.innerHTML='<button class="rm" data-a="+">+ Série</button><button class="rm" data-a="-">− Série</button>';e.appendChild(d)})}
document.addEventListener("click",function(e){var b=e.target.closest(".sa button");if(!b)return;var x=b.closest(".ex"),r=x.querySelectorAll(".sr"),l=r[r.length-1];
if(b.dataset.a=="+"){var c=l.cloneNode(true);c.querySelector(".ck").classList.remove("on");l.after(c)}else if(r.length>1)l.remove();renum(x)});
addSaAll(ex);
function fbDraw(){var se=cur.se||{};[].forEach.call($("fbc").children,function(b){b.classList.toggle("on",b.dataset.f==se.fb)});$("fbn").value=se.note||""}
$("fbc").onclick=function(e){var b=e.target.closest(".set");if(!b||!cur.se)return;cur.se.fb=cur.se.fb==b.dataset.f?"":b.dataset.f;fbDraw();hist();save(cur.se)};
$("fbn").oninput=function(){if(cur.se){cur.se.note=this.value;save(cur.se,800)}};
who();
var CFG=window.REPW_SUPABASE_CONFIG;
var RECOV=/type=recovery/.test(location.hash);
var PRS={},SB=window.supabase?window.supabase.createClient(CFG.url,CFG.key):null,LIVE=!!SB,PF={},UID=null,sign=false;
var CASSANDRE_READ_ONLY=CFG.cassandreReadOnly===true;
if(CASSANDRE_READ_ONLY){var notice=$("cassandreReadOnlyNotice");if(notice)notice.hidden=false;var msg=$("cassandreMessage"),send=$("cassandreSend");if(msg)msg.placeholder="Où en sont mes missions ?";if(send)send.textContent="Consulter le statut";["cassandreAgents","cassandreReports","cassandreApprovals","cassandreWhatsapp","cassandreWhatsAppHistory"].forEach(function(id){var el=$(id);if(!el)return;el.hidden=true;var heading=el.previousElementSibling;if(heading&&heading.classList.contains("lab"))heading.hidden=true});var reportHour=$("cassandreReportHour"),reportPanel=reportHour&&reportHour.closest(".panel");if(reportPanel){reportPanel.hidden=true;var reportHeading=reportPanel.previousElementSibling;if(reportHeading&&reportHeading.classList.contains("lab"))reportHeading.hidden=true}}
function toast(m){var t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(function(){t.hidden=true},3500)}
window.toast=toast;
function payload(se){return{p_seance_id:se.id||null,p_type:se.t,p_effectue_le:se.date.toISOString(),p_ressenti:se.fb||"",p_note:se.note||"",p_exercices:se.ex.map(function(e){return{n:e.n,k:e.k,r:e.r}})}}
function save(se,d){if(!LIVE||!se)return;if(!se.lid)se.lid=Date.now()+"-"+Math.random().toString(36).slice(2,8);clearTimeout(se._t);se._t=setTimeout(function(){var pl=payload(se);pend(se.lid,pl);se._p=(se._p||Promise.resolve()).then(function(){pl=payload(se);return SB.rpc("enregistrer_seance",pl)}).then(function(r){if(r.error)throw r.error;se.id=r.data;pend(se.lid,null)}).catch(function(){pend(se.lid,payload(se));toast(navigator.onLine===false?"Hors ligne : séance gardée sur ton téléphone, elle sera envoyée au retour du réseau.":"Enregistrement impossible : séance gardée sur ton téléphone, nouvel essai automatique.")})},d||0)}
/* File d’attente locale des séances non confirmées par le serveur */
var PK="rw_pending_v1";
function pendAll(){try{return JSON.parse(localStorage.getItem(PK)||"[]")}catch(e){return[]}}
function pendPut(a){try{if(a.length)localStorage.setItem(PK,JSON.stringify(a));else localStorage.removeItem(PK)}catch(e){}}
function pend(lid,pl){var a=pendAll().filter(function(x){return x.lid!=lid});if(pl)a.push({lid:lid,uid:UID,pl:pl});pendPut(a)}
var flushing=null;
function flushPending(){if(!LIVE||!UID)return Promise.resolve(0);if(flushing)return flushing;var mine=pendAll().filter(function(x){return x.uid==UID}),sent=0;
flushing=mine.reduce(function(pr,x){return pr.then(function(){return SB.rpc("enregistrer_seance",x.pl).then(function(r){if(!r.error){pend(x.lid,null);sent++}})})},Promise.resolve()).catch(function(){}).then(function(){flushing=null;if(sent)toast(sent>1?sent+" séances en attente ont été envoyées ✓":"Ta séance en attente a été envoyée ✓");return sent});return flushing}
function remove(se){if(!LIVE||!se)return;clearTimeout(se._t);(se._p||Promise.resolve()).then(function(){return se.id&&SB.from("seances").delete().eq("id",se.id)}).then(function(r){if(r&&r.error)throw r.error}).catch(function(){if(S.indexOf(se)<0){S.push(se);S.sort(function(a,b){return b.date-a.date});hist()}toast("Suppression impossible : la séance a été remise.")})}
function sendQ(n,o,m,r){if(!LIVE)return;SB.from("questionnaires_programme").insert({client_id:UID,seances_par_semaine:+n,objectif:o,muscles:m,remarque:r||null}).select("id").single().then(function(x){if(x.error){toast("Réponses non enregistrées : réessaie.");return}genProg({questionnaire_id:x.data.id},PF.role=="coach")})}
// Demande à l'IA une nouvelle proposition (fonction d'arrière-plan) puis, côté coach, guette son arrivée.
var GPT=null;function genProg(b,watch){return SB.auth.getSession().then(function(r){var tk=r.data&&r.data.session&&r.data.session.access_token;if(!tk)throw 0;
return fetch("/.netlify/functions/generer-programme-background",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify(b||{})})}).then(function(x){if(!x.ok&&x.status!=202)throw 0;if(watch)watchProg()}).catch(function(){toast("L’IA n’a pas pu être sollicitée, réessaie.")})}
function watchProg(){var n=0,before=Object.keys(PRS).join();clearInterval(GPT);GPT=setInterval(function(){if(++n>24){clearInterval(GPT);GPT=null;loadCoach();toast("La proposition tarde : actualise dans un instant.");return}loadCoach().catch(function(){}).then(function(){if(Object.keys(PRS).length&&Object.keys(PRS).join()!=before){clearInterval(GPT);GPT=null;toast("Nouvelle proposition de l’IA prête ✓")}})},5000);loadCoach()}
function toS(w){return{id:w.id,date:new Date(w.effectue_le),t:w.type||"Séance",fb:w.ressenti||"",note:w.note||"",ex:(w.journal_seances||[]).map(function(j){var k=(j.charges_kg||[]).map(Number),r=(j.reps||[]).map(Number);if(!k.length&&j.series_realisees){k=Array(j.series_realisees).fill(Number(j.charge_kg)||0);r=String(j.repetitions_realisees||"").split(",").map(Number)}return{n:j.nom_exercice,s:k.length,k:k,r:r}}).filter(function(e){return e.k.length&&e.k.length==e.r.length})}}
var AL={};

var PROG=null,DAY="",DAYS=[],hsv=false,WT=[],CLS=[],PP=null,ht=null;
function today(){return kD(new Date())}
function momentNow(){var h=new Date().getHours();return h<10?"petit_dejeuner":h<15?"dejeuner":h<18?"collation":"diner"}
function labs(t,root){return [].filter.call(document.querySelectorAll((root||"#c")+" .lab"),function(l){return l.textContent.indexOf(t)==0})[0]}
function showSeance(on){var l=labs("Séance du jour");l.style.display=on?"":"none";$("ex").style.display=on?"":"none";$("fin").style.display=on?"":"none";$("dayc").style.display=on?"":"none"}
function buildDay(label){DAY=label;var list=PROG.ex.filter(function(e){return e.libelle_jour==label}).sort(function(a,b){return a.position-b.position});ex.innerHTML="";
list.forEach(function(d){var e=document.createElement("div");e.className="ex";var h="",kg=Number(d.charge_kg)||"",rp=parseInt(d.repetitions)||"",ns=Math.min(20,parseInt(d.series)||0),rs=parseInt(d.repos_secondes)||0;
for(var i=1;i<=ns;i++)h+='<div class="sr"><span class="sn">'+i+'</span><input class="kg" type="number" inputmode="decimal" value="'+kg+'" aria-label="Charge série '+i+'"><input class="rp" type="number" inputmode="numeric" value="'+rp+'" aria-label="Répétitions série '+i+'"><button class="set ck" aria-label="Valider la série '+i+'">✓</button></div>';
e.innerHTML='<div class="h"><span class="n">'+esc(d.nom_exercice)+'</span><span class="m">'+ns+' séries</span></div><div class="m">Objectif : '+esc(d.repetitions)+' reps'+(rs?' · repos '+rs+' s':'')+'</div>'+(d.notes?'<div class="m">'+esc(d.notes)+'</div>':'')+'<div class="sh"><span></span><span>kg</span><span>reps</span><span></span></div>'+h;ex.appendChild(e)});
addSaAll(ex);[].forEach.call(ex.children,function(e){var t=lt(e.querySelector(".n").textContent);if(t){var m=document.createElement("div");m.className="m";m.style.color="var(--pri)";m.textContent=t;e.querySelector(".sh").before(m)}});
labs("Séance du jour").textContent="Séance du jour · "+label;var f=$("fin");f.textContent="Terminer la séance";f.style.background="";f.dataset.saved="";f.dataset.t="";
$("dayc").innerHTML=DAYS.map(function(d){return '<button class="set'+(d==label?' on':'')+'" data-d="'+esc(d)+'">'+esc(d)+'</button>'}).join("")}
function loadProg(){return SB.from("programmes").select("id,titre,version,resume_ia,message_client,exercices_programme(nom_exercice,libelle_jour,position,series,repetitions,charge_kg,repos_secondes,notes)").eq("client_id",UID).eq("statut","publie").order("publie_le",{ascending:false}).limit(1).then(function(r){
var p=r.data&&r.data[0];if(r.error||!p||!p.exercices_programme||!p.exercices_programme.length){PROG=null;gateSeance();return}
PROG={id:p.id,ex:p.exercices_programme};var seen={};DAYS=[];PROG.ex.slice().sort(function(a,b){return a.position-b.position}).forEach(function(e){if(!seen[e.libelle_jour]){seen[e.libelle_jour]=1;DAYS.push(e.libelle_jour)}});
var i=DAYS.indexOf(S.length?S[0].t:"");buildDay(DAYS[(i+1)%DAYS.length]);
var sb=document.querySelector("#c .sub");sb.style.display="";sb.textContent=p.titre+" · v"+p.version;
var pc=$("premc");[].forEach.call(pc.querySelectorAll(":scope>.row"),function(x){x.remove()});pc.children[1].textContent=p.titre+" · v"+p.version;
pc.children[1].insertAdjacentHTML("afterend",PROG.ex.filter(function(e){return e.libelle_jour==DAY}).map(function(e){return '<div class="row">'+esc(e.nom_exercice)+'<span>'+(parseInt(e.series)||0)+' × '+esc(e.repetitions)+(Number(e.charge_kg)?' · '+fm(Number(e.charge_kg))+' kg':'')+'</span></div>'}).join(""));
pc.querySelector(":scope>p.sub").textContent=p.resume_ia||p.message_client||"Programme à jour, validé par ton coach.";gateSeance();draftRestore("d")})}
/* Séance du jour : visible directement avec l’abonnement Programme IA, sinon seulement après une première séance perso enregistrée */
function hasPrem(){return !$("prem").classList.contains("locked")}
function ownSeance(){return S.some(function(se){return DAYS.indexOf(se.t)<0})}
function gateSeance(){if(!LIVE||!$("dayc")||!$("noprog"))return;var ok=!!UID&&(hasPrem()||ownSeance());if(!PROG){showSeance(false);$("noprog").hidden=!ok;return}$("noprog").hidden=true;showSeance(ok)}
function fetchWeightRows(from,all){return SB.from("bilans").select("date_bilan,poids_kg,cree_le").eq("client_id",UID).not("poids_kg","is",null).order("date_bilan",{ascending:true}).order("cree_le",{ascending:true}).range(from,from+999).then(function(r){if(r.error)throw r.error;var rows=r.data||[];all=all.concat(rows);return rows.length===1000?fetchWeightRows(from+1000,all):all})}
var WH_PERIOD="semaine";
function loadWeight(){return Promise.all([fetchWeightRows(0,[]),SB.from("objectifs").select("poids_cible_kg").eq("client_id",UID).eq("actif",true).order("cree_le",{ascending:false}).limit(1)]).then(function(a){
var all=a[0],b=all.slice(-24),t=a[1].data&&a[1].data[0]?Number(a[1].data[0].poids_cible_kg):0;WT=all;var n=b.length,cur=n?Number(b[n-1].poids_kg):null,d=n>1?Math.round((cur-Number(b[0].poids_kg))*10)/10:null;
PP.querySelector(".kpis").innerHTML='<div><b>'+(cur!=null?fm(cur):"—")+'</b><span>kg actuel</span></div><div><b>'+(d!=null?(d>0?"+":d<0?"−":"")+fm(Math.abs(d)):"—")+'</b><span>depuis le début</span></div><div><b>'+(t?fm(t):"—")+'</b><span>kg objectif</span></div>';
var vs=b.map(function(x){return Number(x.poids_kg)}),lo=Math.min.apply(null,vs),hi=Math.max.apply(null,vs);
PP.querySelector("polyline").setAttribute("points",n>1?vs.map(function(v,i){return (300*i/(n-1)).toFixed(1)+","+(64-(v-lo)/((hi-lo)||1)*56).toFixed(1)}).join(" "):"");
renderWeightHistory();if(cur!=null){$("gw").value=cur;goals()}})}
function weightDate(row){var m=String(row.date_bilan||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(row.date_bilan)}
function weightDateLabel(d,period){return d.toLocaleDateString("fr-FR",period==="annee"?{month:"short",year:"2-digit"}:period==="jour"?{weekday:"short",day:"numeric"}:{day:"numeric",month:"short"})}
function renderWeightHistory(){var svg=$("whChart"),empty=$("whEmpty"),content=$("whContent"),copy=$("whEmptyCopy"),title=$("whEmptyTitle"),range=$("whRange"),tip=$("whTooltip");if(!svg||!empty||!content||!Array.isArray(WT))return;
var end=new Date();end.setHours(23,59,59,999);var start=new Date(end);if(WH_PERIOD==="jour"){start.setDate(start.getDate()-13);start.setHours(0,0,0,0);range.textContent="14 derniers jours · chaque point est une pesée"}else if(WH_PERIOD==="semaine"){var wd=(start.getDay()+6)%7;start.setDate(start.getDate()-wd-11*7);start.setHours(0,0,0,0);range.textContent="12 dernières semaines · chaque point est une pesée"}else{start=new Date(end.getFullYear(),end.getMonth()-11,1);start.setHours(0,0,0,0);range.textContent="12 derniers mois · chaque point est une pesée"}
var rows=WT.map(function(row){return{row:row,date:weightDate(row),value:Number(row.poids_kg)}}).filter(function(p){return !isNaN(p.date.getTime())&&isFinite(p.value)&&p.value>0}).sort(function(a,b){return a.date-b.date||String(a.row.cree_le||"").localeCompare(String(b.row.cree_le||""))});var points=rows.filter(function(p){return p.date>=start&&p.date<=end});var uniqueOutside=WT.length===1&&points.length===0;if(uniqueOutside)points=rows;
if(!points.length){content.hidden=true;empty.hidden=false;title.textContent=WT.length?"Aucune pesée sur cette période":"Pas encore de pesée";copy.textContent=WT.length?"Tes mesures existent, mais aucune ne tombe dans la période choisie. Essaie une autre période ou ajoute une mesure dans Entraînement.":"Ajoute ta première mesure depuis la page Entraînement : elle apparaîtra ici automatiquement.";return}
empty.hidden=true;content.hidden=false;var vals=points.map(function(p){return p.value}),mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);if(mx===mn){mn-=1;mx+=1}else{var pad=(mx-mn)*.16;mn-=pad;mx+=pad}
var left=42,right=332,top=12,bottom=94,span=end.getTime()-start.getTime(),xAt=function(d){return span>0?left+Math.max(0,Math.min(1,(d.getTime()-start.getTime())/span))*(right-left):(left+right)/2},yAt=function(v){return top+(mx-v)/(mx-mn)*(bottom-top)};var parts=[];
for(var gi=0;gi<3;gi++){var gy=top+(bottom-top)*gi/2,gv=mx-(mx-mn)*gi/2;parts.push('<line x1="'+left+'" y1="'+gy.toFixed(1)+'" x2="'+right+'" y2="'+gy.toFixed(1)+'" stroke="var(--line)" stroke-width="1"/><text x="2" y="'+(gy+4).toFixed(1)+'" font-size="10" fill="var(--mut)">'+fm(gv)+'</text>')}
for(var ti=0;ti<4;ti++){var td=new Date(start.getTime()+span*ti/3),tx=left+(right-left)*ti/3;parts.push('<text x="'+tx.toFixed(1)+'" y="116" text-anchor="'+(ti===0?'start':ti===3?'end':'middle')+'" font-size="10" fill="var(--mut)">'+weightDateLabel(td,WH_PERIOD)+'</text>')}
var coords=points.map(function(p){return{x:xAt(p.date),y:yAt(p.value)}});if(points.length>1)parts.push('<polyline points="'+coords.map(function(p){return p.x.toFixed(1)+","+p.y.toFixed(1)}).join(" ")+'" fill="none" stroke="var(--pri)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>');
coords.forEach(function(p,i){var d=points[i].date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),label=fm(points[i].value)+" kg · "+d;parts.push('<circle class="wh-point" data-wi="'+i+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(i===coords.length-1?5:4)+'" fill="var(--pri)" stroke="var(--card)" stroke-width="2" tabindex="0" role="button" aria-label="'+label+'"><title>'+label+'</title></circle>')});svg.innerHTML=parts.join("");svg.setAttribute("aria-label",points.length+" pesée"+(points.length>1?"s":"")+" affichée"+(points.length>1?"s":""));
function showWeight(i){var p=points[i];tip.textContent=fm(p.value)+" kg · "+p.date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+(uniqueOutside?" · mesure unique":"")}
svg.querySelectorAll(".wh-point").forEach(function(dot){var show=function(){showWeight(+dot.dataset.wi)};dot.addEventListener("focus",show);dot.addEventListener("mouseenter",show);dot.addEventListener("click",show);dot.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();show()}})});showWeight(points.length-1)}
$("whSeg").addEventListener("click",function(e){var b=e.target.closest("button[data-wp]");if(!b)return;WH_PERIOD=b.dataset.wp;[].forEach.call(this.querySelectorAll("button[data-wp]"),function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on?"true":"false")});renderWeightHistory()});
$("whAdd").onclick=function(){var b=document.querySelector('.nav button[data-v="c"]');if(b)b.click();setTimeout(function(){var input=$("pw");if(input){input.scrollIntoView({behavior:"smooth",block:"center"});input.focus()}},120)};
renderWeightHistory();
function loadNutri(){var d=today();return Promise.all([SB.from("aliments").select("id,nom,kcal_100g,proteines_100g,glucides_100g,lipides_100g,fibres_100g").order("nom").limit(500),SB.from("journal_repas").select("id,nom,grammes,kcal,proteines_g,glucides_g,lipides_g,fibres_g").eq("client_id",UID).eq("date_repas",d).order("cree_le"),SB.from("journal_hydratation").select("verres").eq("client_id",UID).eq("date_jour",d)]).then(function(a){
if(a[0].data&&a[0].data.length){Object.keys(F).forEach(function(k){delete F[k]});AL={};fs.innerHTML='<option value="">Choisir un aliment</option>';a[0].data.forEach(function(x){F[x.nom]=[+x.kcal_100g,+x.proteines_100g,+x.glucides_100g,+x.lipides_100g,+x.fibres_100g];AL[x.nom]=x.id;var o=document.createElement("option");o.value=x.nom;o.textContent=x.nom;fs.appendChild(o)})}
M.length=0;(a[1].data||[]).forEach(function(x){var m=[x.nom+" · "+Math.round(x.grammes)+" g",Math.round(x.kcal),+x.proteines_g,+x.glucides_g,+x.lipides_g,+x.fibres_g];m.id=x.id;M.push(m)});nut();
H=a[2].data&&a[2].data[0]?a[2].data[0].verres:0;HB=Math.floor(H/4);hyd();hsv=true})}
function hsave(){clearTimeout(ht);ht=setTimeout(function(){SB.from("journal_hydratation").upsert({client_id:UID,date_jour:today(),verres:H,objectif_ml:2500},{onConflict:"client_id,date_jour"}).then(function(r){if(r.error)toast("Hydratation non enregistrée.")})},600)}
function kl(t){return labs(t,"#k")}
function renderAcc(){$("acc").innerHTML=CLS.map(function(c,i){return '<div class="row" style="align-items:center"><div>'+esc(c.nom_complet||"Client")+'<br><span>'+(c.acces_offert?"Tous les avantages, sans paiement":"Accès standard")+'</span></div><button class="sw'+(c.acces_offert?' on':'')+'" data-i="'+i+'" aria-label="Accès offert pour '+esc(c.nom_complet||"Client")+'"></button></div>'}).join("")||'<div class="sub">Aucun client assigné.</div>'}
function pexo(l){if(!l||!l.length)return "";var d={};l.slice().sort(function(a,b){return a.position-b.position}).forEach(function(e){(d[e.libelle_jour]=d[e.libelle_jour]||[]).push(e)});return '<details style="margin:8px 0"><summary style="cursor:pointer;font-size:14px;font-weight:600">Voir les '+l.length+' exercices</summary>'+Object.keys(d).sort().map(function(j){return '<div class="tag" style="margin-top:8px">'+esc(j)+'</div>'+d[j].map(function(e){return '<div class="row">'+esc(e.nom_exercice)+'<span>'+e.series+'×'+esc(e.repetitions)+(Number(e.charge_kg)?' · '+Number(e.charge_kg)+' kg':'')+'</span></div>'}).join("")}).join("")+'</details>'}
function loadCoach(){var since=new Date(Date.now()-7*864e5).toISOString();return Promise.all([SB.from("profils").select("id,nom_complet,acces_offert").eq("role","client"),SB.from("programmes").select("id,titre,version,resume_ia,justification_ia,client_id,exercices_programme(nom_exercice,libelle_jour,position,series,repetitions,charge_kg)").eq("statut","en_attente").eq("coach_id",UID),SB.from("seances").select("client_id").gte("effectue_le",since),SB.from("profils").select("id,nom_complet").eq("coach_id",UID)]).then(function(a){
if(a[1].error)toast("Programmes à valider indisponibles : "+a[1].error.message);var pr=a[1].data||[],nm={},cnt={};PRS={};pr.forEach(function(q){PRS[q.id]=q});CLS=a[0].data||[];CLS.forEach(function(c){nm[c.id]=c.nom_complet||"Client"});(a[2].data||[]).forEach(function(x){cnt[x.client_id]=(cnt[x.client_id]||0)+1});
document.querySelector("#k .sub").textContent=pr.length?pr.length+" programme"+(pr.length>1?"s":"")+" à valider":"Aucun programme à valider";
$("prop").innerHTML=pr.length?pr.map(function(q){return '<div class="tag">Proposition de l’IA · '+esc(nm[q.client_id]||"")+'</div><div style="font:600 18px system-ui,sans-serif;margin:6px 0">'+esc(q.titre)+' · v'+(parseInt(q.version)||1)+'</div><p class="sub">'+esc(q.resume_ia||q.justification_ia||"")+'</p>'+pexo(q.exercices_programme)+'<div class="btns"><button class="no" data-p="'+esc(q.id)+'" data-a="refuser_programme">Refuser</button><button class="ok" data-p="'+esc(q.id)+'" data-a="approuver_programme">Valider</button></div>'}).join('<hr style="border:0;border-top:1px solid var(--line);margin:14px 0">'):GPT?'<div class="sub">L’IA retravaille le programme…</div>':'<div class="sub">Rien en attente.</div>'+(a[3].data||[]).map(function(c){return '<button class="btn" style="margin-top:10px" data-g="'+esc(c.id)+'">Demander un programme à l’IA'+((a[3].data||[]).length>1||c.id!=UID?' · '+esc(c.nom_complet||"Client"):'')+'</button>'}).join("");
kl("Suivi").nextElementSibling.innerHTML=CLS.map(function(c){var n=cnt[c.id]||0;return '<div class="row">'+esc(nm[c.id])+'<span>'+n+' séance'+(n>1?'s':'')+' · cette semaine</span></div>'}).join("")||'<div class="sub">Aucun client assigné.</div>';renderAcc()})}
function sf(f){try{return f()}catch(e){return Promise.reject(e)}}
function loadExtra(){var ps=[sf(loadProg),sf(loadWeight),sf(loadNutri)];if(PF.role=="coach")ps.push(sf(loadCoach));return Promise.all(ps).catch(function(){toast("Certaines données n’ont pas pu être chargées.")})}

function clear(){S.length=0;PF={};UID=null;PROG=null;drawRec();hist();M.length=0;nut();H=0;HB=0;hsv=false;hyd();ex.innerHTML="";showSeance(false);$("noprog").hidden=true}
function fillCat(items){var G={},ord=[];items.forEach(function(x){if(!G[x.g]){G[x.g]=[];ord.push(x.g)}G[x.g].push(x.nom)});
$("cgrp").innerHTML='<option value="">Choisir dans la liste…</option>'+ord.map(function(g){return '<optgroup label="'+esc(g)+'">'+G[g].map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join("")+'</optgroup>'}).join("");
$("dl").innerHTML=items.map(function(x){return '<option value="'+esc(x.nom)+'">'}).join("")}
$("cgrp").onchange=function(){if(this.value){$("ce").value=this.value;this.value=""}};
function loadCat(){if(!LIVE)return;SB.from("exercices").select("nom,groupe_musculaire").order("groupe_musculaire").order("nom").then(function(r){if(r.error||!Array.isArray(r.data))return;r.data.forEach(function(x){if(x.nom)CATG[x.nom]=x.groupe_musculaire||""});drawRec();fillCat(r.data.filter(function(x){return x.nom}).map(function(x){return{nom:x.nom,g:x.groupe_musculaire}}))})}
function r1(v){return Math.round(v*10)/10}
function today(){return new Date().toLocaleDateString("sv-SE")}
function boot(sess){UID=sess.user.id;loadCat();if(/premium=ok/.test(location.search)){toast("Paiement reçu, activation du Premium…");history.replaceState(null,"",location.pathname);syncPremium().then(pollPremium)}else if(/premium=annule/.test(location.search)){toast("Paiement annulé.");history.replaceState(null,"",location.pathname)}else if(/premium=portail/.test(location.search)){history.replaceState(null,"",location.pathname);syncPremium()}U.email=sess.user.email||"";
return flushPending().then(function(){return Promise.all([SB.from("profils").select("nom_complet,role,duree_repos_s,rappel_seance,acces_offert,premium_jusqu_au,resilie,stripe_customer_id").eq("id",UID).single(),SB.from("seances").select("id,effectue_le,type,ressenti,note,journal_seances(nom_exercice,charges_kg,reps,series_realisees,charge_kg,repetitions_realisees)").eq("client_id",UID).order("effectue_le",{ascending:false}).limit(400),SB.rpc("a_acces_premium")])}).then(function(a){
if(a[0].error||a[1].error)throw 0;PF=a[0].data||{};U.name=PF.nom_complet||U.email.split("@")[0];REST=PF.duree_repos_s||90;
S.length=0;(a[1].data||[]).forEach(function(w){S.push(toS(w))});
[].forEach.call($("urc").children,function(x){x.classList.toggle("on",+x.dataset.s==REST)});$("urm").classList.toggle("on",!!PF.rappel_seance);$("ue").readOnly=true;
document.querySelector('.nav button[data-v="k"]').style.display=PF.role=="coach"?"":"none";
initCassandreAccess();
prem(!!a[2].data);RESIL=!!PF.resilie;PFEND=PF.premium_jusqu_au;startPremCheck();if(PF.stripe_customer_id)syncPremium().then(function(d){if(d&&d.status=="past_due")toast("Ton dernier paiement a été refusé : mets à jour ta carte dans Mon compte.");return refreshPremium()});drawRec();hist();who();loadExtra().then(function(){draftRestore("c")});$("login").classList.remove("on");document.querySelector('.nav button[data-v="c"]').click();scrollTo(0,0)}).catch(function(){
if(navigator.onLine===false){UID=null;$("lmsg").textContent="Hors ligne : tes données s’afficheront dès le retour du réseau.";window.addEventListener("online",function(){boot(sess)},{once:true});return}
toast("Chargement impossible : réessaie.");SB.auth.signOut()})}
function msg(e){var m=(e.message||"").toLowerCase();return m.indexOf("invalid login")>-1?"E-mail ou mot de passe incorrect.":m.indexOf("already")>-1?"Un compte existe déjà avec cet e-mail.":m.indexOf("confirm")>-1?"Confirme d’abord ton e-mail.":"Erreur : "+e.message}
function authMode(on){sign=on;$("ln").hidden=!on;$("lcgw").hidden=!on;$("lgo").textContent=on?"Créer mon compte":"Se connecter";$("lsw").textContent=on?"J’ai déjà un compte":"Pas de compte ? Créer un compte";$("lerr").textContent=""}
function liveGo(){var em=$("le").value.trim(),pw=$("lp").value,nm=$("ln").value.trim(),b=$("lgo");
if(!/^\S+@\S+\.\S+$/.test(em)){$("lerr").textContent="Entre une adresse e-mail valide.";return}
if(pw.length<(sign?8:1)){$("lerr").textContent=sign?"Choisis un mot de passe d’au moins 8 caractères.":"Entre ton mot de passe.";return}
if(sign&&!nm){$("lerr").textContent="Entre ton prénom et ton nom.";return}
if(sign&&!$("lcg").checked){$("lerr").textContent="Accepte les conditions et la politique de confidentialité pour créer ton compte.";return}
b.disabled=true;$("lerr").textContent="";
(sign?SB.auth.signUp({email:em,password:pw,options:{data:{full_name:nm,consentement_le:new Date().toISOString(),consentement_version:"2026-11-04"}}}):SB.auth.signInWithPassword({email:em,password:pw})).then(function(r){b.disabled=false;if(r.error){$("lerr").textContent=msg(r.error);return}
if(!r.data.session){authMode(false);$("lerr").textContent="Compte créé : confirme ton e-mail puis connecte-toi.";return}boot(r.data.session)}).catch(function(){b.disabled=false;$("lerr").textContent="Connexion impossible : vérifie ta connexion."})}
if(LIVE){

labs("Séance du jour").insertAdjacentHTML("afterend",'<div class="cp" id="dayc" style="display:none"></div>');
labs("Mes séances").insertAdjacentHTML("beforebegin",'<div id="noprog" class="sub" hidden style="margin:12px 0 0">Ton coach n’a pas encore publié de programme : crée ta séance dans « Mes séances ».</div>');
var prem0=prem;prem=function(on){prem0(on);gateSeance()};var hist0=hist;hist=function(){var r=hist0.apply(this,arguments);gateSeance();return r};
$("dayc").onclick=function(e){var b=e.target.closest(".set");if(b)buildDay(b.dataset.d)};
$("fin").onclick=function(){finish(this,ex,DAY||"Séance")};
PP=labs("Progression").nextElementSibling;PP.querySelector(".prog").style.display="none";
PP.insertAdjacentHTML("beforeend",'<div class="add" style="margin-top:14px"><input id="pw" type="number" inputmode="decimal" placeholder="Pesée du jour (kg)"><button id="pws" style="grid-column:span 3">Enregistrer ma pesée</button><input id="pt" type="number" inputmode="decimal" placeholder="Poids cible (kg)"><button id="pts" style="grid-column:span 3">Définir mon objectif</button></div>');
$("pws").onclick=function(){var v=+$("pw").value;if(!(v>0&&v<400)){toast("Entre un poids valide.");return}SB.from("bilans").insert({client_id:UID,date_bilan:today(),poids_kg:v}).then(function(r){if(r.error){toast("Pesée non enregistrée.");return}$("pw").value="";loadWeight()})};
$("pts").onclick=function(){var v=+$("pt").value;if(!(v>=20&&v<=400)){toast("Entre un poids cible valide.");return}var c=WT.length?Number(WT[WT.length-1].poids_kg):v,ty=v<c-.5?"perte_poids":v>c+.5?"prise_masse":"maintien";
SB.from("objectifs").update({actif:false}).eq("client_id",UID).eq("actif",true).then(function(){return SB.from("objectifs").insert({client_id:UID,type:ty,poids_cible_kg:v,actif:true})}).then(function(r){if(r.error){toast("Objectif non enregistré.");return}$("pt").value="";loadWeight()})};
var hyd0=hyd;hyd=function(){hyd0();if(hsv)hsave()};
var fa0=$("fa").onclick;$("fa").onclick=function(){var n=$("fs").value,g=+$("fg2").value,b=M.length;fa0.call(this);if(M.length>b){var m=M[M.length-1];m.p=SB.from("journal_repas").insert({client_id:UID,date_repas:today(),aliment_id:AL[n]||null,nom:n,grammes:g,kcal:m[1],proteines_g:m[2],glucides_g:m[3],lipides_g:m[4],fibres_g:m[5],moment:momentNow()}).select("id").single().then(function(r){if(r.error){var i=M.indexOf(m);if(i>-1)M.splice(i,1);nut();toast("Aliment non enregistré : réessaie.");return}m.id=r.data.id})}};
$("prop").onclick=function(e){var g=e.target.closest("button[data-g]");if(g){g.disabled=true;GPT=GPT||-1;genProg({client_id:g.dataset.g},true);return}
var x=e.target.closest("button[data-x]");if(x){var f0=x.closest(".rfz");f0.previousElementSibling.style.display="";f0.remove();return}
var b=e.target.closest("button[data-p]");if(!b)return;var id=b.dataset.p;
if(b.dataset.a=="refuser_programme"&&!b.dataset.s){var bt=b.closest(".btns");bt.style.display="none";var f=document.createElement("div");f.className="rfz";f.style.marginTop="14px";
f.innerHTML='<label style="display:block;font:600 14px system-ui,sans-serif;margin-bottom:6px" for="rf-'+esc(id)+'">Qu’est-ce qui ne va pas ?</label><textarea id="rf-'+esc(id)+'" rows="4" maxlength="1000" placeholder="Ex. : trop de volume sur les jambes, remplace le soulevé de terre, ajoute du gainage…" style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:10px;font:14px system-ui,sans-serif;background:none;color:var(--ink);resize:vertical"></textarea><div class="btns"><button class="no" data-x="1">Annuler</button><button class="ok" data-p="'+esc(id)+'" data-a="refuser_programme" data-s="1">Retravailler le programme</button></div>';
bt.after(f);f.querySelector("textarea").focus();return}
var ref=b.dataset.a=="refuser_programme",mo="";if(ref){mo=b.closest(".rfz").querySelector("textarea").value.trim();if(!mo){toast("Explique ce qui ne va pas pour que l’IA retravaille le programme.");return}}
b.disabled=true;SB.rpc(b.dataset.a,ref?{p_programme_id:id,p_motif:mo}:{p_programme_id:id}).then(function(r){if(r.error){toast("Action impossible : "+r.error.message);b.disabled=false;return}if(ref){toast("Programme refusé. L’IA retravaille le programme…");delete PRS[id];GPT=GPT||-1;genProg({refus_programme_id:id,motif:mo},true)}else{toast("Programme validé et envoyé au client ✓");loadCoach()}}).catch(function(){toast("Action impossible, réessaie.");b.disabled=false})};
$("acc").onclick=function(e){var b=e.target.closest(".sw");if(!b)return;var c=CLS[+b.dataset.i],on=!c.acces_offert;SB.rpc("definir_acces_offert",{p_client_id:c.id,p_offert:on}).then(function(r){if(r.error){toast("Réglage impossible.");return}c.acces_offert=on;renderAcc()})};
var kz=kl("Alimentation et hydratation");if(kz){kz.style.display="none";kz.nextElementSibling.style.display="none"}
[].forEach.call(document.querySelectorAll("#c .lab"),function(l){if(/^Séance du jour/.test(l.textContent)){l.style.display="none";l.nextElementSibling.style.display="none"}});
$("fin").style.display="none";document.querySelector("#c .sub").style.display="none";
$("lgo").onclick=liveGo;$("lp").onkeydown=function(e){if(e.key=="Enter")liveGo()};$("lsw").onclick=function(){authMode(!sign)};
function fpShow(on){$("lfp").hidden=!on;$("lgo").parentNode.hidden=on;$("fpm").textContent="";if(on){$("fpe").value=$("le").value.trim();$("fpe").focus()}else $("le").focus()}
$("lfg").onclick=function(){fpShow(true)};$("fpb").onclick=function(){fpShow(false)};
function fpSend(){var em=$("fpe").value.trim(),b=$("fps");if(!/^\S+@\S+\.\S+$/.test(em)){$("fpm").textContent="Entre une adresse e-mail valide.";return}
b.disabled=true;$("fpm").textContent="";SB.auth.resetPasswordForEmail(em,{redirectTo:location.origin+"/"}).then(function(r){b.disabled=false;
if(r.error&&!/rate|seconds/i.test(r.error.message||"")){$("fpm").textContent="Envoi impossible pour le moment : réessaie dans un instant.";return}
if(r.error){$("fpm").textContent="Patiente un peu avant de redemander un lien.";return}
$("fpm").style.color="var(--ok)";$("fpm").textContent="Si un compte existe avec cet e-mail, un lien vient de t’être envoyé. Pense à vérifier tes indésirables.";setTimeout(function(){$("fpm").style.color=""},8000)}).catch(function(){b.disabled=false;$("fpm").textContent="Envoi impossible : vérifie ta connexion."})}
$("fps").onclick=fpSend;$("fpe").onkeydown=function(e){if(e.key=="Enter")fpSend()};
function rpOpen(){$("rp1").value="";$("rp2").value="";$("rpm").textContent="";$("rpw").classList.add("on");setTimeout(function(){$("rp1").focus()},50)}
SB.auth.onAuthStateChange(function(ev){if(ev=="PASSWORD_RECOVERY")rpOpen()});if(RECOV)rpOpen();
function rpSave(){var a=$("rp1").value,c=$("rp2").value,b=$("rps");if(a.length<8){$("rpm").textContent="Choisis un mot de passe d’au moins 8 caractères.";return}if(a!==c){$("rpm").textContent="Les deux mots de passe ne correspondent pas.";return}
b.disabled=true;$("rpm").textContent="";SB.auth.updateUser({password:a}).then(function(r){b.disabled=false;
if(r.error){var m=(r.error.message||"").toLowerCase();$("rpm").textContent=m.indexOf("different")>-1||m.indexOf("same")>-1?"Choisis un mot de passe différent de l’ancien.":m.indexOf("session")>-1||m.indexOf("jwt")>-1||m.indexOf("expired")>-1?"Ce lien a expiré : redemande un lien depuis l’écran de connexion.":"Enregistrement impossible : réessaie.";return}
$("rpw").classList.remove("on");history.replaceState(null,"",location.pathname);toast("Mot de passe modifié ✓");SB.auth.getSession().then(function(x){if(x.data&&x.data.session&&!UID)boot(x.data.session)})}).catch(function(){b.disabled=false;$("rpm").textContent="Enregistrement impossible : vérifie ta connexion."})}
$("rps").onclick=rpSave;$("rp2").onkeydown=function(e){if(e.key=="Enter")rpSave()};
$("sub").onclick=function(){var b=this;if(!$("cgv").checked){toast("Coche d’abord la case d’acceptation des CGV.");$("cgv").scrollIntoView({block:"center"});$("cgv").focus();return}SB.auth.getSession().then(function(r){var tk=r.data&&r.data.session&&r.data.session.access_token;if(!tk){toast("Connecte-toi d’abord.");return}
b.disabled=true;toast("Ouverture du paiement sécurisé…");
return fetch("/api/stripe-checkout",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify({cgv:true})}).then(function(x){return x.json()}).then(function(d){if(d.already){b.disabled=false;toast("Ton abonnement Premium est déjà actif.");refreshPremium();return}if(!d.url)throw d.error||0;location.href=d.url}).catch(function(e){b.disabled=false;toast(typeof e=="string"?e:"Paiement indisponible pour le moment, réessaie.")})})};
$("ulo").onclick=function(){SB.auth.signOut().then(function(){clear();signOut("Tu es déconnecté. À bientôt !")})};
$("udel").onclick=function(){$("delbox").hidden=!$("delbox").hidden;$("dpw").value="";$("derr").textContent="";if(!$("delbox").hidden)$("dpw").focus()};
$("dno").onclick=function(){$("delbox").hidden=true};
$("dgo").onclick=function(){var pw=$("dpw").value,b=this;if(!pw){$("derr").textContent="Entre ton mot de passe pour confirmer.";$("dpw").focus();return}
b.disabled=true;$("derr").textContent="";authedPost("delete-account",{password:pw}).then(function(d){b.disabled=false;if(!d||d.error){$("derr").textContent=(d&&d.error)||"Suppression impossible : réessaie.";return}
$("delbox").hidden=true;try{localStorage.removeItem(PK);localStorage.removeItem("rw_draft_c_"+UID);localStorage.removeItem("rw_draft_d_"+UID)}catch(e){}SB.auth.signOut().then(function(){clear();signOut("Ton compte a été supprimé"+(d.warning?" ("+d.warning+")":"")+".")})}).catch(function(){b.disabled=false;$("derr").textContent="Suppression impossible : vérifie ta connexion."})};
$("uexp").onclick=exportData;
$("usv").onclick=function(){var n=$("un").value.trim(),b=this;if(!n){$("un").focus();return}SB.from("profils").update({nom_complet:n}).eq("id",UID).then(function(r){if(r.error){toast("Enregistrement impossible.");return}U.name=n;who();b.textContent="Enregistré ✓";setTimeout(function(){b.textContent="Enregistrer"},1800)})};
var f0=$("urc").onclick;$("urc").onclick=function(e){f0.call(this,e);if(e.target.closest(".set"))SB.from("profils").update({duree_repos_s:REST}).eq("id",UID).then(function(r){if(r.error)toast("Réglage non enregistré : réessaie.")})};
var m0=$("urm").onclick;$("urm").onclick=function(){m0.call(this);SB.from("profils").update({rappel_seance:this.classList.contains("on")}).eq("id",UID).then(function(r){if(r.error)toast("Réglage non enregistré : réessaie.")})};
clear();$("login").classList.add("on");authMode(false);
SB.auth.getSession().then(function(r){if(r.data&&r.data.session)boot(r.data.session)})}
var RESIL=false,PFEND=null,PREMT=null,abo0=abo;
function fmtD(iso){return new Date(iso).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
function authedPost(fn,body){return SB.auth.getSession().then(function(r){var tk=r.data&&r.data.session&&r.data.session.access_token;if(!tk)throw 0;
return fetch("/api/"+fn,{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify(body||{})})}).then(function(x){return x.json()})}
function authedGet(fn){return SB.auth.getSession().then(function(r){var tk=r.data&&r.data.session&&r.data.session.access_token;if(!tk)throw 0;return fetch("/api/"+fn,{headers:{Authorization:"Bearer "+tk}})}).then(function(x){if(!x.ok)throw new Error("not_available");return x.json()})}
function casEl(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);return e}
function casClear(id,msg){var e=$(id);e.replaceChildren(casEl("p","sub",msg))}
function casDate(v){if(!v)return "Date indisponible";var d=new Date(v);return Number.isNaN(d.getTime())?"Date indisponible":d.toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}
function casStatus(v){return ({pending:"En attente",assigned:"Affectée",queued:"En attente",running:"En cours",in_progress:"En cours",completed:"Terminée",failed:"Échec",blocked:"Bloquée",needs_correction:"À corriger",needs_review:"À contrôler",awaiting_approval:"À valider",cancelled:"Annulée"})[v]||"État inconnu"}
function renderCassandre(d){
var ag=$("cassandreAgents"),rq=$("cassandreRequests"),rp=$("cassandreReports"),ap=$("cassandreApprovals"),wa=$("cassandreWhatsapp"),wh=$("cassandreWhatsAppHistory");
ag.replaceChildren();(d.agents||[]).forEach(function(a){var card=casEl("div","cass-agent"),title=casEl("b","",a.display_role||a.agent_key),state=casEl("span","cass-pill",a.is_active?"Disponible":"Désactivé"),mission=casEl("span","",a.mission||"Mission non renseignée");mission.style.gridColumn="1/-1";card.append(title,state,mission);ag.append(card)});if(!ag.children.length)casClear("cassandreAgents","Aucun agent enregistré.");
rq.replaceChildren();var tasks=d.tasks||[];(d.requests||[]).forEach(function(r){var card=casEl("article","cass-card"),head=casEl("b","",r.message),state=casEl("div","cass-meta",casStatus(r.status)+" · "+casDate(r.created_at));card.append(head,state);if(r.summary)card.append(casEl("p","cass-result",r.summary));tasks.filter(function(t){return t.request_id===r.id}).forEach(function(t){var box=casEl("div","cass-card"),name=casEl("b","",(t.agent_key||"Agent")+" · "+(t.title||"Mission")),st=casEl("div","cass-meta",casStatus(t.status)+" · essais "+(t.attempt_count||0)+"/"+(t.max_attempts||0));box.append(name,st);if(t.result){if(t.result.summary)box.append(casEl("p","cass-result",t.result.summary));(t.result.findings||[]).forEach(function(f){box.append(casEl("p","cass-result",(f.kind||"Information")+" : "+(f.text||"")))});if((t.result.limitations||[]).length)box.append(casEl("p","cass-meta","Limites : "+t.result.limitations.join(" · ")))}card.append(box)});rq.append(card)});if(!rq.children.length)casClear("cassandreRequests","Aucune mission pour le moment.");
rp.replaceChildren();(d.reports||[]).forEach(function(x){var card=casEl("article","cass-card"),title=casEl("b","",x.report_date||"Rapport"),sum=casEl("p","cass-result",x.executive_summary||"Synthèse indisponible");card.append(title,sum);rp.append(card)});if(!rp.children.length)casClear("cassandreReports","Aucun rapport de direction disponible.");var setting=d.daily_report||{};$("cassandreReportHour").value=setting.hour||"18:00";$("cassandreReportToggle").dataset.enabled=setting.enabled?"true":"false";$("cassandreReportToggle").setAttribute("aria-pressed",setting.enabled?"true":"false");$("cassandreReportToggle").textContent=setting.enabled?"Rapport activé":"Rapport désactivé";
ap.replaceChildren();(d.approvals||[]).forEach(function(x){var card=casEl("div","cass-card");card.append(casEl("b","",x.action_description),casEl("p","cass-meta","Risque "+x.risk_level+" · expire le "+casDate(x.expires_at)));ap.append(card)});if(!ap.children.length)casClear("cassandreApprovals","Aucune validation en attente.");
wa.replaceChildren();if(d.whatsapp){wa.append(casEl("p","",(d.whatsapp.enabled&&d.whatsapp.verified_at)?"Connexion vérifiée et activée":"Numéro enregistré mais pas activé"),casEl("p","cass-meta","Numéro se terminant par "+String(d.whatsapp.phone_number||"").slice(-4)))}else casClear("cassandreWhatsapp","WhatsApp n’est pas configuré. La réception est désactivée jusqu’à la vérification du numéro fondateur.");
wh.replaceChildren();(d.messages||[]).forEach(function(m){var row=casEl("article","cass-card"),head=casEl("b","",m.direction==="inbound"?"Fondateur":"Cassandre"),date=casEl("div","cass-meta",casDate(m.created_at)+" · "+(m.status||"")),content=casEl("p","cass-result",m.content||"[message vide]");row.append(head,date,content);wh.append(row)});if(!wh.children.length)casClear("cassandreWhatsAppHistory","Aucun message WhatsApp reçu ou envoyé.");
}
function loadCassandre(){if(!LIVE||!UID)return Promise.resolve();return authedGet("cassandre-dashboard").then(renderCassandre).catch(function(){casClear("cassandreFeedback","Cassandre est indisponible ou non configurée.")})}
window.loadCassandre=loadCassandre;
function initCassandreAccess(){var b=$("cassandreNav");if(!b)return;b.hidden=true;if(PF.role!=="coach")return;authedGet("cassandre-dashboard").then(function(d){b.hidden=false;renderCassandre(d)}).catch(function(){b.hidden=true})}
$("cassandreSend").onclick=function(){var input=$("cassandreMessage"),button=this,text=input.value.trim();if(!text){input.focus();return}button.disabled=true;$("cassandreFeedback").textContent=CASSANDRE_READ_ONLY?"Lecture du statut en cours…":"Cassandre répartit la mission entre ses agents…";authedPost("cassandre-command",{message:text}).then(function(d){if(d.error)throw new Error(d.error);input.value="";$("cassandreFeedback").textContent=d.response||"Mission enregistrée. Les résultats apparaîtront ici au fur et à mesure.";return loadCassandre()}).catch(function(){ $("cassandreFeedback").textContent="La demande n’a pas pu être traitée. Vérifie la configuration Cassandre."}).finally(function(){button.disabled=false})};
$("cassandrePhoneRequest").onclick=function(){var b=this,feedback=$("cassandrePhoneFeedback"),phone=$("cassandrePhone").value.trim();if(!phone){feedback.textContent="Entre ton numéro au format international.";return}b.disabled=true;feedback.textContent="Envoi du code de test…";authedPost("whatsapp-connection-request",{phone_number:phone}).then(function(d){if(d.error)throw new Error(d.error);feedback.textContent="Code envoyé par le modèle Meta de test. Il expire dans 5 minutes."}).catch(function(){feedback.textContent="Envoi bloqué : vérifie l’identifiant du numéro de test et le modèle d’authentification Meta approuvé."}).finally(function(){b.disabled=false})};
$("cassandrePhoneVerify").onclick=function(){var b=this,feedback=$("cassandrePhoneFeedback"),code=$("cassandrePhoneCode").value.trim();if(!/^\d{6}$/.test(code)){feedback.textContent="Entre le code à 6 chiffres.";return}b.disabled=true;authedPost("whatsapp-connection-verify",{code:code}).then(function(d){if(d.error)throw new Error(d.error);$("cassandrePhoneCode").value="";feedback.textContent="Numéro vérifié et relié au compte fondateur.";return loadCassandre()}).catch(function(){feedback.textContent="Code incorrect ou vérification indisponible."}).finally(function(){b.disabled=false})};
$("cassandreReportToggle").onclick=function(){var next=this.dataset.enabled!=="true";this.dataset.enabled=next?"true":"false";this.setAttribute("aria-pressed",next?"true":"false");this.textContent=next?"Rapport activé":"Rapport désactivé"};
$("cassandreReportSave").onclick=function(){var b=this,feedback=$("cassandreReportFeedback"),enabled=$("cassandreReportToggle").dataset.enabled==="true",hour=$("cassandreReportHour").value;if(!/^([01]\d|2[0-3]):00$/.test(hour)){feedback.textContent="Choisis une heure pleine.";return}if(enabled&&!confirm("Activer la génération quotidienne en environnement de test ? Des appels IA seront exécutés dans la limite des plafonds configurés.")){return}b.disabled=true;authedPost("cassandre-settings",{daily_report:{enabled:enabled,hour:hour}}).then(function(d){if(d.error)throw new Error(d.error);feedback.textContent=enabled?"Rapport programmé à "+hour+" (Europe/Paris).":"Rapport quotidien désactivé.";return loadCassandre()}).catch(function(){feedback.textContent="Enregistrement impossible. La programmation reste désactivée."}).finally(function(){b.disabled=false})};
function refreshPremium(){if(!LIVE||!UID)return Promise.resolve(false);
return Promise.all([SB.rpc("a_acces_premium"),SB.from("profils").select("resilie,premium_jusqu_au,acces_offert,stripe_customer_id").eq("id",UID).single()]).then(function(a){
if(a[0].error)return false;var on=!!a[0].data,was=!$("prem").classList.contains("locked");
if(a[1].data){RESIL=!!a[1].data.resilie;PFEND=a[1].data.premium_jusqu_au;PF.acces_offert=a[1].data.acces_offert;PF.stripe_customer_id=a[1].data.stripe_customer_id}
prem(on);abo();if(was!==on)toast(on?"Premium activé ✓":"Premium terminé : les fonctionnalités payantes sont bloquées.");return on}).catch(function(){return false})}
window.__refreshPremium=function(){return refreshPremium()};
var SUBST={};
function syncPremium(){return authedPost("stripe-sync",{}).then(function(d){if(d&&!d.error){SUBST=d;if(d.active!=null){RESIL=!!d.resilie;if(d.ends)PFEND=d.ends}}return d}).catch(function(){})}
function startPremCheck(){clearInterval(PREMT);PREMT=setInterval(refreshPremium,60000)}
function pollPremium(){var n=0,t=setInterval(function(){n++;refreshPremium().then(function(on){if(on||n>=10){clearInterval(t);if(!on)toast("Paiement en cours de validation : le Premium s’activera d’ici quelques minutes. Inutile de payer une seconde fois.")}})},2000)}
abo=function(){abo0();var lk=$("prem").classList.contains("locked"),b=$("uabb"),inf=$("uinf"),pay=LIVE&&!lk&&!PF.acces_offert;
inf.textContent="";inf.style.color="";$("uport").hidden=!(LIVE&&PF.stripe_customer_id);
if(pay&&RESIL&&PFEND){$("uab").textContent="Premium jusqu’au "+fmtD(PFEND)+" (résilié)";b.hidden=false;b.textContent="Réactiver mon abonnement";b.dataset.r="1";inf.textContent="Tu gardes le Premium jusqu’à cette date, puis il s’arrête sans nouveau prélèvement."}
else if(pay){b.hidden=false;b.textContent="Résilier mon abonnement (sans frais)";b.dataset.r="";if(SUBST.ends)inf.textContent="Prochain prélèvement de 5 € le "+fmtD(SUBST.ends)+"."}
else b.dataset.r="";
if(LIVE&&SUBST.status=="past_due"){inf.style.color="var(--pri)";inf.textContent="Ton dernier paiement a été refusé : mets à jour ta carte avec « Gérer le paiement et les factures » pour garder le Premium."}};
$("uport").onclick=function(){var b=this;b.disabled=true;authedPost("stripe-portal",{}).then(function(d){b.disabled=false;if(d&&d.url){location.href=d.url;return}toast((d&&d.error)||"Espace de paiement indisponible, réessaie.")}).catch(function(){b.disabled=false;toast("Espace de paiement indisponible, réessaie.")})};
$("uabb").onclick=function(){var b=this;if($("prem").classList.contains("locked")){$("set").classList.remove("on");$("sub").click();return}
if(!LIVE){abo0();return}
if(b.dataset.r){b.disabled=true;b.textContent="Réactivation…";authedPost("stripe-resume",{}).then(function(d){b.disabled=false;if(!d||d.error)throw 0;RESIL=false;syncPremium().then(refreshPremium).then(abo);toast("Abonnement réactivé ✓")}).catch(function(){b.disabled=false;abo();toast("Réactivation impossible : réessaie dans un instant.")});return}
if(!b.dataset.c){b.dataset.c="1";b.textContent="Confirmer la résiliation";setTimeout(function(){if(b.dataset.c){b.dataset.c="";abo()}},4000);return}
b.dataset.c="";b.disabled=true;b.textContent="Résiliation…";
authedPost("stripe-cancel",{}).then(function(d){b.disabled=false;if(!d.ends)throw 0;RESIL=true;PFEND=d.ends;abo();toast("Résiliation prise en compte. Premium jusqu’au "+fmtD(d.ends)+".")}).catch(function(){b.disabled=false;abo();toast("Résiliation impossible : réessaie dans un instant.")})};

/* Brouillon de la séance en cours : rien n’est perdu si l’appli se ferme */
function dKey(k){return "rw_draft_"+k+"_"+UID}
function ser(host){return [].map.call(host.querySelectorAll(":scope>.ex"),function(e){return [].map.call(e.querySelectorAll(".sr"),function(r){return [r.querySelector(".kg").value,r.querySelector(".rp").value,r.querySelector(".ck").classList.contains("on")?1:0]})})}
function draftSave(k){if(!LIVE||!UID)return;if((k=="c"?$("cfin"):$("fin")).dataset.saved)return;var host=k=="c"?$("cex"):ex,v=ser(host);
if(k=="d"&&!v.some(function(e){return e.some(function(r){return r[2]})}))return;
var o={t:Date.now(),v:v};if(k=="c"){o.cx=CX.slice();o.title=$("ctitle").textContent}else o.day=DAY;
try{localStorage.setItem(dKey(k),JSON.stringify(o))}catch(e){}}
function draftClear(k){try{localStorage.removeItem(dKey(k))}catch(e){}}
function fillHost(host,v){[].forEach.call(host.querySelectorAll(":scope>.ex"),function(e,i){var want=v[i];if(!want)return;var plus=e.querySelector('.sa button[data-a="+"]'),minus=e.querySelector('.sa button[data-a="-"]'),g=0;
while(e.querySelectorAll(".sr").length<want.length&&plus&&g++<20)plus.click();while(e.querySelectorAll(".sr").length>want.length&&minus&&g++<40)minus.click();
[].forEach.call(e.querySelectorAll(".sr"),function(r,j){var w=want[j];if(!w)return;r.querySelector(".kg").value=w[0];r.querySelector(".rp").value=w[1];r.querySelector(".ck").classList.toggle("on",!!w[2])})})}
function draftRestore(k){if(!LIVE||!UID)return;var o;try{o=JSON.parse(localStorage.getItem(dKey(k))||"null")}catch(e){o=null}
if(!o||Date.now()-o.t>12*36e5){draftClear(k);return}
if(k=="c"){if(!o.cx||!o.cx.length||!$("clive").hidden)return;CX.length=0;o.cx.forEach(function(x){CX.push(x)});rl();$("cn").value=o.title||"";$("cgo").click();fillHost($("cex"),o.v);toast("Ta séance en cours a été restaurée.")}
else{if(!PROG||DAYS.indexOf(o.day)<0)return;buildDay(o.day);fillHost(ex,o.v);toast("Ta séance du jour en cours a été restaurée.")}}
var dT=null;function dTick(e){var t=e.target;if(!t.closest)return;var k=t.closest("#cex")?"c":t.closest("#ex")?"d":"";if(!k)return;clearTimeout(dT);dT=setTimeout(function(){draftSave(k)},300)}
document.addEventListener("input",dTick);document.addEventListener("click",dTick);
/* Export RGPD : toutes les données du compte en JSON */
function exportData(){if(!LIVE||!UID){toast("Connecte-toi d’abord.");return}var b=$("uexp");b.disabled=true;
var q=[["profil",SB.from("profils").select("*").eq("id",UID)],["seances",SB.from("seances").select("*,journal_seances(*)").eq("client_id",UID)],["pesees",SB.from("bilans").select("*").eq("client_id",UID)],["objectifs",SB.from("objectifs").select("*").eq("client_id",UID)],["repas",SB.from("journal_repas").select("*").eq("client_id",UID)],["hydratation",SB.from("journal_hydratation").select("*").eq("client_id",UID)],["questionnaires",SB.from("questionnaires_programme").select("*").eq("client_id",UID)],["programmes",SB.from("programmes").select("*,exercices_programme(*)").eq("client_id",UID)]];
Promise.all(q.map(function(x){return x[1]})).then(function(a){var o={exporte_le:new Date().toISOString(),compte:{id:UID,email:U.email}};a.forEach(function(r,i){o[q[i][0]]=r.error?{erreur:r.error.message}:r.data});
var url=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:"application/json"})),l=document.createElement("a");l.href=url;l.download="repwise-mes-donnees-"+today()+".json";document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(url)},4000);b.disabled=false;toast("Tes données ont été téléchargées ✓")}).catch(function(){b.disabled=false;toast("Export impossible : vérifie ta connexion.")})}
/* Hors ligne : bandeau + envoi automatique au retour du réseau */
function netState(){$("off").hidden=navigator.onLine!==false}
window.addEventListener("offline",netState);window.addEventListener("online",function(){netState();if(UID)flushPending()});netState();
/* Accessibilité : états des boutons et fermeture des fenêtres avec Échap */
function ap(el){if(!el.matches)return;if(el.matches(".nav button"))el.setAttribute("aria-selected",el.classList.contains("on"));else if(el.matches("button.set,button.sw"))el.setAttribute("aria-pressed",el.classList.contains("on"))}
function apAll(root){ap(root);if(root.querySelectorAll)[].forEach.call(root.querySelectorAll(".nav button,button.set,button.sw"),ap)}
apAll(document.body);new MutationObserver(function(ms){ms.forEach(function(m){if(m.type=="attributes")ap(m.target);else [].forEach.call(m.addedNodes,function(n){if(n.nodeType==1)apAll(n)})})}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
document.addEventListener("keydown",function(e){if(e.key!="Escape")return;if($("sum").classList.contains("on"))$("sum").classList.remove("on");else if($("set").classList.contains("on"))$("set").classList.remove("on")});
})();
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}
