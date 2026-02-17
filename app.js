let treino=[];
let current=0;
let tempo=0;
let duracaoAtual=0;
let intervalo=null;
let emExercicio=true;
let pausado=true;
let tempoInicioTreino=null;
let duracaoTotalTreino=0;
let treinoIniciado=false;
let tempoTreinado=0;
let ultimoTick=null;
let coachTimer=null;
let coachIndex=0;

const beep=new Audio("sounds/beep.wav");
const end=new Audio("sounds/end.wav");
const start=new Audio("sounds/start.wav");
const finish=new Audio("sounds/finish.wav");

function play(a){a.currentTime=0;a.play().catch(()=>{})}

//////////////////// MENU ////////////////////

async function carregarLista(){
    const res=await fetch("treinos.json?"+Date.now());
    const listaTreinos=await res.json();

    const lista=document.getElementById("lista");
    lista.innerHTML="";

    listaTreinos.forEach(nome=>{
        let d=document.createElement("div");
        d.className="item";
        d.innerText=nome.replace(".json","").replaceAll("_"," ");
        d.onclick=()=>carregarTreino(nome);
        lista.appendChild(d);
    });
}
carregarLista();

async function carregarTreino(nome){

    const res=await fetch("treinos/"+nome+"?"+Date.now());
    treino=await res.json();

    duracaoTotalTreino=0;
    treino.forEach(e=>duracaoTotalTreino+=e.tempo+e.descanso);

    document.getElementById("menu").style.display="none";
    document.getElementById("player").style.display="grid";
}

//////////////////// WORKOUT ////////////////////

function startWorkout(){
    if(!treinoIniciado){
        treinoIniciado=true;
        pausado=false;
        tempoInicioTreino=Date.now();
        executar();
        return;
    }
    pausado=false;
}

function pauseWorkout(){pausado=true}

function nextExercise(){current++;executar()}
function voltarMenu(){location.reload()}

function executar(){

    clearInterval(intervalo);

    if(current>=treino.length){
        document.getElementById("exercise").innerText="TREINO TERMINADO";
        document.getElementById("timer").innerText="✔";
        play(finish);
        return;
    }

    let e=treino[current];

    tempo=emExercicio?e.tempo:e.descanso;
    duracaoAtual=tempo;

    atualizarUI();

    clearInterval(coachTimer);
    if(emExercicio) iniciarCoach(e);

    intervalo=setInterval(()=>{

        if(pausado){
            ultimoTick=Date.now();
            return;
        }

        tempo--;

        if(ultimoTick)
            tempoTreinado+=Math.floor((Date.now()-ultimoTick)/1000);
        ultimoTick=Date.now();

        if(tempo<=5 && tempo>0)play(beep);

        atualizarTimer();

        if(tempo<=0)trocar();

    },1000);
}

function trocar(){

    if(emExercicio){
        play(end);
        emExercicio=false;
        executar();
    }
    else{
        play(start);
        current++;
        emExercicio=true;
        showGO();
        executar();
    }
}

//////////////////// UI ////////////////////

function atualizarUI(){

    const video=document.getElementById("video");
    const e=treino[current];

    if(emExercicio){
        document.getElementById("exercise").innerText=e.nome;
        document.getElementById("phase").innerHTML=icone(e.equipamento);

        if(e.video){
            video.src="videos/"+e.video;
            video.style.display="block";
            video.play().catch(()=>{});
        }else video.style.display="none";

    }else{

        document.getElementById("exercise").innerText="DESCANSO";
        document.getElementById("phase").innerText="PREPARAR";

        if(current<treino.length-1){
            let prox=treino[current+1];
            if(prox.video){
                video.src="videos/"+prox.video;
                video.style.display="block";
                video.play().catch(()=>{});
            }else video.style.display="none";
        }
    }

    mostrarProximo();
    atualizarTimer();
}

function atualizarTimer(){

    document.getElementById("timer").innerText=tempo;

    let percent=tempo/duracaoAtual;
    document.getElementById("progressCircle").style.strokeDashoffset=596*(1-percent);

    let decorrido=Math.floor((Date.now()-tempoInicioTreino)/1000);
    let restante=Math.max(0,duracaoTotalTreino-tempoTreinado);

    document.getElementById("elapsed").innerText=format(decorrido);
    document.getElementById("remaining").innerText=format(restante);
}

function mostrarProximo(){
    let n=document.getElementById("next");
    if(current<treino.length-1){
        let p=treino[current+1];
        n.innerHTML="A seguir:<br><b>"+p.nome+"</b><br>"+icone(p.equipamento);
    }else n.innerText="Último exercício";
}

//////////////////// COACH ////////////////////

function iniciarCoach(e){

    let box=document.getElementById("coachBox");
    let tipo=document.getElementById("coachType");
    let texto=document.getElementById("coachText");

    const msgs=[e.Dicas_Tecnica,e.Erros_Comuns,e.Cuidados].filter(t=>t);

    if(msgs.length===0){box.classList.add("hidden");return;}

    box.classList.remove("hidden");

    coachIndex=0;
    coachTimer=setInterval(()=>{
        tipo.innerText=["DICA","ERRO","CUIDADO"][coachIndex%3];
        texto.innerText=msgs[coachIndex%msgs.length];
        coachIndex++;
    },6000);
}

//////////////////// HELPERS ////////////////////

function icone(eq){
    if(!eq) return "";

    eq = eq.toLowerCase();

    let file="peso.svg";
    if(eq.includes("halter")) file="halteres.svg";
    if(eq.includes("tapete")) file="tapete.svg";
    if(eq.includes("multi")) file="multi.svg";
    if(eq.includes("elast")) file="elastico.svg";
    if(eq.includes("box")) file="box.svg";

    return "<img class='icon' src='"+BASE_PATH+"icons/"+file+"'>";
}


function format(s){
    let m=Math.floor(s/60);
    let ss=s%60;
    return String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0");
}

function showGO(){
    let b=document.getElementById("bigcount");
    b.innerText="GO";
    b.classList.add("show");
    setTimeout(()=>b.classList.remove("show"),600);
}
