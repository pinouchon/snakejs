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
            index: game.playerIndex++
        });
        game.players[id].resurrect();

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
        var player = game.players[socket.id];
        if (!player) return;
        player.frozen = false;
        if (code == player.code) return;
        if (isOpposite(code, player.code)) return;
        player.prev_pressed_code = player.code;
        player.code = code;
        //player.updateDirectionWithCode(player.code);
    });
});

/**
 * Returns a random number between min and max
 */
function getRandomArbitary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function isOpposite(code1, code2) {
    return (code1 == 'left' && code2 == 'right') ||
        (code1 == 'right' && code2 == 'left') ||
        (code1 == 'up' && code2 == 'down') ||
        (code1 == 'down' && code2 == 'up');
}

function Game() {
    this.playerIndex = 1;
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
        //this.map.print();
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
            this.players[k].index = k;
            this.players[k].resurrect();
        }
        this.map.print();
    };

    this.updateWorld = function () {

        console.log('=== updateMap');
        var map = this.map;
        map.diff = [];

        for (var k in game.players) {
            var p = game.players[k];
            p.checkResurrect();
            if (!p.alive) {
                continue;
            }
            console.log('>>> head.x, head.y, k: ', p.head.x, p.head.y, p.index);
            // For each player ****************************************************
            // checking collision with tile just before (eg: if you press [left,top] very fast while moving down)
            if (isOpposite(p.prev_tick_code, p.code)) {
                p.updateDirectionWithCode(p.prev_pressed_code);
            } else {
                p.updateDirectionWithCode(p.code)
            }
            console.log("prev pressed: " + p.prev_pressed_code);
            console.log("prev tick   : " + p.prev_tick_code);
            console.log("code        : " + p.code);
            console.log("\n\n\n");

            // moving player
            if (!p.frozen) {

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
            }
            map.tiles[p.head.y][p.head.x].c = p.snake_len;
            map.tiles[p.head.y][p.head.x].p = p.index;

            map.diff.push({x: p.head.x, y: p.head.y, p: p.index});

            // prev tick
            p.prev_tick_code = p.code;
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
    this.id = params.id || 0;
    this.name = params.name || 'Guest';
    this.index = params.index || 0;

//    this.alive = params.alive || true;
//    this.bonus = params.bonus || [];
//    this.head = params.head || {x: 4, y: 2};
//    this.snake_len = params.snake_len || 4;
//    this.direction = params.direction || {x: 0, y: 1};
//    this.p_direction = params.p_direction || {x: 0, y: 1};
//    this.pp_direction = params.pp_direction || {x: 0, y: 1};
//    this.code = params.code || 'down';
//    this.prev_pressed_code = params.prev_pressed_code || 'down';
//    this.prev_tick_code = params.prev_tick_code || 'down';
//    this.resurectTime = params.resurectTime || 0;
//    this.frozen = params.frozen || false;

    this.resurrect = function () {
        this.bonus = [];
        this.alive = true;
        this.resurectTime = 0;
        this.frozen = true;
        this.head = {x: this.index * 2, y: 0};
        this.code = 'down';
        this.prev_pressed_code = 'down';
        this.prev_tick_code = 'down';
        this.snake_len = 4;
        this.direction = {x: 0, y: 1};
        this.p_direction = {x: 0, y: 1};
        this.pp_direction = {x: 0, y: 1};
        this.frozen = true;
        //game.map.diff.push({x: this.head.x, y: this.head.y, p: this.index});
    };

    this.updateDirectionWithCode = function (code) {
        //var pdir = this.p_direction;
        if (code == 'left') {
            this.direction.x = -1;
            this.direction.y = 0;
        }
        if (code == 'right') {
            this.direction.x = 1;
            this.direction.y = 0;
        }
        if (code == 'up') {
            this.direction.x = 0;
            this.direction.y = -1;
        }
        if (code == 'down') {
            this.direction.x = 0;
            this.direction.y = 1;
        }
    };

    this.die = function () {
        this.alive = false;
        this.resurectTime = 45;
    };

    this.checkResurrect = function () {
        this.resurectTime--;
        if (!this.alive && this.resurectTime <= 0) {
            this.resurrect();
        }
    };
}