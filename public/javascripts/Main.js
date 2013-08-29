// http://developerarea.blogspot.com
var socket;
var W = 50;
var H = 40;
//var id = 0;

function SocketTarafi(kulIsmi) {
    var socket = io.connect(location.origin);

    socket.on("connect", function () {
        //socket.emit("addUser", kulIsmi);
        socket.emit("addPlayer", kulIsmi);
        $('#isimGirisEkrani').fadeOut("fast", function () {
            $('#chatBolumu').fadeIn("fast");
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
            $('#users').append("<div class='player"+id+"'>" + players[id].name + "</div>");
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
        document.getElementById('ks').play();
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