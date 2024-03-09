var txtspeak, utt, selvoices, btnspeak, timerid, txterror, txtlog, timear, strar, arindex, sents, sentsind, start_time, timestart, startind, plainstr = "", otklzap = "Stop", vklzap = "Start";
function initdictation() {
    return "SpeechSynthesisUtterance"in window && (utt = new SpeechSynthesisUtterance,
    !0)
}
function removeOptions(e) {
    var t;
    for (t = e.options.length - 1; 0 <= t; t--)
        e.remove(t)
}
function fillselvoices() {
    var e = speechSynthesis.getVoices();
    removeOptions(selvoices);
    for (var t = 0; t < e.length; t++) {
        var n = document.createElement("option");
        n.text = e[t].name,
        selvoices.add(n)
    }
    selvoices.selectedIndex = 2
}
function nextind(e) {
    writetime(),
    writelog("end of the sentence"),
    sind++,
    speaksent()
}
function speaksent() {
    if (sind >= sents.length)
        return writetime(),
        writelog("end of the subtitle"),
        void (utt.onend = null);
    utt.text = sents[sind],
    utt.onend = nextind,
    writetime(),
    writelog("Start of the " + (sind + 1) + " sentence"),
    speechSynthesis.speak(utt)
}
function speakelem() {
    speechSynthesis.speaking ? logerror("the subtitle " + (arindex + 1) + " will not processed (TTS is busy)") : (null === (sents = strar[arindex].match(/[^\.!\?]+[\.!\?]+/g)) && (sents = [strar[arindex]]),
    sind = 0,
    writetime(),
    writelog("Start of the subtitle " + (arindex + 1)),
    speaksent()),
    arindex++,
    nextar()
}
function nextar() {
    timear.length != arindex && (0 < startind && startind == arindex + 1 ? speakelem() : timerid = setTimeout(speakelem, timear[arindex]))
}
function speakme() {
    txterror.value = "",
    txtlog.value = "",
    stopme(),
    srttometka();
    var e = speechSynthesis.getVoices();
    utt.voice = e.filter(function(e) {
        return e.name == selvoices.options[selvoices.selectedIndex].value
    })[0],
    ttsrange = document.getElementById("ttsrange"),
    utt.rate = ttsrange.value,
    document.getElementById("txtfrom").value ? (arindex = document.getElementById("txtfrom").value - 1,
    startind = arindex + 1,
    start_time = Date.now() - timestart[arindex]) : (startind = arindex = 0,
    start_time = Date.now()),
    writelog("Start"),
    nextar()
}
function stopme() {
    timerid && (clearTimeout(timerid),
    timerid = 0),
    utt.onend = null,
    speechSynthesis.speaking && speechSynthesis.cancel()
}
function srttometka() {
    timear = new Array,
    strar = new Array,
    timestart = new Array;
    var a, e = document.domain, l = 0;
    function t(e, t, n, r, s, i) {
        var o = "";
        return t != c && (o = t + "###" + r,
        a = strtotime(t) - l,
        timear[timear.length] = a,
        l = strtotime(t),
        strar[strar.length] = r,
        timestart[timestart.length] = l),
        o
    }
    var n = /[0-9]+(?:\s)*([0-9][0-9]:[0-9][0-9]:[0-9][0-9],[0-9][0-9][0-9])\s-->\s([0-9][0-9]:[0-9][0-9]:[0-9][0-9],[0-9][0-9][0-9])(?:.*)(?:[\r\n]|[\n])((?:.+(?:[\r\n]|[\n]))+)(?:[\r\n]|[\n])/m
      , r = getdocel().value + "\n\n"
      , s = ""
      , i = r.length
      , c = "00:00:00,000";
    for (-1 == e.indexOf("speech") && e.indexOf("voice") && (r = "00:00:00,000"); s != i; )
        s = i,
        i = (r = r.replace(n, t)).length;
    writelog("Processed " + timear.length + " subtitles")
}
function getdocel() {
    return txtspeak
}
function strtotime(e) {
    var t = e.split(/:|,/)
      , n = 0;
    return n = 3600 * parseInt(t[0]) * 1e3,
    n += 60 * parseInt(t[1]) * 1e3,
    n += 1e3 * parseInt(t[2]),
    n += parseInt(t[3])
}
function msectotime(e) {
    var t = Math.floor(e % 1e3);
    e = (e - t) / 1e3;
    var n = Math.floor(e / 3600)
      , r = e % 3600
      , s = Math.floor(r / 60)
      , i = r % 60
      , o = Math.floor(i);
    return (n < 10 ? "0" + n : n) + ":" + (s < 10 ? "0" + s : s) + ":" + (o < 10 ? "0" + o : o) + "," + (t < 10 ? "00" + t : t < 100 ? "0" + t : t)
}
function logerror(e) {
    txterror.value = txterror.value + e + "\n"
}
function writelog(e) {
    txtlog.value = txtlog.value + e + "\n"
}
function writetime() {
    var e = Date.now() - start_time;
    txtlog.value = txtlog.value + msectotime(e) + " "
}
function selall() {
    txtspeak.select()
}
function toggleme() {
    isred() ? (stopme(),
    setrecbtn(0)) : (speakme(),
    setrecbtn(1))
}
function isred() {
    return "orange" == btnspeak.style.backgroundColor
}
function setrecbtn(e) {
    1 == e ? (btnspeak.style.backgroundColor = "orange",
    btnspeak.value = otklzap) : (btnspeak.style.backgroundColor = "",
    btnspeak.value = vklzap)
}
window.onload = function() {
    txtspeak = document.getElementById("txtspeak"),
    selvoices = document.getElementById("selvoices"),
    btnspeak = document.getElementById("btnspeak"),
    txterror = document.getElementById("txterror"),
    txtlog = document.getElementById("txtlog"),
    initdictation() ? (fillselvoices(),
    setTimeout(fillselvoices, 3e3)) : btnspeak.disabled = !0
}
;
