// http://developerarea.blogspot.com
var socket;
var W = 50;
var H = 40;
var streaks = {};
//var id = 0;

function SocketTarafi(kulIsmi) {
    var socket = io.connect(location.origin);

    socket.on("connect", function () {
        //socket.emit("addUser", kulIsmi);
        socket.emit("addPlayer", kulIsmi);
        $('#isimGirisEkrani').fadeOut("fast", function () {
            $('#chatBolumu').fadeIn("fast");
            if (document.URL.indexOf("admin42") != -1) {
            } else {
                $('#endGame').hide();
                $('#startGame').hide();
            }
            createMap();
        });
    });

//    socket.on('id', function(receivedId) {
//        console.log('received id: ' + receivedId);
//        id = receivedId;
//    });

    socket.on("sendMessage", function (username, data) {
        $('#chatWindow').append("<b style='color:gray;text-decoration: italic;'>" + username + ":</b> " + data + "<br/>");
        $('#chatWindow').scrollTop(10000);
    });

    socket.on("refreshUsers", function (players) {
        $('#users').empty();
//        $.each(data, function (key, value) {
//            $('#users').append("<div>" + key + "</div>");
//        });
        for (id in players) {
            var p = players[id];
            $('#users').append("<div class='player" + id + "'>" + p.name + ' (' + p.totalKills + '/' + p.totalDeaths + ")</div>");
        }
    });

    socket.on("killedBy", function (killed, killer, firstBlood) {
        if (firstBlood) {
            $('audio[src="/sounds/first_blood.mp3"]')[0].play();
        }
        if (killer) {
            if (killer.killStreak == 3) $('audio[src="/sounds/killing_spree.mp3"]')[0].play();
            if (killer.killStreak == 4) $('audio[src="/sounds/dominating.mp3"]')[0].play();
            if (killer.killStreak == 5) $('audio[src="/sounds/mega_kill.mp3"]')[0].play();
            if (killer.killStreak == 6) $('audio[src="/sounds/unstoppable.mp3"]')[0].play();
            if (killer.killStreak == 7) $('audio[src="/sounds/wicked_sick.mp3"]')[0].play();
            if (killer.killStreak == 8) $('audio[src="/sounds/monster_kill.mp3"]')[0].play();
            if (killer.killStreak == 9) $('audio[src="/sounds/godlike.mp3"]')[0].play();
            if (killer.killStreak > 9) $('audio[src="/sounds/holy_shit.mp3"]')[0].play();

            if (typeof streaks[killer.index] === 'undefined') streaks[killer.index] = {kills: 0};
            var counter = streaks[killer.index];
            counter.kills++;
            if (counter.kills >= 2) {
                setTimeout(function () {
                    if (counter.kills == 2) $('audio[src="/sounds/double_kill.mp3"]')[0].play();
                    if (counter.kills == 3) $('audio[src="/sounds/triple_kill.mp3"]')[0].play();
                    if (counter.kills == 4) $('audio[src="/sounds/ultra_kill.mp3"]')[0].play();
                    if (counter.kills == 5) $('audio[src="/sounds/rampage.mp3"]')[0].play();
                    if (counter.kills > 5) $('audio[src="/sounds/ownage.mp3"]')[0].play();
                }, 2200)
            }
            if (counter.timeout) {
                clearTimeout(counter.timeout);
            }
            counter.timeout = setTimeout(function () {
                counter.kills = 0
            }, 6000);
        }
    });

    socket.on('tick', function (diff, players) {
        console.log('tick');
        refreshMap(diff, players);
    });

    $('#sendMessage').click(function () {
        var message = $('#mesaj').val();
        $('#mesaj').val('');
        socket.emit('messageReceived', message);
    });

    $('body').keydown(function (e) {
        var key = e.keyCode || e.which,
            codes = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
        if (key in codes) {
            socket.emit('keypress', codes[key]);
        }
    });

    $('#startGame').click(function () {
        //document.getElementById('ks').play();
        $('audio[src="/sounds/battle_begins.mp3"]')[0].play();
        socket.emit('startGame');
        return false;
    });

    $('#endGame').click(function () {
        socket.emit('endGame');
        return false;
    });
}

function tileSelector(i, j) {
    return '#map tr:nth-child(' + (j + 1) + ') td:nth-child(' + (i + 1) + ')';
}

function refreshMap(diff, players) {
//    var j;
//    var i;
//    for (j = 0; j < H; j++) {
//        for (i = 0; i < W; i++) {
//            $(tileSelector(i, j)).removeClass();
//            if (map[j][i].p > 0) {
//                $(tileSelector(i, j)).removeClass().addClass('player' + map[j][i].p)
//            }
//        }
//    }
    for (var k in diff) {
        //console.log('replacing: ', diff[k].x, diff[k].y, diff[k].p)
        if (diff[k].p == 0) {
            $(tileSelector(diff[k].x, diff[k].y)).removeClass();
        } else if (diff[k].p == -1) {
            $(tileSelector(diff[k].x, diff[k].y)).removeClass().addClass('food');
        } else {
            $(tileSelector(diff[k].x, diff[k].y)).removeClass().addClass('player' + diff[k].p);
        }
    }
}

function createMap() {
    var j;
    var i;
    var html = '<table>';
    for (j = 0; j < H; j++) {
        map[j] = new Array(W);
        html += '<tr>';
        for (i = 0; i < W; i++) {
            html += '<td></td>';
        }
        html += '</tr>';
    }
    html += '</table>';
    $('#map').append(html);
}

$(function () {
    function login() {
        var kulIsmi = $('#txtIsim').val();
        if (kulIsmi === "") {
            alert('Enter your name');
        } else {
            SocketTarafi(kulIsmi);
        }
    }

    $('#btnBaglan').click(login);
    $('#txtIsim').keypress(function (e) {
        if (e.which == 13) {
            login();
        }
    });

    $('#mesaj').keypress(function (e) {
        if (e.which == 13) {
            $('#sendMessage').click();
        }
    });
});