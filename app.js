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
        io.sockets.emit('tick', game.map.diff, game.players);
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
        game.players[socket.id].updatePositionWithCode(code);
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
        this.tickNb = 0;
        this.delta = 0;
        console.log('init map >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        // init map
        this.map.alloc();
        for (var k in this.players) {
            this.players[k].reset(k);
        }
        this.map.print();
    };

    this.updateWorld = function () {

        console.log('=== updateMap');
        var map = this.map;
        map.diff = [];

        for (var k in game.players) {
            var p = game.players[k];
            //checkResurrect(players[k]);
            if (!p.isAlive()) {
                continue;
            }
            console.log('==========', p.head.x, p.head.y, k);
            // For each player ****************************************************
            // moving player
            p.head.x += p.direction.x;
            p.head.y += p.direction.y;
            p.p_direction = p.direction;
            // checking out of bounds
            if (p.head.x >= map.W || p.head.x < 0 ||
                p.head.y >= map.H || p.head.y < 0) {
                p.die();
                game.socket.broadcast.emit("sendMessage", "System", p.name + " is dead (out of map)");
                continue;
            }
            // checking collisions
            if (map.tiles[p.head.y][p.head.x].c > 0) {
                if (map.tiles[p.head.y][p.head.x].c == p.snake_len && map.tiles[p.head.y][p.head.x].p == p.id) {

                }
                p.die();
                game.socket.broadcast.emit("sendMessage", "System", p.name + " pwned by " +
                    game.players[map.tiles[p.head.y][p.head.x].p].name);
                continue;
            }
            // checking eating
            if (map.tiles[p.head.y][p.head.x].p == -1) {
                p.snake_len = p.snake_len + 1;
            }
            // updating new head position on map
            map.tiles[p.head.y][p.head.x].c = p.snake_len;
            map.tiles[p.head.y][p.head.x].p = k;
            map.diff.push({x: p.head.x, y: p.head.y, p: k});
        }

        // FOOD: each turn, 5% change of new food ************************************
        if (getRandomArbitary(0, 100) < 5) {
            var x = getRandomArbitary(0, map.W - 1);
            var y = getRandomArbitary(0, map.H - 1);
            if (map.tiles[y][x].p == 0) {
                map.tiles[y][x].p = -1;
                map.diff.push({x: x, y: y, p: -1});
            }
        }

        // Update end of snakes ********************************************************
        map.eachTile(function (tile, i, j) {
            var oldC = tile.c;
            tile.c = Math.max(0, tile.c - 1);
            // if tile comes to 0 and is not food
            if (tile.c == 0 && tile.p != -1) {
                tile.p = 0;
                if (oldC == 1) {
                    // if tile just came to 0
                    map.diff.push({x: i, y: j, p: 0})
                }
            }
        });
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
                callback(this.tiles[j][i], i, j);
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

    this.alloc = function () {
        var j;
        var i;
        for (j = 0; j < this.H; j++) {
            this.tiles[j] = new Array(this.W);
            for (i = 0; i < this.W; i++) {
                this.diff.push({x: i, y: j, p: 0});
                this.tiles[j][i] = {p: 0, c: 0};
            }
        }
    }
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
    this.prev_code = params.prev_code || 'down';
    this.override_code = params.override_code || false;
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

    this.updatePositionWithCode = function (code) {
        var pdir = this.p_direction;
        //game.players[socket.id].prev_code = pdir;
        if (code == 'left' && pdir.x != 1 && pdir.y != 0) {
            this.direction.x = -1;
            this.direction.y = 0;
        }
        if (code == 'right' && pdir.x != -1 && pdir.y != 0) {
            this.direction.x = 1;
            this.direction.y = 0;
        }
        if (code == 'up' && pdir.x != 0 && pdir.y != 1) {
            this.direction.x = 0;
            this.direction.y = -1;
        }
        if (code == 'down' && pdir.x != 0 && pdir.y != -1) {
            this.direction.x = 0;
            this.direction.y = 1;
        }
    };

    this.isAlive = function () {
        return this.alive;
    };

    this.die = function () {
        this.alive = false;
        this.resurectTime = 120;
    };

    this.resurect = function () {
        this.alive = true;
        this.resurectTime = 0;
        this.frozen = true;
    };

    this.freeze = function () {
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