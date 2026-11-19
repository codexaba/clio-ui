// Page behaviour for the Clio site: clean-URL navigation between the views and
// the animated review on the home screen. Routing rules live in router.js.
import { VIEWS, pathFor, parseLocation, routeFromHref, metaFor } from "./router.js";

var order=VIEWS;
var names={how:"How it runs",checks:"The ten checks",score:"Score and groups",control:"Control",security:"Privacy and security",who:"Who it is for",faq:"Questions",contact:"Request a demo"};
var views={};
document.querySelectorAll(".view").forEach(function(v){views[v.dataset.view]=v;});
order.forEach(function(k,i){
  if(k==="home"||k==="contact")return;
  var w=document.createElement("div");w.className="wrap pager";
  var p=order[i-1],n=order[i+1];
  w.innerHTML=(p==="home"?'<a class="pv" href="/">Home</a>':'<a class="pv" href="'+pathFor(p)+'">'+names[p]+'</a>')+'<a class="nx" href="'+pathFor(n)+'">'+names[n]+'</a>';
  views[k].appendChild(w);
});
var descMeta=document.querySelector('meta[name="description"]');
// Canonical is created here, not in index.html: every path is served the same
// HTML, and a static canonical would tell crawlers each view duplicates "/".
var canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical);
if("scrollRestoration" in history)history.scrollRestoration="manual";
function route(moveFocus){
  var loc=parseLocation(location.pathname,location.hash);
  var k=loc.view;
  if(loc.redirect)history.replaceState(null,"",loc.redirect);
  for(var n in views)views[n].classList.toggle("on",n===k);
  document.body.classList.toggle("is-home",k==="home");
  document.querySelectorAll("header nav a").forEach(function(a){a.classList.toggle("on",a.getAttribute("href")===pathFor(k));});
  var meta=metaFor(k);
  document.title=meta.title;
  if(descMeta)descMeta.setAttribute("content",meta.description);
  canonical.setAttribute("href",location.origin+pathFor(k));
  window.scrollTo(0,0);
  if(moveFocus){
    var h=views[k].querySelector("h1,h2");
    if(h){if(!h.hasAttribute("tabindex"))h.setAttribute("tabindex","-1");h.focus({preventScroll:true});}
  }
  if(k==="home")start();else stop();
}
window.addEventListener("popstate",function(){route(true);});
document.addEventListener("click",function(e){
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var a=e.target.closest&&e.target.closest("a[href]");
  if(!a||a.hasAttribute("target")||a.hasAttribute("download"))return;
  var view=routeFromHref(a.getAttribute("href"),location.origin);
  if(view===null)return;
  e.preventDefault();
  if(location.pathname!==pathFor(view)||location.hash)history.pushState(null,"",pathFor(view));
  route(true);
});

/* live review on the home screen */
var notes=[
 {meta:["CPT 97153","2.0 h","Place: Home"],
  body:'<p>Client engaged in <mark>tantrum (3 instances)</mark> when asked to end tablet time. RBT applied <mark class="t">response blocking</mark> and redirected to the visual schedule.</p><p>Replacement skill <mark class="t">requesting a break</mark> was prompted with a gestural prompt and reinforced with praise.</p><p>Client also <span class="strike">eloped from the table twice</span> during the session and was returned to the work area.</p><p>Client played a turn-taking game <span class="strike">with two peers</span> before closing the session.</p>',
  pins:[["ok","Validation","Tantrum matches the session data"],["no","Check 04 · Data collection","Elopement described, no data recorded"],["hm","Check 05 · Agency rule","Home session mentions peers"]],
  score:82,cls:"hm",verdict:"Needs human review"},
 {meta:["CPT 97155","1.0 h","Place: Clinic"],
  body:'<p>BCBA observed the RBT running the <mark class="t">DRA protocol</mark> and modified the prompt hierarchy from gestural to verbal.</p><p><mark>Aggression (1 instance)</mark> occurred during transition and was recorded in the data table.</p><p>Replacement skill <mark class="t">functional communication</mark> was modeled and reinforced with <mark class="t">praise</mark>.</p><p>The analyst reviewed progress on the current goals and left written feedback for the RBT.</p>',
  pins:[["ok","Validation","Behaviors and replacements match the session"],["ok","Checks","10 of 10 passed"],["ok","Signatures","Provider and supervisor signed"]],
  score:95,cls:"ok",verdict:"Approvable"},
 {meta:["CPT 97156","1.5 h","Place: Home"],
  body:'<p><span class="strike">I showed</span> the caregiver how to use the <mark class="t">token board</mark> during homework and practiced delivering reinforcement.</p><p>Caregiver ran <mark class="t">three practice trials</mark> with feedback and asked about handling refusals.</p><p>Caregivers present: <span class="strike">(empty field)</span></p><p>Next session will review the reinforcement schedule.</p>',
  pins:[["hm","Score","Written in first person, −5"],["no","Check 03 · Incomplete fields","Caregivers field is empty"],["ok","Validation","Training matches the session data"]],
  score:95,cls:"no",verdict:"Incomplete fields"}
];
var $=function(id){return document.getElementById(id);};
var timers=[],running=false,idx=0,still=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function later(f,ms){timers.push(setTimeout(f,ms));}
function stop(){running=false;timers.forEach(clearTimeout);timers=[];}
function start(){if(running)return;running=true;play();}
function setScore(v){$("score").textContent=v;$("ring").style.setProperty("--v",v);}
function count(to,ms){var from=100,t0=null;function step(ts){if(!running)return;if(!t0)t0=ts;var k=Math.min(1,(ts-t0)/ms);setScore(Math.round(from-(from-to)*k));if(k<1)requestAnimationFrame(step);}requestAnimationFrame(step);}
function play(){
  if(!running)return;
  var n=notes[idx],sheet=$("sheet"),ver=$("verdict");
  $("nidx").textContent="Note "+(idx+1)+" of "+notes.length;
  $("nmeta").innerHTML=n.meta.map(function(m){return "<span>"+m+"</span>";}).join("");
  $("nbody").innerHTML=n.body;
  ["p1","p2","p3"].forEach(function(id,i){var p=$(id),d=n.pins[i];p.className="pin "+id+(d?" "+d[0]:"");p.innerHTML=d?"<b>"+d[1]+"</b>"+d[2]:"";});
  ver.className="verdict";$("vtext").innerHTML="&nbsp;";setScore(100);$("stage").textContent="Reading the note";
  sheet.classList.remove("out");
  var marks=[].slice.call(sheet.querySelectorAll("mark,.strike"));
  if(still){marks.forEach(function(m){m.classList.add("on");});["p1","p2","p3"].forEach(function(id){$(id).classList.add("on");});setScore(n.score);ver.className="verdict "+n.cls;$("stage").textContent="Decision";$("vtext").textContent=n.verdict;later(next,7000);return;}
  var scan=$("scan");scan.classList.remove("run");void scan.offsetWidth;scan.classList.add("run");
  marks.forEach(function(m,i){later(function(){m.classList.add("on");},500+i*(1900/Math.max(1,marks.length)));});
  later(function(){$("stage").textContent="Comparing with the session";},1700);
  later(function(){$("p1").classList.add("on");},2500);
  later(function(){$("stage").textContent="Running the ten checks";},3100);
  later(function(){$("p2").classList.add("on");},3500);
  later(function(){$("p3").classList.add("on");},4300);
  later(function(){$("stage").textContent="Scoring";count(n.score,900);},5000);
  later(function(){ver.className="verdict done "+n.cls;$("stage").textContent="Decision";$("vtext").textContent=n.verdict;},6100);
  later(next,10200);
}
function next(){
  if(!running)return;
  $("sheet").classList.add("out");["p1","p2","p3"].forEach(function(id){$(id).classList.remove("on");});
  later(function(){idx=(idx+1)%notes.length;play();},still?0:520);
}
document.addEventListener("visibilitychange",function(){if(document.hidden)stop();else if(document.body.classList.contains("is-home"))start();});
route(false);
