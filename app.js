var player, currentstr, videofile, txtfrom, ttsrange, txtspeak, utt, selvoices, btnspeak, timerid, txtlog, timear, arindex, sents, sentsind, start_time, timestart, startind, plainstr = "", otklzap = "Parar", vklzap = "Tocar";
var strar = []

function initdictation() {
    return "SpeechSynthesisUtterance" in window && (utt = new SpeechSynthesisUtterance, true);
}

function removeOptions(e) {
    e.innerHTML = "";
}

function fillselvoices() {
    var e = speechSynthesis.getVoices().filter(function (e) {
        return e.lang == "pt-BR";
    });
    removeOptions(selvoices);
    for (var t = 0; t < e.length; t++) {
        var n = document.createElement("option");
        n.text = e[t].name;
        selvoices.add(n);
        btnspeak.disabled = false;
        btnspeak.innerHTML = vklzap;
    }
    selvoices.selectedIndex = 2;
}

function nextind() {
    writetime();
    writelog("Fim da frase");
    sind++;
    speaksent();
}

function speaksent() {
    if (sind >= sents.length) {
        writetime();
        writelog("Fim da legenda");
        utt.onend = null;
        return;
    }
    writelog(sents[sind]);
    utt.text = sents[sind];
    utt.onend = nextind;
    writetime();
    writelog("Início da frase " + (sind + 1));
    speechSynthesis.speak(utt);
}

function speakelem() {
    let text = strar[arindex];
    let limpar = false;
    if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
        text += '.';
        limpar = true;
    }
    if (null === (sents = text.match(/[^\.!\?]+[\.!\?]+/g))) {
        sents = [text];
    }
    if (limpar) {
        sents[sents.length - 1] = sents[sents.length - 1].slice(0, -1);
    }
    // array filter
    sents = sents.filter(function (e) {
        return e.trim().length > 0;
    });
    sind = 0;
    writetime();
    writelog("Início da legenda " + (arindex + 1));
    txtfrom.selectedIndex = arindex + 1;
    updateCurrentStr();
    speaksent();
    arindex++;
    nextar();
}

function updateCurrentStr() {
    if (strar.length)
        currentstr.innerHTML = strar[arindex] || '';
}

function nextar() {
    if (timear.length != arindex) {
        if (startind > 0 && startind == arindex + 1) {
            speakelem();
        } else {
            timeWithRate = timear[arindex] / ttsrange.value;
            timerid = setTimeout(speakelem, timeWithRate);
            // duração do audio em segundos formatado
            writelog("Próxima legenda em " + msectotime(timeWithRate) + " segundos");
        }
    }
}

function speakme() {
    txtlog.value = "";
    stopme();

    var e = speechSynthesis.getVoices();
    utt.voice = e.filter(function (e) {
        return e.name == selvoices.options[selvoices.selectedIndex].value;
    })[0];

    ttsrange = document.getElementById("ttsrange");
    utt.rate = ttsrange.value;

    player.play();

    writelog("Lendo");
    nextar();
}

function stopme() {
    if (timerid) {
        clearTimeout(timerid);
        timerid = 0;
    }
    utt.onend = null;
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    player.pause();
}

function addTimeOption(value, text) {
    var n = document.createElement("option");
    n.text = text;
    n.value = value;
    txtfrom.add(n);
}

function srttometka() {
    txtlog.value = "";

    timear = [];
    strar = [];
    timestart = [];

    var a, e = document.domain, l = 0;
    removeOptions(txtfrom);

    addTimeOption(null, 'Desde o Inicio');

    function t(e, t, n, r, s, i) {
        var o = "";
        if (t != c) {
            o = t + "###" + r;

            a = strtotime(t) - l;
            timear[timear.length] = a;
            l = strtotime(t);
            strar[strar.length] = r;
            timestart[timestart.length] = l;

            addTimeOption(timear.length - 1, t);
        }
        return o;
    }

    var n = /[0-9]+(?:\s)*([0-9][0-9]:[0-9][0-9]:[0-9][0-9],[0-9][0-9][0-9])\s-->\s([0-9][0-9]:[0-9][0-9]:[0-9][0-9],[0-9][0-9][0-9])(?:.*)(?:[\r\n]|[\n])((?:.+(?:[\r\n]|[\n]))+)(?:[\r\n]|[\n])/m,
        r = getdocel().value + "\n\n",
        s = "",
        i = r.length,
        c = "00:00:00,000";

    while (s != i) {
        s = i;
        i = (r = r.replace(n, t)).length;
    }

    writelog(timear.length + " legendas");
    txtfrom.selectedIndex = 0;
    updateCurrentStr();
}

function getdocel() {
    return txtspeak;
}

function strtotime(e) {
    var t = e.split(/:|,/),
        n = 0;
    n = 3600 * parseInt(t[0]) * 1e3;
    n += 60 * parseInt(t[1]) * 1e3;
    n += 1e3 * parseInt(t[2]);
    n += parseInt(t[3]);
    return n;
}

function msectotime(e) {
    var t = Math.floor(e % 1e3);
    e = (e - t) / 1e3;
    var n = Math.floor(e / 3600),
        r = e % 3600,
        s = Math.floor(r / 60),
        i = r % 60,
        o = Math.floor(i);
    return (n < 10 ? "0" + n : n) + ":" + (s < 10 ? "0" + s : s) + ":" + (o < 10 ? "0" + o : o) + "," + (t < 10 ? "00" + t : t < 100 ? "0" + t : t);
}

function writelog(e) {
    txtlog.value += e + "\n";
    console.log(e);
}

function writetime() {
    var e = Date.now() - start_time;
    var time = msectotime(e);
    txtlog.value += time + " ";
    // writelog(time);
}

function toggleme() {
    if (isred()) {
        stopme();
        setrecbtn(0);
    } else {
        seekIgnore = true;
        player.currentTime = (timestart[txtfrom.selectedIndex - 1] / 1000) || 0;

        speakme();
        setrecbtn(1);
    }
}

function isred() {
    return btnspeak.style.backgroundColor === "rgb(244, 67, 54)";
}

function setrecbtn(e) {
    if (e === 1) {
        btnspeak.style.backgroundColor = "rgb(244, 67, 54)";
        btnspeak.innerHTML = otklzap;
    } else {
        btnspeak.style.backgroundColor = "";
        btnspeak.innerHTML = vklzap;
    }
}

player = document.getElementById("player");
videofile = document.getElementById("videofile");
txtfrom = document.getElementById("txtfrom");
ttsrange = document.getElementById("ttsrange");
txtspeak = document.getElementById("txtspeak");
selvoices = document.getElementById("selvoices");
btnspeak = document.getElementById("btnspeak");
txtlog = document.getElementById("txtlog");
currentstr = document.getElementById("currentstr");

videofile.addEventListener("change", function () {
    player.src = URL.createObjectURL(this.files[0]);
    player.load();
});

txtfrom.addEventListener("change", function () {
    arindex = parseInt(this.value);
    seekIgnore = true;

    if (arindex > -1) {
        time = timestart[arindex]
        startind = arindex + 1;
        start_time = Date.now() - time;
        player.currentTime = time / 1000;
    } else {
        startind = arindex = 0;
        start_time = Date.now();
        player.currentTime = 0;
    }

    updateCurrentStr();
});

let seekIgnore = false;
let timeOutSeek = null;

player.addEventListener('seeked', function (e) {
    if (seekIgnore) {
        seekIgnore = false;
        return;
    }

    if (timeOutSeek) {
        clearTimeout(timeOutSeek);
    }

    timeOutSeek = setTimeout(() => {
        var targetIndex = 0;
        var currentTime = player.currentTime * 1000;

        for (var t = 0; t < timestart.length; t++) {
            if (currentTime >= timestart[t]) {
                targetIndex = t;
            }
        }

        txtfrom.selectedIndex = targetIndex
    }, 200);
});

ttsrange.addEventListener("change", function () {
    speed.innerHTML = `${ttsrange.value}x`

    if (speechSynthesis.speaking) {
        utt.rate = ttsrange.value;
    }

    player.playbackRate = ttsrange.value;
})

txtspeak.addEventListener("change", function () {
    srttometka()
})

srtfile.addEventListener("change", function () {
    var e = new FileReader;
    e.onload = function (e) {
        txtspeak.value = e.target.result;
        txtspeak.dispatchEvent(new Event('change'));
    };
    e.readAsText(this.files[0]);
});

player.addEventListener("click", function () {
    videofile.click();
});

if (initdictation()) {
    fillselvoices();
    setTimeout(fillselvoices, 100);
} else {
    btnspeak.disabled = true;
}

txtfrom.dispatchEvent(new Event('change'));
txtspeak.dispatchEvent(new Event('change'));
ttsrange.dispatchEvent(new Event('change'));