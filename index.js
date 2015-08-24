var express = require("express"),
	app = express(),
	http = require("http").createServer(app),
	io = require("socket.io")(http);
	port = 3000;

app.use(express.static(__dirname + '/view'));

var users = [];
var tempID = 0;

io.on("connection", function (socket) {
	tempID = 1;
	socket.on("login", function (data) {
		console.log(data["username"] + " connected!");
		socket.user = "init";
		tempID = 0;
		var existance = findUser(data["username"]);
		var doupl = false;
		var wrong = false;
		
		if (existance === -1) {
			var user = new User(data["name"], data["username"], data["src"], [], "online", socket, "", []);
			socket.user = user;
			
			users.push(user);
		} else {
			if (users[existance].status === "online") {
				doupl = true;
			} else if (!checkUser(users[existance].username, data["name"])) {
				wrong = true;
			} else {
				socket.user = users[existance];
				socket.user.socket = socket;
				socket.user.status = "online";
				socket.user.lastSeen = "";
			}
		}
		
		if (!doupl && !wrong) {
			for (index in users) {
				var temp = users[index].getFriend(socket.user);
				
				if (temp !== -1) {
					temp["status"] = "online";
				}
			}
			
			socket.emit("login", {
				"name" : socket.user.name,
				"username" : socket.user.username,
				"src" : socket.user.src,
				"friends" : socket.user.friends,
				"status" : socket.user.status,
				"msgBox" : socket.user.msgBox
			});
			
			socket.broadcast.emit("user joined", {
				"username" : socket.user.username,
				"name" : socket.user.name	
			});
		} else if (wrong) {
			socket.emit("login error wrong");
		} else 
			socket.emit("loging error in use");
	});
	socket.on("add friend", function (data) {
		var mIndex = findUser(data["me"]);
		var fIndex = findUser(data["username"]);
		var friend = {};
		
		if (fIndex == -1) {
			socket.emit("add friend error");
		} else {
			var me = users[mIndex];
			var you = users[fIndex];
			if (me !== you) {
				friend = {
					"username" : you.username,
					"status" : you.status,
					"name" : you.name,
					"src" : you.src,
					"lastseen" : ""
				};
				me.addFriend(friend);
				socket.emit("add friend", {
					"friend" : friend,
					"size" : me.friends.length
				});
			}
		}
	});
	
	socket.on("passing the msgbox", function (data) {
		socket.user.msgBox = data;
	});
	
	socket.on("disconnect", function () {
		if (tempID == 1) {
			console.log("socket disconnected");
		} else if (socket.user === "init") {
			console.log("anonymous user disconnected");
		} else {
			console.log(socket.user.username + " disconnected");
			
			var now = new Date();
			var date = now.toDateString();
			var time = now.getHours() + ":" + now.getMinutes();
			
			socket.user.status = "offline";
			socket.user.lastSeen = date + " - " + time;
			
			for (index in users) {
				var temp = users[index].getFriend(socket.user);
				
				if (temp !== -1) {
					temp["status"] = "offline";
					temp["lastseen"] = date + " - " + time;
				}
			}
			
			socket.broadcast.emit("user left", {
				"username" : socket.user.username,
				"name" : socket.user.name,
				"lastseen" : date + " - " + time
			});
		}
	});
	socket.on("new message", function (data) {
		var from = getUser(data["from"]);
		var to = getUser(data["to"]);
		
		console.log(data["from"] + " / " + data["to"] + ": " + data["text"]);
		var now = new Date();
		var date = now.toDateString();
		var time = now.getHours() + ":" + now.getMinutes();
		
		from.socket.emit("new message", {
			"author_name" : from.name,
			"author_username" : from.username,
			"to" : data["to"],
			"text" : data["text"],
			"date" : date + " - " + time,
			"src" : from.src,
			"status" : to.status,
			"lastseen" : to.lastSeen
		});
		
		to.socket.emit("new message", {
			"author_name" : from.name,
			"author_username" : from.username,
			"to" : data["from"],
			"text" : data["text"],
			"date" : date + " - " + time,
			"src" : from.src,
			"status" : to.status,
			"lastseen" : to.lastSeen
		});
	});
	socket.on("typing", function (data) {
		var from = getUser(data["from"]);
		var to = getUser(data["to"]);
		
		console.log(from.name + " is typing...");
		
		to.socket.emit("typing", {"typer" : from.name});
	});
	socket.on("stop typing", function (data) {
		var to = getUser(data["to"]);
		
		console.log("stopped");
		
		to.socket.emit("stop typing");
	});
});

function getUser(username) {
	for (index in users) {
		if (users[index].username === username) {
			return users[index];
		}
	}
	return -1;
}

function checkUser(username, name) {
	var user = getUser(username);
	if (user.name === name) { return true; }
	else { return false; }
}

function User(name, username, src, friends, status, socket, lastSeen, msgBox) {
	this.name = name;
	this.username = username;
	this.src = src;
	this.friends = friends;
	this.status = status;
	this.socket = socket;
	this.lastSeen = lastSeen;
	this.msgBox = msgBox;
}

User.prototype.addFriend = function (user) {
	this.friends.push(user);
}

User.prototype.getFriend = function (user) {
	var friends = this.friends;
	for (index in friends) {
		if (friends[index]["username"] === user.username) {
			if (friends[index]["name"] === user.name) {
				return friends[index];
			}
		}
	}
	return -1;
}

function findUser(username) {
	for (var i = 0; i < users.length; i++) {
		var user = users[i];
		
		if (user.username === username)
			return i;
	}
	return -1;
}

http.listen(port, function () {
	console.log('Server running at http://127.0.0.1:' + port); 
});