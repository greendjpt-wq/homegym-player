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
let inicioFase = null;
let ultimoBeep = null;
let inicioTreinoReal = null;
let tempoPausadoTotal = 0;
let momentoPauseGlobal = null;

const beep=new Audio("sounds/beep.wav");
const end=new Audio("sounds/end.wav");
const start=new Audio("sounds/start.wav");
const finish=new Audio("sounds/finish.wav");

function play(a){a.currentTime=0;a.play().catch(()=>{})}

//////////////////// MENU ////////////////////

async function carregarLista(){

    let res = await fetch("treinos/index.json?v=" + Date.now());
    let listaTreinos = await res.json();

    let lista = document.getElementById("lista");
    lista.innerHTML = "";

    listaTreinos.forEach(nome=>{
        let d=document.createElement("div");
        d.className="item";
        d.innerText=nome.replace(".json","").replaceAll("_"," ");
        d.onclick=()=>carregarTreino(nome);
        lista.appendChild(d);
    });
}

window.addEventListener("DOMContentLoaded", carregarLista);

async function carregarTreino(nome){

    let res = await fetch("treinos/" + nome + "?v=" + Date.now());
    let dados = await res.json();

    treino = dados.map(e => ({
        nome: e.nome || "",
        grupo: e.grupo || "",
        equipamento: e.equipamento || "",
        tempo: Number(e.tempo) || 0,
        descanso: Number(e.descanso) || 0,
        estado: e.estado || "Treino",
        video: e.video || "",
        Dicas_Tecnica: (e.Dicas_Tecnica ?? "").toString(),
        Erros_Comuns: (e.Erros_Comuns ?? "").toString(),
        Cuidados: (e.Cuidados ?? "").toString()
    }));

    duracaoTotalTreino = 0;
    treino.forEach(e=> duracaoTotalTreino += e.tempo + e.descanso);

    document.getElementById("menu").style.display="none";
    document.getElementById("player").style.display="flex";

    current = 0;
    tempo = 0;
    emExercicio = true;
    pausado = true;
    treinoIniciado = false;

    atualizarUI();
}

//////////////////// WORKOUT ////////////////////

function startWorkout(){

    if(!treinoIniciado){
        treinoIniciado=true;
        pausado=false;
        inicioTreinoReal = Date.now();
        executar();
        return;
    }

    if(pausado){
        // compensar pausa global
        tempoPausadoTotal += Date.now() - momentoPauseGlobal;

        // compensar pausa da fase
        inicioFase = Date.now() - (duracaoAtual - tempo)*1000;

        pausado=false;
    }
}

function pauseWorkout(){
    if(!pausado){
        pausado=true;
        momentoPauseGlobal = Date.now();
    }
}

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

    if(emExercicio){
        tempo = e.tempo;
    }else{
        tempo = e.descanso;
    }

    duracaoAtual = tempo;
    inicioFase = Date.now();
    ultimoBeep = null;

    atualizarUI();

    clearInterval(coachTimer);
    if(emExercicio) iniciarCoach(e);

    intervalo = setInterval(()=>{

        if(pausado) return;

        let decorrido = Math.floor((Date.now() - inicioFase)/1000);
        let restante = duracaoAtual - decorrido;
        if(restante < 0) restante = 0;

        tempo = restante;

        if(
            emExercicio &&
            restante > 0 &&
            restante <= 5 &&
            restante !== ultimoBeep
        ){
            play(beep);
            ultimoBeep = restante;
        }

        atualizarTimer();

        if(restante <= 0){
            clearInterval(intervalo);
            trocar();
        }

    },200);
}

function trocar(){

    clearInterval(intervalo);

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

    document.body.classList.remove("work","rest","final","cooldown");

    if(current >= treino.length){
        document.body.classList.add("final");
    }
    else if(emExercicio){
        if(treino[current].estado === "Cooldown"){
            document.body.classList.add("cooldown");
        }else{
            document.body.classList.add("work");
        }
    }
    else{
        document.body.classList.add("rest");
    }

    const video=document.getElementById("video");
    const e=treino[current];

    if(emExercicio){

        if(e.estado === "Cooldown"){
            document.getElementById("exercise").innerHTML =
                "<div class='coolLabel'>COOLDOWN</div>" + e.nome;
        }else{
            document.getElementById("exercise").innerText = e.nome;
        }

        document.getElementById("phase").innerHTML = icone(e.equipamento);

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

    let decorridoGlobal = Math.floor(
    (Date.now() - inicioTreinoReal - tempoPausadoTotal)/1000
	);

	document.getElementById("elapsed").innerText=format(decorridoGlobal);
}

function mostrarProximo(){

    let n = document.getElementById("next");

    if(current < treino.length - 1){

        let p = treino[current + 1];
        let equipamentoHTML = "";

        if(p.equipamento){
            equipamentoHTML = "<div class='nextEquip'>" +
                              icone(p.equipamento) +
                              "<span>" + p.equipamento + "</span>" +
                              "</div>";
        }

        n.innerHTML =
            "<div class='nextTitle'>A seguir:</div>" +
            "<div class='nextName'><b>" + p.nome + "</b></div>" +
            equipamentoHTML;

    } else {
        n.innerText = "Último exercício";
    }
}

//////////////////// COACH ////////////////////

function iniciarCoach(e){

    let box = document.getElementById("coachBox");
    let tipo = document.getElementById("coachType");
    let texto = document.getElementById("coachText");

    const mensagens = [
        {tipo:"dica", texto:e.Dicas_Tecnica},
        {tipo:"erro", texto:e.Erros_Comuns},
        {tipo:"cuidado", texto:e.Cuidados}
    ].filter(m => m.texto);

    if(mensagens.length === 0){
        box.classList.add("hidden");
        return;
    }

    box.classList.remove("hidden");
    coachIndex = 0;

    clearInterval(coachTimer);

    coachTimer = setInterval(()=>{

        let m = mensagens[coachIndex % mensagens.length];

        box.classList.remove("dica","erro","cuidado");
        box.classList.add(m.tipo);

        tipo.innerText = m.tipo.toUpperCase();
        texto.innerText = m.texto;

        coachIndex++;

    },6000);
}

//////////////////// HELPERS ////////////////////

function icone(eq){
    if(!eq)return"";
    eq=eq.toLowerCase();

    if(eq.includes("halter"))return "<img class='icon' src='icons/halteres.svg'>";
    if(eq.includes("tapete"))return "<img class='icon' src='icons/tapete.svg'>";
    if(eq.includes("multi"))return "<img class='icon' src='icons/multi.svg'>";
    if(eq.includes("elast"))return "<img class='icon' src='icons/elastico.svg'>";
    if(eq.includes("box"))return "<img class='icon' src='icons/box.svg'>";

    return "<img class='icon' src='icons/peso.svg'>";
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