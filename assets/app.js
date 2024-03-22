let tts = window.speechSynthesis;
let utt = new SpeechSynthesisUtterance;

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

let btnOpen = document.getElementById("btnOpen");
let btnSave = document.getElementById("btnSave");
let btnConfig = document.getElementById("btnConfig");

let config = document.getElementById("config");

let list = document.getElementById("list");
let split = document.getElementById("split");
let player = document.getElementById("player");
let clonedPlayer;

async function updateThumbnail() {
    var items = list.querySelectorAll('li');

    clonedPlayer = player.cloneNode(true);

    for (var i = 0; i < items.length; i++) {
        var img = items[i].querySelector('img');
        var startTime = items[i].getAttribute('startTime');
        img.src = await getThumbnailContent(startTime);
    }
}

function updateVoice() {
    utt.voice = tts.getVoices().filter(function (e) {
        return e.name == params.voice;
    })[0];
}

function getThumbnailContent(startTime) {
    return new Promise((resolve, reject) => {
        clonedPlayer.currentTime = startTime;

        // Função para ser chamada quando o vídeo terminar de buscar
        function onSeeked() {
            var canvas = document.createElement('canvas');
            canvas.width = clonedPlayer.videoWidth;
            canvas.height = clonedPlayer.videoHeight;
            canvas.getContext('2d').drawImage(clonedPlayer, 0, 0, canvas.width, canvas.height);
            var data = canvas.toDataURL('image/png');

            // Remova o evento listener para evitar vazamentos de memória
            clonedPlayer.removeEventListener('seeked', onSeeked);

            resolve(data);
        }

        // Adicione o evento listener
        clonedPlayer.addEventListener('seeked', onSeeked);
    });
}

function updateList() {
    list.innerHTML = "";

    if (!player.textTracks.length)
        return;

    for (var i = 0; i < player.textTracks[0].cues.length; i++) {
        var cue = player.textTracks[0].cues[i];

        cue.size = 90;

        /**
         * Create a new list item
         */
        var li = document.createElement("li");

        li.setAttribute('index', i);
        li.setAttribute('startTime', cue.startTime);

        /**
         * Create a new div to hold the content
         */
        var time = document.createElement("span");
        var text = document.createElement("div");
        var img = document.createElement('img');

        var subtitle = document.createElement("div");
        var content = document.createElement("div");
        var contentImage = document.createElement("div");

        var tools = document.createElement("div");
        var splitButton = document.createElement("button");
        var mergeButton = document.createElement("button");

        splitButton.innerHTML = `<svg aria-hidden="true" fill="currentColor" class="___12fm75w f1w7gpdv fez10in fg4l7m0" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.92 2.23a.5.5 0 0 0-.84.54L9.4 9.43l-1.92 2.96a3 3 0 1 0 .78.64L10 10.35l1.74 2.68a3 3 0 1 0 .78-.64L5.92 2.23ZM14 17a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4 15a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm7.2-6.49-.6-.92 3.48-5.36a.5.5 0 0 1 .84.54l-3.73 5.74Z" fill="currentColor"></path></svg>`;
        mergeButton.innerHTML = `<svg aria-hidden="true" fill="currentColor" class="___12fm75w f1w7gpdv fez10in fg4l7m0" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 4.5c0 .17-.02.34-.05.5H10a1 1 0 0 1 1 1v2h-1a2 2 0 0 0-2 2v1H6a1 1 0 0 1-1-1V6.95a2.51 2.51 0 0 1-1 0V10c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h3.05a2.51 2.51 0 0 1 0-1H10a1 1 0 0 1-1-1v-2h1a2 2 0 0 0 2-2V9h2a1 1 0 0 1 1 1v3.05a2.51 2.51 0 0 1 1 0V10a2 2 0 0 0-2-2h-2V6a2 2 0 0 0-2-2H6.95c.03.16.05.33.05.5ZM11 9v1a1 1 0 0 1-1 1H9v-1a1 1 0 0 1 1-1h1ZM6 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm11 11a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0-11a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-11 11a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor"></path></svg>`;

        splitButton.title = "Dividir a legenda em duas partes";
        mergeButton.title = "Mesclar com a próxima legenda";
        time.innerHTML = new Date(cue.startTime * 1000).toISOString().substr(11, 8);
        time.classList.add("time");

        mergeButton.addEventListener("mouseenter", function () {
            let index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
            let cue = player.textTracks[0].cues[index];
            let nextCue = player.textTracks[0].cues[parseInt(index) + 1];

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

        tools.appendChild(time);
        tools.classList.add("tools");
        tools.appendChild(splitButton);
        tools.appendChild(mergeButton);

        text.innerHTML = cue.text;
        content.classList.add("content");
        subtitle.classList.add("subtitle");
        subtitle.appendChild(text);

        contentImage.classList.add("content-image");
        contentImage.appendChild(img);
        contentImage.appendChild(tools);

        content.appendChild(contentImage);
        content.appendChild(subtitle);
        li.appendChild(content);

        li.addEventListener("click", function () {
            tts.cancel();
            player.currentTime = parseFloat(this.getAttribute('startTime'));

            let cue = player.textTracks[0].cues[this.getAttribute('index')];
            utt.text = cue.text;
            speak();
        });

        splitButton.addEventListener("click", function (e) {
            e.preventDefault();
            var index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
            var cue = player.textTracks[0].cues[index];
            splitCue(cue);
            refreshCue();
        });

        mergeButton.addEventListener("click", function (e) {
            e.preventDefault();
            var index = this.parentElement.parentElement.parentElement.parentElement.getAttribute('index');
            var cue = player.textTracks[0].cues[index];
            var nextCue = player.textTracks[0].cues[parseInt(index) + 1];

            mergeCues(cue, nextCue);
            refreshCue();
        });

        li.addEventListener("dblclick", async function () {
            player.pause();

            var index = this.getAttribute('index');
            var cue = player.textTracks[0].cues[index];

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
                cue.text = prompt.value;
                refreshCue();
            }
        });

        list.appendChild(li);
    }

    updateThumbnail();
}

function mergeCues(cue1, cue2) {
    var startTime = cue1.startTime;
    var endTime = cue2.endTime;

    // if first cue ends with a dot and second cue starts with a lowercase letter, remove the dot
    if (cue1.text.endsWith(".") && /^[a-z]/.test(cue2.text)) {
        cue1.text = cue1.text.substring(0, cue1.text.length - 1);
    }

    var text = cue1.text + " " + cue2.text;

    player.textTracks[0].removeCue(cue1);
    player.textTracks[0].removeCue(cue2);

    var cue = new VTTCue(startTime, endTime, text);
    player.textTracks[0].addCue(cue);
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
        var captionText = activeCue.text;

        var middle = findLastDotInHalf(captionText);
        var newCues = splitCueInTwo(activeCue.startTime, activeCue.endTime, captionText, middle);

        if (newCues[1].text.length < 1) {
            console.log('Texto muito curto', newCues[1].text, newCues[1].text.length);
            return;
        }

        player.textTracks[0].removeCue(activeCue);

        newCues.forEach(function (newCue) {
            var cue = new VTTCue(newCue.startTime, newCue.endTime, newCue.text);
            player.textTracks[0].addCue(cue);
        });

    }
}

function captureVideoFrame() {
    var canvas = document.createElement('canvas');
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    canvas.getContext('2d').drawImage(player, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

function refreshCue() {
    if (!player.textTracks.length)
        return updateList();

    player.textTracks[0].mode = "hidden";
    player.textTracks[0].mode = "showing";
}

function speak() {
    utt.rate = player.playbackRate * params.rate;
    utt.volume = player.volume != 1 ? 1 : 0;

    if (tts.isPaused) {
        tts.resume();
        tts.isPaused = false;
        return;
    }

    if (!player.paused) {
        tts.speak(utt);
    }
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
    console.log('Nenhum ponto encontrado', middle);
    return middle;
}

player.addEventListener("play", function () {
    console.log('Play');

    if (!player.textTracks[0].cues.length) {
        console.log('Nenhuma legenda');
        return;
    }

    let cue = player.textTracks[0].activeCues[0];
    if (cue && !tts.isPaused && player.currentTime != cue.startTime) {
        tts.cancel();
        player.currentTime = cue.startTime;
    }

    speak();
});

player.addEventListener("pause", function () {
    console.log('Pausado');

    tts.pause();
    tts.isPaused = true;
});

player.addEventListener("click", function () {
    if (!player.querySelector('source')) {
        files.click();
        return;
    }
});

player.addEventListener("ratechange", function (e) {
    var cue = player.textTracks[0].activeCues[0];
    player.currentTime = cue.startTime;
    tts.cancel();
    tts.isPaused = false;
    speak();
});

player.addEventListener('timeupdate', function () {
    localStorage.setItem('time', player.currentTime);
});

player.addEventListener("seeked", function () {
    console.log('Seeked');
    tts.isPaused = false;
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

            if (file.name.indexOf("pt") > -1)
                track.mode = "showing";

            player.appendChild(track);
            player.volume = 0;

            track.addEventListener('cuechange', function () {
                console.log('Mudou a legenda');

                utt.text = "";
                var cue = this.track.activeCues[0];

                if (cue) {
                    var active = list.querySelector(".active");
                    if (active) {
                        active.classList.remove("active");
                    }

                    var li = list.querySelector(`[startTime="${cue.startTime}"]`);
                    if (li) {
                        li.classList.add("active");
                        li.scrollIntoView({ behavior: "smooth", block: "center" });
                    }

                    utt.text = cue.text;
                    speak();
                }
            });

            track.addEventListener('load', function () {
                updateList();
            });

            refreshCue();
        };

        readerSrt.readAsText(file);
    }
});

btnOpen.addEventListener("click", function () {
    files.click();
});

btnSave.addEventListener("click", function () {
    var vtt = "WEBVTT\n\n";
    var cues = player.textTracks[0].cues;
    for (var i = 0; i < cues.length; i++) {
        var cue = cues[i];
        vtt += new Date(cue.startTime * 1000).toISOString().substr(11, 8) + ".000 --> " + new Date(cue.endTime * 1000).toISOString().substr(11, 8) + ".000\n";
        vtt += cue.text + "\n\n";
    }

    var blob = new Blob([vtt], { type: "text/vtt" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = `${player.textTracks[0].label}.vtt`;
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
            tts.isPaused = false;
            player.play();
        }
    });

    let labelRate = document.getElementById("labelRate");
    let configRate = document.getElementById("configRate");
    let configVoice = document.getElementById("configVoice");

    configVoice.innerHTML = "";

    tts.onvoiceschanged = function () {
        var voicesBR = tts.getVoices().filter(function (e) {
            return e.lang == "pt-BR";
        });

        voicesBR.forEach(function (e) {
            var option = document.createElement("option");
            option.value = e.name;
            option.innerHTML = e.name;

            if (e.name == params.voice)
                option.selected = true;

            configVoice.appendChild(option);
        });

        updateVoice();
    };

    configVoice.addEventListener("input", function () {
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

loadConfig();
