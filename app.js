/**
 *  Bu kısım otomatik Express tarafından yaratıldı.
 *  Ilker Guller
 *  http://developerarea.blogspot.com
 */

/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);

// Bu Kısmı ben ekledim.
app.get('/chatPage', routes.chatPage);

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

/**
 * Yukarıdaki kısım otomatik Express tarafından yaratıldı.
 * Ilker Guller
 * http://developerarea.blogspot.com
 */

var io = require('socket.io').listen(app);
//var users = {};
var players = {};
var W = 50;
var H = 40;
var map = new Array(H);
var diff = [];
var gameOver = false;
var tickTimeout = undefined;
var tickNb = 0;
var delta = 0;

io.sockets.on('connection', function (socket) {
//    socket.on("addUser", function (username) {
//        socket.userName = username;
//        socket.userId = users.length;
//
//        users[username] = {
//            userName: username,
//            userId: users.length
//        };
//
//        socket.emit("sendMessage", "System", "Welcome.");
//        socket.broadcast.emit("sendMessage", "System", username + " has joined the game.");
//        io.sockets.emit("refreshUsers", users);
//    });

    socket.on('addPlayer', function (name) {
        //var id = players.length;
        var id = Object.keys(players).length + 1;
        socket.name = name;
        socket.id = id;
        players[id] = new Player({name: name,
            id: id,
            head: {x: (id) * 2, y: 2}});

        //socket.emit('playerId', id);
        socket.emit("sendMessage", "System", "Welcome.");
        socket.broadcast.emit("sendMessage", "System", name + " has joined the game (2).");
        io.sockets.emit("refreshUsers", players);
    });

    socket.on("disconnect", function () {
        delete players[socket.id];
        //delete users[socket.userName];
        io.sockets.emit("refreshUsers", users);
        socket.broadcast.emit("sendMessage", "System", socket.userName + " has left the game");
    });

    socket.on('startGame', function () {
        clearTimeout(tickTimeout);
        gameOver = false;
        init();
        io.sockets.emit('tick', diff, players);
        tick();
    });

    socket.on('endGame', function () {
        gameOver = true;
    });

    socket.on("messageReceived", function (data) {
        io.sockets.emit("sendMessage", socket.name, data);
    });

    socket.on('keypress', function (code) {
        if (!players[socket.id]) return;

        var pdir = players[socket.id].p_direction;
        if (code == 'left' && pdir.x != 1 && pdir.y != 0) {
            players[socket.id].direction.x = -1;
            players[socket.id].direction.y = 0;
        }
        if (code == 'right' && pdir.x != -1 && pdir.y != 0) {
            players[socket.id].direction.x = 1;
            players[socket.id].direction.y = 0;
        }
        if (code == 'up' && pdir.x != 0 && pdir.y != 1) {
            players[socket.id].direction.x = 0;
            players[socket.id].direction.y = -1;
        }
        if (code == 'down' && pdir.x != 0 && pdir.y != -1) {
            players[socket.id].direction.x = 0;
            players[socket.id].direction.y = 1;
        }
    });

    /**
     * Returns a random number between min and max
     */
    function getRandomArbitary(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    function updateWorld() {
        console.log('=== updateMap');
        diff = [];

        for (var k in players) {
            //checkResurrect(players[k]);
            if (!players[k].alive) {
                continue;
            }
            console.log('==========', players[k].head.x, players[k].head.y, k);
            players[k].head.x += players[k].direction.x;
            players[k].head.y += players[k].direction.y;
            players[k].p_direction = players[k].direction
            if (players[k].head.x >= W || players[k].head.x < 0 ||
                players[k].head.y >= H || players[k].head.y < 0) {
                players[k].alive = false;
                socket.broadcast.emit("sendMessage", "System", players[k].name + " is dead (out of map)");
                continue;
            }
            if (map[players[k].head.y][players[k].head.x].c > 0) {
                players[k].alive = false;
                socket.broadcast.emit("sendMessage", "System", players[k].name + " pwned by " +
                    players[map[players[k].head.y][players[k].head.x].p].name);
                continue;
            }
            if (map[players[k].head.y][players[k].head.x].p == -1) {
                players[k].snake_len = players[k].snake_len + 1;
            }
            map[players[k].head.y][players[k].head.x].c = players[k].snake_len;
            map[players[k].head.y][players[k].head.x].p = k;
            diff.push({x: players[k].head.x, y: players[k].head.y, p: k});
        }

        // food
        if (getRandomArbitary(0, 100) < 5) {
            var x = getRandomArbitary(0, W - 1);
            var y = getRandomArbitary(0, H - 1);
            if (map[y][x].p == 0) {
                map[y][x].p = -1;
                diff.push({x: x, y: y, p: -1});
            }
        }

        var j;
        var i;
        var oldC;
        for (j = 0; j < H; j++) {
            for (i = 0; i < W; i++) {
                oldC = map[j][i].c;
                map[j][i].c = Math.max(0, map[j][i].c - 1);
                if (map[j][i].c == 0 && map[j][i].p != -1) {
                    map[j][i].p = 0;
                    if (oldC == 1) {
                        diff.push({x: i, y: j, p: 0})
                    }
                }
            }
        }
    }

    function debugMap() {
        var j;
        var i;
        for (j = 0; j < H; j++) {
            var line = '=== ';
            for (i = 0; i < W; i++) {
                if (map[j][i].c > 0) {
                    line += '' + map[j][i].c;
                } else {
                    line += '.';
                }
            }
            console.log(line);
        }
    }

    function tick() {
        console.log('=== tick');
        updateWorld();
        debugMap();
        io.sockets.emit('tick', diff, players);
        if (!gameOver) {
            var timeout = Math.max(30, 100 - delta);
            tickTimeout = setTimeout(tick, parseInt(timeout));
        }
        if (tickNb < 5) {
            delta += 3;
        } else if (tickNb < 10) {
            delta += 1;
        } else if (tickNb < 30) {
            delta += 0.5;
        } else {
            delta += 0.05;
        }
        tickNb = tickNb + 1;
    }

    function init() {
        console.log('init');
        var j;
        var i;
        tickNb = 0;
        delta = 0;
        for (j = 0; j < H; j++) {
            map[j] = new Array(W);
            for (i = 0; i < W; i++) {
                diff.push({x: i, y: j, p: 0});
                map[j][i] = {p: 0, c: 0};
            }
        }
        for (var k in players) {
            players[k].reset(k);
        }
    }
});

function Game() {

}

function Map(params) {

}

function Player(params) {
    this.id = params.id || 0
    this.name = params.name || 'Guest';
    this.alive = params.alive || true;
    this.bonus = params.bonus || [];
    this.head = params.head || {x: 4, y: 2};
    this.snake_len = params.snake_len || 4;
    this.direction = params.direction || {x: 0, y: 1};
    this.p_direction = params.p_direction || {x: 0, y: 1};
    this.pp_direction = params.pp_direction || {x: 0, y: 1};
    this.resurectTime = params.resurectTime || 0;
    this.frozen = params.frozen || false;

    this.reset = function (k) {
        this.alive = true;
        this.bonus = [];
        this.head = {x: k * 2, y: 2};
        this.snake_len = 4;
        this.direction = {x: 0, y: 1};
        this.p_direction = {x: 0, y: 1};
        this.pp_direction = {x: 0, y: 1};
        this.resurectTime = 0;
        this.frozen = false;
    };

    this.kill = function () {
        this.alive = false;
        this.resurectTime = 120;
    };

    this.resurect = function () {
        this.alive = true;
        this.resurectTime = 0;
        this.frozen = true;
    };

    this.unfreeze = function () {
        this.frozen = false;
    };

    this.checkResurrect = function () {
        this.resurectTime--;
        if (this.resurectTime <= 0) {
            this.resurectTime = 0;
            this.alive = true;
        }
    };
}