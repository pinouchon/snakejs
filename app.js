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
var game = new Game();

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
        var id = Object.keys(game.players).length + 1;
        socket.name = name;
        socket.id = id;
        game.players[id] = new Player({name: name,
            id: id,
            head: {x: (id) * 2, y: 2}});

        //socket.emit('playerId', id);
        socket.emit("sendMessage", "System", "Welcome.");
        socket.broadcast.emit("sendMessage", "System", name + " has joined the game (2).");
        io.sockets.emit("refreshUsers", game.players);
    });

    socket.on("disconnect", function () {
        delete game.players[socket.id];
        //delete users[socket.userName];
        io.sockets.emit("refreshUsers", game.players);
        socket.broadcast.emit("sendMessage", "System", socket.name + " has left the game");
    });

    socket.on('startGame', function () {
        clearTimeout(game.tickTimeout);
        game.gameOver = false;
        game.init(socket);
        io.sockets.emit('tick', game.diff, game.players);
        game.tick();
    });

    socket.on('endGame', function () {
        game.gameOver = true;
    });

    socket.on("messageReceived", function (data) {
        io.sockets.emit("sendMessage", socket.name, data);
    });

    socket.on('keypress', function (code) {
        if (!game.players[socket.id]) return;

        var pdir = game.players[socket.id].p_direction;
        if (code == 'left' && pdir.x != 1 && pdir.y != 0) {
            game.players[socket.id].direction.x = -1;
            game.players[socket.id].direction.y = 0;
        }
        if (code == 'right' && pdir.x != -1 && pdir.y != 0) {
            game.players[socket.id].direction.x = 1;
            game.players[socket.id].direction.y = 0;
        }
        if (code == 'up' && pdir.x != 0 && pdir.y != 1) {
            game.players[socket.id].direction.x = 0;
            game.players[socket.id].direction.y = -1;
        }
        if (code == 'down' && pdir.x != 0 && pdir.y != -1) {
            game.players[socket.id].direction.x = 0;
            game.players[socket.id].direction.y = 1;
        }
    });
});

/**
 * Returns a random number between min and max
 */
function getRandomArbitary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function Game() {
    this.players = {};
    this.gameOver = false;
    this.tickTimeout = undefined;
    this.tickNb = 0;
    this.map = new Map();
    this.delta = 0;
    this.socket = undefined;
    var that = this;

    this.tick = function () {
        console.log('=== tick');
        this.updateWorld();
        this.map.print();
        io.sockets.emit('tick', this.map.diff, this.players);
        if (!that.gameOver) {
            var timeout = Math.max(30, 100 - this.delta);
            this.tickTimeout = setTimeout(function () {
                that.tick();
            }, parseInt(timeout));
        }
        if (this.tickNb < 5) {
            this.delta += 3;
        } else if (this.tickNb < 10) {
            this.delta += 1;
        } else if (this.tickNb < 30) {
            this.delta += 0.5;
        } else {
            this.delta += 0.05;
        }
        this.tickNb = this.tickNb + 1;
    };

    this.init = function (socket) {
        this.socket = socket;
        console.log('init');
        var j;
        var i;
        this.tickNb = 0;
        this.delta = 0;
        console.log('init map >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        // init map
        for (j = 0; j < this.map.H; j++) {
            this.map.tiles[j] = new Array(this.map.W);
            for (i = 0; i < this.map.W; i++) {
                console.log('i: ' + i + ' j: ' + j);
                this.map.diff.push({x: i, y: j, p: 0});
                this.map.tiles[j][i] = {p: 0, c: 0};
            }
        }
        for (var k in this.players) {
            this.players[k].reset(k);
        }
        this.map.print();
    };

    this.updateWorld = function () {

        console.log('=== updateMap');
        this.map.diff = [];

        for (var k in game.players) {
            //checkResurrect(players[k]);
            if (!game.players[k].alive) {
                continue;
            }
            console.log('==========', game.players[k].head.x, game.players[k].head.y, k);
            game.players[k].head.x += game.players[k].direction.x;
            game.players[k].head.y += game.players[k].direction.y;
            game.players[k].p_direction = game.players[k].direction
            if (game.players[k].head.x >= this.map.W || game.players[k].head.x < 0 ||
                game.players[k].head.y >= this.map.H || game.players[k].head.y < 0) {
                game.players[k].alive = false;
                game.socket.broadcast.emit("sendMessage", "System", game.players[k].name + " is dead (out of map)");
                continue;
            }
            if (this.map.tiles[game.players[k].head.y][game.players[k].head.x].c > 0) {
                game.players[k].alive = false;
                game.socket.broadcast.emit("sendMessage", "System", game.players[k].name + " pwned by " +
                    game.players[this.map.tiles[game.players[k].head.y][game.players[k].head.x].p].name);
                continue;
            }
            if (this.map.tiles[game.players[k].head.y][game.players[k].head.x].p == -1) {
                game.players[k].snake_len = game.players[k].snake_len + 1;
            }
            this.map.tiles[game.players[k].head.y][game.players[k].head.x].c = game.players[k].snake_len;
            this.map.tiles[game.players[k].head.y][game.players[k].head.x].p = k;
            game.map.diff.push({x: game.players[k].head.x, y: game.players[k].head.y, p: k});
        }

        // food
        if (getRandomArbitary(0, 100) < 5) {
            var x = getRandomArbitary(0, this.map.W - 1);
            var y = getRandomArbitary(0, this.map.H - 1);
            if (this.map.tiles[y][x].p == 0) {
                this.map.tiles[y][x].p = -1;
                game.map.diff.push({x: x, y: y, p: -1});
            }
        }

        var j;
        var i;
        var oldC;
        for (j = 0; j < this.map.H; j++) {
            for (i = 0; i < this.map.W; i++) {
                oldC = this.map.tiles[j][i].c;
                this.map.tiles[j][i].c = Math.max(0, this.map.tiles[j][i].c - 1);
                if (this.map.tiles[j][i].c == 0 && this.map.tiles[j][i].p != -1) {
                    this.map.tiles[j][i].p = 0;
                    if (oldC == 1) {
                        game.map.diff.push({x: i, y: j, p: 0})
                    }
                }
            }
        }
    }
}

function Map() {
    this.W = 50;
    this.H = 40;
    this.tiles = new Array(this.H);
    this.diff = [];

    this.eachTile = function (callback) {
        var i, j;
        for (j = 0; j < this.H; j++) {
            for (i = 0; i < this.W; i++) {
                callback(i, j);
            }
        }
    };

    this.print = function () {
        var j;
        var i;
        for (j = 0; j < this.H; j++) {
            var line = '=== ';
            for (i = 0; i < this.W; i++) {
                if (this.tiles[j][i].c > 0) {
                    line += '' + this.tiles[j][i].c;
                } else {
                    line += '.';
                }
            }
            console.log(line);
        }
    };
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