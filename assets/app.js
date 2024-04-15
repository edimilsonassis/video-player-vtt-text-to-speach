let tts = window.speechSynthesis;
let utt = new SpeechSynthesisUtterance();

let queue = [];
let isProcessing = false;
let isResumable = false;

let params = {
    rate: localStorage.getItem('rate') || 1.2,
    voice: localStorage.getItem('voice') || "Microsoft Thalita Online (Natural) - Portuguese (Brazil)"
}

console.log('Parâmetros', params);

class Modal {
    show() {
        this.modal.classList.add("show");
        this.modal.dispatchEvent(new Event("show"));
    }

    close() {
        this.modal.classList.remove("show");
        this.modal.dispatchEvent(new Event("close"));
    }

    constructor(element) {
        this.modal = element;
        this.id = element.id;

        this.elements = {
            modal: this.modal,
            content: element.querySelector(".content"),
        }

        /**
         * Close modal
         */
        element.querySelectorAll("[data-dismiss='modal']").forEach((e) => {
            e.addEventListener("click", this.close.bind(this));
        });

        if (!window.modals) {
            window.modals = {};
        }
        window.modals[this.id] = this;
    }
}

let strItem = document.querySelector("ul li");

let btnOpen = document.getElementById("btnOpen");
let btnSave = document.getElementById("btnSave");
let btnConfig = document.getElementById("btnConfig");
let btnCreate = document.getElementById("btnCreate");

let elModalConfig = document.getElementById("config");

let list = document.getElementById("list");
let split = document.getElementById("split");
let player = document.getElementById("player");

var canvasThumb = document.createElement('canvas');
let clonedPlayer;

canvasThumb.width = 160;
canvasThumb.height = 90;

function setNotResumable() {
    isResumable = false;

    tts.cancel();
    console.error('Cancelar narrador');
}

function updateVoice() {
    console.warn('Atualizando voz', params.voice);
    setNotResumable();
    utt.voice = tts.getVoices().filter(function (e) {
        return e.name == params.voice;
    })[0];
}

function getThumbnailContent(startTime) {
    return new Promise((resolve, reject) => {
        clonedPlayer.currentTime = startTime;

        function onSeeked() {
            clonedPlayer.removeEventListener('seeked', onSeeked);
            canvasThumb.getContext('2d').drawImage(clonedPlayer, 0, 0, canvasThumb.width, canvasThumb.height);
            resolve(canvasThumb.toDataURL('image/png'));
        }

        clonedPlayer.addEventListener('seeked', onSeeked);
    });
}

async function processQueue() {
    // console.info('Processando fila', queue.length);

    if (queue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    let [source, startTime] = queue.shift();

    if (source)
        source.src = await getThumbnailContent(startTime);

    processQueue();
}

function getActiveTrack() {
    let track = Array.from(player.textTracks).filter(function (track) {
        return track.mode == "showing";
    })[0];

    if (!track) {
        track = player.textTracks[0];
    }

    return track;
}

function updateList() {
    console.error('Atualizando Lista de Legenda');

    list.innerHTML = "";

    if (!player.textTracks.length)
        return;

    let activeTrack = getActiveTrack();

    let activeCue = activeTrack.activeCues && activeTrack.activeCues[0];
    if (activeCue) {
        player.currentTime = activeCue.startTime;
    }

    for (var i = 0; i < activeTrack.cues.length; i++) {
        let cue = activeTrack.cues[i];

        let li = strItem.cloneNode(true);
        let time = li.querySelector('[name="time"]');
        let subtitle = li.querySelector('[name="subtitle"]');

        let img = li.querySelector('img');
        let editButton = li.querySelector('[name="edit"]');
        let splitButton = li.querySelector('[name="split"]');
        let mergeButton = li.querySelector('[name="merge"]');

        li.setAttribute('index', i);
        li.setAttribute('startTime', cue.startTime);
        li.setAttribute('title', `Início: ${new Date(cue.startTime * 1000).toISOString().substr(11, 8)} - Fim: ${new Date(cue.endTime * 1000).toISOString().substr(11, 8)}`);

        cue.size = 90;
        subtitle.innerHTML = cue.text;
        time.innerHTML = new Date(cue.startTime * 1000).toISOString().substr(11, 8);

        li.addEventListener("click", function () {
            setNotResumable();

            player.currentTime = parseFloat(this.getAttribute('startTime')) + (player.paused ? 0.1 : -0.01);
        });

        editButton.addEventListener("click", async function (e) {
            player.pause();

            let prompt1 = await swal.fire({
                title: 'O que você deseja fazer?',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: `Editar`,
                denyButtonText: `Remover`,
                cancelButtonText: `Cancelar`,
            })

            if (prompt1.isDismissed)
                return;

            if (prompt1.isDenied) {
                let activeTrack = getActiveTrack();
                let index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
                let cue = activeTrack.cues[index];
                activeTrack.removeCue(cue);
                refreshCue();
                return;
            }

            let li = this.parentElement.parentElement.parentElement.parentElement;
            var index = li.getAttribute('index');
            var cue = activeTrack.cues[index];

            let prompt2 = await swal.fire({
                animation: false,
                title: 'Editar legenda',
                input: 'textarea',
                inputValue: cue.text,
                inputAttributes: {
                    autocapitalize: 'off',
                    required: true,
                    height: 300,
                    rows: cue.text.length / 20
                },
                showCancelButton: true,
                confirmButtonText: 'Salvar',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Você precisa escrever algo!'
                    }
                }
            });

            if (prompt2.value) {
                console.info('Editando');
                cue.text = prompt2.value;
                refreshCue();
                // updateList();
            }
        });

        mergeButton.addEventListener("mouseenter", function () {
            let index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
            let cue = activeTrack.cues[index];
            let nextCue = activeTrack.cues[parseInt(index) + 1];

            if (!nextCue) {
                this.disabled = true;
                return;
            }

            let next = this.parentElement.parentElement.parentElement.parentElement.nextElementSibling;
            next && next.classList.add("mergeble");
        });

        mergeButton.addEventListener("mouseleave", function () {
            let next = this.parentElement.parentElement.parentElement.parentElement.nextElementSibling;
            next && next.classList.remove("mergeble");
        });

        splitButton.addEventListener("click", function (e) {
            e.preventDefault();
            var index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
            var cue = activeTrack.cues[index];
            splitCue(cue);
            updateList();
        });

        mergeButton.addEventListener("click", function (e) {
            e.preventDefault();
            var index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
            var cue = activeTrack.cues[index];
            var nextCue = activeTrack.cues[parseInt(index) + 1];

            mergeCues(cue, nextCue);
            updateList();
        });

        img.addEventListener("load", async function (e) {
            e.target.removeEventListener(e.type, arguments.callee);
            let startTime = li.getAttribute('startTime');
            queue.push([this, startTime]);

            if (!isProcessing) {
                processQueue();
            }
        });

        list.appendChild(li);
    }
}

function mergeCues(cue1, cue2) {
    let startTime = cue1.startTime;
    let endTime = cue2.endTime;

    // if first cue ends with a dot and second cue starts with a lowercase letter, remove the dot
    if (cue1.text.endsWith(".") && /^[a-z]/.test(cue2.text)) {
        cue1.text = cue1.text.substring(0, cue1.text.length - 1);
    }

    let text = cue1.text + " " + cue2.text;
    let activeTrack = getActiveTrack();

    activeTrack.removeCue(cue1);
    activeTrack.removeCue(cue2);

    let cue = new VTTCue(startTime, endTime, text);
    activeTrack.addCue(cue);
}

function splitCueInTwo(startTime, endTime, captionText, middle) {
    const totalLength = captionText.length;
    const middlePercentage = middle / totalLength;
    const totalTime = endTime - startTime;

    const firstCueTime = totalTime * middlePercentage;
    const firstCueText = captionText.substring(0, middle);
    const secondCueText = captionText.substring(middle);

    return [
        {
            startTime: startTime,
            endTime: startTime + firstCueTime - 0.1,
            text: firstCueText.trim()
        },
        {
            startTime: startTime + firstCueTime + 0.1,
            endTime: endTime,
            text: secondCueText.trim()
        }
    ];
}

function splitCue(activeCue) {
    if (activeCue) {
        let captionText = activeCue.text;

        let middle = findLastDotInHalf(captionText);
        let newCues = splitCueInTwo(activeCue.startTime, activeCue.endTime, captionText, middle);
        let activeTrack = getActiveTrack();

        if (newCues[1].text.length < 1) {
            console.warn('Texto muito curto', newCues[1].text, newCues[1].text.length);
            return;
        }

        activeTrack.removeCue(activeCue);

        newCues.forEach(function (newCue) {
            let cue = new VTTCue(newCue.startTime, newCue.endTime, newCue.text);
            activeTrack.addCue(cue);
        });
    }
}

function refreshCue() {
    console.warn('Atualizando Exibição de Legenda');
    let activeTrack = getActiveTrack();

    if (activeTrack) {
        activeTrack.mode = "hidden";
        activeTrack.mode = "showing";
    }

    updateList();
}

function findLastDotInHalf(text) {
    // split in half
    const totalLength = text.length;
    const middle = Math.round(totalLength / 2);
    const firstHalf = text.substring(0, middle);
    const secondHalf = text.substring(middle);

    // find last dot in first half
    const lastDot = firstHalf.lastIndexOf(".");
    if (lastDot > -1) {
        return lastDot + 1;
    }

    // find first dot in second half
    const firstDot = secondHalf.indexOf(".");
    if (firstDot > -1) {
        return middle + firstDot + 1;
    }

    // no dot found
    console.info('Nenhum ponto encontrado', middle);
    return middle;
}

let webVTT = `WEBVTT`;

function newTrack(base64String = btoa(webVTT), label = 'Legenda.pt') {
    var track = document.createElement('track');
    track.src = "data:text/vtt;base64," + base64String;
    track.kind = "subtitles";
    track.label = label;

    track.track.mode = label.indexOf(".pt") > -1 ? "showing" : "hidden";

    player.appendChild(track);

    track.track.addEventListener('cuechange', function () {
        var cue = this.activeCues[0];

        if (cue && this.mode == "showing") {
            var active = list.querySelector(".active");
            if (active) {
                active.classList.remove("active");
            }

            var li = list.querySelector(`[startTime="${cue.startTime}"]`);
            if (li) {
                li.classList.add("active");
                li.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            // console.info(`Inicio da legenda: ${new Date(cue.startTime * 1000).toISOString().substr(11, 8)}`);
            // console.info(`${cue.text}`);

            utt.text = cue.text;
            speak();
        }
    });

    return track.track;
}

let elToCrop = document.getElementById("toCrop");
let elCropBox = document.getElementById("cropBox");
let cutCanvas = document.createElement("canvas");
let pnp = document.getElementById("pnp");

async function workOCR(file) {
    const worker = await Tesseract.createWorker('por');

    const ret = await worker.recognize(file);
    const result = ret.data.text.replaceAll(`\n`, ' ')

    await worker.terminate();

    return result;
}


elToCrop.addEventListener("mousedown", function (e) {
    e.preventDefault();

    elCropBox.style.left = e.clientX + "px";
    elCropBox.style.top = e.clientY + "px";

    var x = e.clientX;
    var y = e.clientY;

    function onMouseMove(e) {
        // elCropBox.style.width = e.clientX - x + "px";
        // elCropBox.style.height = e.clientY - y + "px";

        if (e.clientX < x) {
            elCropBox.style.left = e.clientX + "px";
            elCropBox.style.width = x - e.clientX + "px";
        }

        if (e.clientY < y) {
            elCropBox.style.top = e.clientY + "px";
            elCropBox.style.height = y - e.clientY + "px";
        }

        if (e.clientX > x) {
            elCropBox.style.width = e.clientX - x + "px";
        }

        if (e.clientY > y) {
            elCropBox.style.height = e.clientY - y + "px";
        }
    }

    function onMouseUp(e) {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        var cropCanvas = document.createElement("canvas");
        cropCanvas.width = elCropBox.offsetWidth;
        cropCanvas.height = elCropBox.offsetHeight;

        var context = cropCanvas.getContext('2d');

        // context.drawImage(elToCrop, x, y, cropCanvas.width, cropCanvas.height, 0, 0, cropCanvas.width, cropCanvas.height);
        context.drawImage(elToCrop, elCropBox.offsetLeft, elCropBox.offsetTop, elCropBox.offsetWidth, elCropBox.offsetHeight, 0, 0, cropCanvas.width, cropCanvas.height);

        image = cropCanvas.toDataURL('image/png');
        pnp.src = image;

        showOCRContainer(false);

        workOCR(cropCanvas).then(function (result) {
            console.info('Texto extraído', result);

            let activeTrack = getActiveTrack() || newTrack();

            let cue = new VTTCue(player.currentTime, player.duration - 1, result);
            activeTrack.addCue(cue);
            refreshCue();

            if (!player.previousStatePaused)
                player.play();
        });
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
})

function showOCRContainer(active) {
    if (active)
        swal.fire({
            title: 'Clique e arraste para selecionar a área de texto',
            position: 'top-end',
            timerProgressBar: true,
            toast: true,
            timer: 2000,
        });

    elCropBox.style.width = "0px";
    elCropBox.style.height = "0px";
    elCropBox.style.top = "0px";
    elCropBox.style.left = "0px";

    let container = document.getElementById("ocrContainer");
    container.classList.toggle("hide", !active);
}

function createCueByOCR() {
    let activeTrack = getActiveTrack();
    let cue = activeTrack.activeCues[0];

    if (cue) {
        cue.endTime = player.currentTime;
    }

    cutCanvas.width = player.videoWidth;
    cutCanvas.height = player.videoHeight;
    var context = cutCanvas.getContext('2d');
    context.drawImage(player, 0, 0, cutCanvas.width, cutCanvas.height);

    elToCrop.src = cutCanvas.toDataURL('image/png');

    showOCRContainer(true);
}

function speak() {
    if (player.paused) {
        console.warn('Player pausado');
        return;
    }

    swal.close();

    utt.rate = player.playbackRate * params.rate;
    utt.volume = player.volume != 1 || player.muted ? 1 : 0;

    if (isResumable) {
        console.log('Resumindo');
        tts.resume();
        isResumable = false;
        return;
    }

    // console.warn(utt.text);

    tts.speak(utt);
    return utt;
}

async function tryAgain() {
    isResumable = false;
    player.removeEventListener("pause", tryAgain);

    await swal.fire({
        title: 'carregando...',
        // toast: true,
        timerProgressBar: true,
        backdrop: true,
        timer: 1000,
        showConfirmButton: false,
    });

    player.play();
}

utt.onerror = function (e) {
    if (e.error == "interrupted")
        return;

    console.error('Erro ao falar', e);

    player.addEventListener("pause", tryAgain);
    player.pause();
    setNotResumable();
}

player.addEventListener("play", function () {
    if (!getActiveTrack().cues.length) {
        console.info('Nenhuma legenda');
        return;
    }

    let cue = player.textTracks[0].activeCues[0];
    if (cue && !isResumable && (player.currentTime > cue.startTime + 0.15)) {
        console.error('Reiniciando narrador', player.currentTime, cue.startTime + 0.15);
        setNotResumable();
        player.currentTime = cue.startTime;
    }

    console.info('Iniciando narrador');
    speak();
});

player.addEventListener("pause", function () {

});

player.addEventListener("click", function () {
    if (!player.paused) {
        isResumable = true;
        tts.pause();
    }
});

player.addEventListener("click", function () {
    if (!player.querySelector('source')) {
        files.click();
        return;
    }
});

player.addEventListener("ratechange", function (e) {
    console.info('Velocidade', player.playbackRate);
    let activeTrack = getActiveTrack();
    let cue = activeTrack.activeCues[0];
    player.currentTime = cue.startTime;
    setNotResumable();
    localStorage.setItem('playbackRate', player.playbackRate);
    // speak();
});

player.addEventListener('timeupdate', function () {
    localStorage.setItem('time', player.currentTime);
});

player.addEventListener("seeked", function () {
    isResumable = false;
});

player.addEventListener('loadeddata', function () {
    refreshCue();
});

files.addEventListener("change", function () {
    if (!this.files.length)
        return;

    player.querySelectorAll('track').forEach(function (e) {
        e.remove();
    });

    for (var i = 0; i < this.files.length; i++) {
        let file = this.files[i];

        if (file.type == "video/mp4" || file.type == "audio/mpeg" || file.name.indexOf(".m3u8") > -1) {
            player.querySelectorAll('source').forEach(function (e) {
                e.remove();
            });

            var source = document.createElement('source');
            source.src = URL.createObjectURL(file);
            source.type = file.type;
            player.appendChild(source);

            player.load();
            clonedPlayer = player.cloneNode(true);

            let time = localStorage.getItem('time');
            time && (player.currentTime = time);

            player.playbackRate = localStorage.getItem('playbackRate') || 1;

            continue;
        }

        var readerSrt = new FileReader();

        readerSrt.onload = function (e) {
            var fileContent = e.target.result;
            var uint8Array = new TextEncoder().encode(fileContent);
            var base64String = btoa(String.fromCharCode.apply(null, uint8Array));

            newTrack(base64String, file.name.replace(".vtt", ""));
        };

        readerSrt.readAsText(file);
    }
});

btnOpen.addEventListener("click", function () {
    files.click();
});

btnCreate.addEventListener("click", async function () {
    let prompt = await swal.fire({
        title: 'Criar legenda',
        showDenyButton: true,
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: 'Manual',
        denyButtonText: 'OCR',
        cancelButtonText: 'Cancelar',
    });

    player.previousStatePaused = player.paused;
    player.pause();
    setNotResumable();

    if (prompt.isDenied) {
        createCueByOCR();
        return;
    }

    if (prompt.isConfirmed) {
        let activeTrack = getActiveTrack() || newTrack();
        let cue = new VTTCue(player.currentTime, player.currentTime - 1, "Nova legenda");
        activeTrack.addCue(cue);
        refreshCue();
    }
});

btnSave.addEventListener("click", function () {
    let vtt = "WEBVTT\n\n";
    let activeTrack = getActiveTrack();
    let cues = activeTrack.cues;
    for (var i = 0; i < cues.length; i++) {
        let cue = cues[i];
        vtt += new Date(cue.startTime * 1000).toISOString().substr(11, 8) + ".000 --> " + new Date(cue.endTime * 1000).toISOString().substr(11, 8) + ".000\n";
        vtt += cue.text + "\n\n";
    }

    let blob = new Blob([vtt], { type: "text/vtt" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${activeTrack.label}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
});

window.onbeforeunload = function () {
    tts.cancel();
}

function loadConfig() {
    let modalConfig = new Modal(elModalConfig);

    modalConfig.modal.addEventListener("show", function () {
        player.previousStatePaused = player.paused;
        if (!player.paused)
            player.pause();
    });

    modalConfig.modal.addEventListener("close", function () {
        if (!player.previousStatePaused) {
            setNotResumable();
            player.play();
        }
    });

    let labelRate = document.getElementById("labelRate");
    let configRate = document.getElementById("configRate");
    let configVoice = document.getElementById("configVoice");

    setTimeout(() => {
        var voicesBR = tts.getVoices().filter(function (e) {
            return e.lang == "pt-BR";
        });

        configVoice.innerHTML = "";

        voicesBR.forEach(function (e) {
            var option = document.createElement("option");
            option.value = e.name;
            option.innerHTML = e.name;

            if (e.name == params.voice)
                option.selected = true;

            configVoice.appendChild(option);
        });

        updateVoice();
    }, 500);

    configVoice.addEventListener("change", function () {
        params.voice = this.value;
        localStorage.setItem('voice', this.value);
        updateVoice();
    });

    btnConfig.addEventListener("click", async function () {
        modalConfig.show();
    });

    configRate.addEventListener("input", function () {
        let percent = (this.value * 100).toFixed(0) + "%";
        labelRate.innerHTML = percent;
        params.rate = this.value;

        localStorage.setItem('rate', this.value);
    });

    configRate.value = params.rate;
    configRate.dispatchEvent(new Event("input"));
}

player.muted = true;
list.innerHTML = "";
loadConfig();

