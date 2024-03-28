let tts = window.speechSynthesis;
let utt = new SpeechSynthesisUtterance();

let queue = [];
let isProcessing = false;
let isResumable = false;

let params = {
    rate: 1.2,
    voice: "Microsoft Thalita Online (Natural) - Portuguese (Brazil)"
}

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

let config = document.getElementById("config");

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


    let activeCue = activeTrack.activeCues[0];
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

            let li = this.parentElement.parentElement.parentElement.parentElement;
            var index = li.getAttribute('index');
            var cue = activeTrack.cues[index];

            let prompt = await swal.fire({
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

            if (prompt.value) {
                console.info('Editando');
                cue.text = prompt.value;
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

    activeTrack.mode = "hidden";
    activeTrack.mode = "showing";

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
    tts.pause();
    isResumable = true;
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

            continue;
        }

        var readerSrt = new FileReader();

        readerSrt.onload = function (e) {
            var fileContent = e.target.result;
            var uint8Array = new TextEncoder().encode(fileContent);
            var base64String = btoa(String.fromCharCode.apply(null, uint8Array));

            var track = document.createElement('track');
            track.src = "data:text/vtt;base64," + base64String;
            track.kind = "subtitles";
            track.label = file.name.replace(".vtt", "");

            track.track.mode = file.name.indexOf(".pt") > -1 ? "showing" : "hidden";

            player.appendChild(track);
            player.volume = 0;

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
        };

        readerSrt.readAsText(file);
    }
});

btnOpen.addEventListener("click", function () {
    files.click();
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
    let modal = new Modal(config);

    modal.modal.addEventListener("show", function () {
        player.previousStatePaused = player.paused;
        if (!player.paused)
            player.pause();
    });

    modal.modal.addEventListener("close", function () {
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
        updateVoice();
    });

    btnConfig.addEventListener("click", async function () {
        modal.show();
    });

    configRate.addEventListener("input", function () {
        let percent = (this.value * 100).toFixed(0) + "%";
        labelRate.innerHTML = percent;
        params.rate = this.value;
    });

    configRate.dispatchEvent(new Event("input"));
}

list.innerHTML = "";
loadConfig();
