let utt = new SpeechSynthesisUtterance;

let open = document.getElementById("open");
let save = document.getElementById("save");
let rate = document.getElementById("rate");
let list = document.getElementById("list");
let split = document.getElementById("split");
let player = document.getElementById("player");
let selvoices = document.getElementById("selvoices");
let clonedPlayer;

function fillselvoices() {
    selvoices.innerHTML = "";

    var e = speechSynthesis.getVoices().filter(function (e) {
        return e.lang == "pt-BR";
    });

    for (var t = 0; t < e.length; t++) {
        var n = document.createElement("option");
        n.text = e[t].name;
        selvoices.add(n);
    }

    selvoices.selectedIndex = 2;
    selvoices.dispatchEvent(new Event("change"));
}

function speak() {
    utt.rate = player.playbackRate * rate.value;
    if (player.textTracks[0] && player.textTracks[0].activeCues[0])
        utt.text = player.textTracks[0].activeCues[0].text;
    utt.volume = player.volume > 0.8 ? 0 : 1;

    if (!player.paused) {
        console.log('speak', utt.text);
        speechSynthesis.speak(utt);
    }
}

function playme() {
    speechSynthesis.cancel();

    if (player.textTracks[0].activeCues && player.textTracks[0].activeCues[0]) {
        var cue = player.textTracks[0].activeCues[0];
        player.currentTime = cue.startTime;
        speak();
    }
}

function stopme() {
    if (speechSynthesis.speaking)
        speechSynthesis.cancel();
}

function refreshCue() {
    var activeCue = player.textTracks[0].activeCues[0];
    if (activeCue) {
        player.textTracks[0].mode = "hidden";
        player.textTracks[0].mode = "showing";
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
    console.log('Nenhum ponto encontrado', middle);
    return middle;
}

player.addEventListener("play", function () {
    playme();
});

player.addEventListener("pause", function () {
    stopme();
});

player.addEventListener("click", function () {
    if (!player.querySelector('source')) {
        files.click();
        return;
    }
});

player.addEventListener("ratechange", function (e) {
    speechSynthesis.cancel();
    playme();
});

player.addEventListener('timeupdate', function () {
    localStorage.setItem('time', player.currentTime);
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
            player.volume = 0.15;

            track.addEventListener('cuechange', function () {
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

                    speak();
                }
            });

            // track.addEventListener('load', function () {
            //     refreshCue();
            // });

            player.addEventListener('loadeddata', function () {
                refreshCue();
            });
        };

        readerSrt.readAsText(file);
    }
});

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

    for (var i = 0; i < player.textTracks[0].cues.length; i++) {
        var cue = player.textTracks[0].cues[i];

        /**
         * Create a new list item
         */
        var li = document.createElement("li");

        li.setAttribute('index', i);
        li.setAttribute('startTime', cue.startTime);

        /**
         * Create a new div to hold the content
         */
        var time = document.createElement("b");
        var text = document.createElement("div");
        var img = document.createElement('img');
        var subtitle = document.createElement("div");
        var content = document.createElement("div");
        var contentImage = document.createElement("div");

        time.innerHTML = new Date(cue.startTime * 1000).toISOString().substr(11, 8);
        text.innerHTML = cue.text;
        content.classList.add("content");

        subtitle.appendChild(time);
        subtitle.appendChild(text);

        contentImage.appendChild(img);
        content.appendChild(contentImage);
        content.appendChild(subtitle);

        /**
         * Create a new button to split the cue
         */
        var splitButton = document.createElement("button");
        splitButton.innerHTML = "Dividir";

        var combineButton = document.createElement("button");
        // seta para baixo
        combineButton.innerHTML = "Mesclar &#x21A7;";

        var tools = document.createElement("div");
        tools.classList.add("tools");
        tools.appendChild(splitButton);
        tools.appendChild(combineButton);

        /**
         * Append the content to the list item
         */
        li.appendChild(content);
        li.appendChild(tools);

        li.addEventListener("click", function () {
            stopme();
            player.currentTime = 0;
            player.currentTime = parseFloat(this.getAttribute('startTime')) + 1;
            speak();
        });

        splitButton.addEventListener("click", function (e) {
            e.preventDefault();
            var index = this.parentElement.parentElement.getAttribute('index');
            var cue = player.textTracks[0].cues[index];
            splitCue(cue);
            refreshCue();
        });

        combineButton.addEventListener("click", function (e) {
            e.preventDefault();
            var index = this.parentElement.parentElement.getAttribute('index');
            var cue = player.textTracks[0].cues[index];
            var nextCue = player.textTracks[0].cues[parseInt(index) + 1];

            console.log('Cue', index, cue);

            mergeCues(cue, nextCue);
            refreshCue();
        });

        li.addEventListener("dblclick", async function () {
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

async function updateThumbnail() {
    var items = list.querySelectorAll('li');

    clonedPlayer = player.cloneNode(true);

    for (var i = 0; i < items.length; i++) {
        var img = items[i].querySelector('img');
        var startTime = items[i].getAttribute('startTime');
        img.src = await getThumbnailContent(startTime);
    }
}

selvoices.addEventListener("change", function () {
    utt.voice = speechSynthesis.getVoices().filter(function (e) {
        return e.name == selvoices.value;
    })[0];
});

save.addEventListener("click", function () {
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

open.addEventListener("click", function () {
    files.click();
});

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

window.onbeforeunload = function () {
    stopme();
}

fillselvoices();
setTimeout(fillselvoices, 100);
