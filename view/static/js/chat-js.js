$(function () {
	var socket = io(),
		$dive = $("#dive"),
		$bg = $("#init"),
		$username = $('input[name="username"]'),
		$name = $('input[name="name"]'),
		$welcome = $("#welcome"),
		$atsign = $("#atsign"),
		$image = $("#my-img"),
		$friendList = $("#roster"),
		$addFriend = $("#add"),
		$msgPanel = $("#messages-pane"),
		$status = $("#status"),
		$head = $("#head"),
		$msgInput = $("#msg_input"),
		$sendButton = $("#send_button"),
		$messagesList = $("#messages_list"),
		cur_username = "",
		cur_name = "",
		src = "";
		
	var msgDict = [];
	var msgBox = [];
	var isTyping = false;
	var notification = window.Notification || window.mozNotification || window.webkitNotification;
	
	if (typeof notification === "undefined")
		alert("Desktop notifications not available in your browser.");
	
	if (notification.permission !== "granted")
		notification.requestPermission();
	
	function setModal() {
		$(".modal").modal({
		   closable: false 
		});
		$(".modal").modal("show");
	}
	setModal();
	
	function capitalize(string) {
		var splited;
		var ans = "";
		
		if (string.trim().indexOf(" ") > 0) {
			splited = string.split(" ");
		} else {
			var ch = string.trim().charAt(0);
			return string.trim().replace(ch, ch.toUpperCase());
		}

		for (var i = 0; i < splited.length; i++){
			var part = splited[i];
			ans += part.replace(part.charAt(0), part.charAt(0).toUpperCase()) + " ";
		}
		return ans.trim();
	}
	
	function makeTag(string) {
		
		if (string.trim().indexOf(" ") > 0)
			return string.trim().replace(" ", "");
		else
			return string.trim().toLowerCase();
	}
	
	function selectImage() {
		var r = parseInt(Math.random() * 8 + 1);

		src = "static/avatars/" + r + ".jpg";
	}
	
	function setImage(src) {
		$image.attr("src", src);
	}
	
	function getBox(owner) {
		for (index in msgBox) {
			if (msgBox[index]["owner"] === owner) {
				return {
					"index" : index,
					"box" : msgBox[index]
				};
			}
		}
		var index;
		if (msgBox.length > 0)
			index = msgBox.length;
		else
			index = 0;
			
		return {
			"index" : index,
			"box" : {
				"owner" : owner,
				"texts" : [],			
			}
		}
	}
		
	function getDict(owner) {
		for (index in msgDict) {
			if (msgDict[index]["owner"] === owner) {
				return {
					"index" : index,
					"dict" : msgDict[index]
				};
			}
		}
		var index;
		if (msgDict.length > 0)
			index = msgDict.length;
		else
			index = 0;
			
		return {
			"index" : index,
			"dict" : {
				"owner" : owner,
				"comments" : []
			}
		}
	}
	
	function convertToDict(boxs) {
		for (i in boxs) {
			var box = boxs[i];
			var owner = box["owner"];
			var texts = box["texts"];
			
			for (index in texts) {
				var text = texts[index];
				addComment(text["author_name"], text["author_src"], text["date"], text["content"], owner, true);
			}
		}
	}
	
	function addComment(name, src, date, text, owner, login) {
		var $newComment = $("<div/>").addClass("comment");
		var $author_img = $("<a/>").addClass("avatar");
		var $comment_content = $("<div/>").addClass("content");
		var $author_name = $("<a/>").addClass("author");
		var $meta_data = $("<div/>").addClass("metadata");
		var $text_content = $("<div/>").addClass("text");
		
		var dict = getDict(owner)["dict"];
		var d_index = getDict(owner)["index"];
		
		var box = getBox(owner)["box"];
		var b_index = getBox(owner)["index"];
		
		$text_content.text(text);
		$meta_data.append($("<span/>").addClass("date").text(date));
		$author_name.text(name);
		$author_img.append($("<img>").attr("src", src));
		$newComment.append($author_img);
		$newComment.append($comment_content);
		
		$comment_content.append($author_name);
		$comment_content.append($meta_data);
		$comment_content.append($text_content);
		
		box["texts"].push({
			"author_src" : src,
			"date" : date,
			"author_name" : name,
			"content" : text
		});
		msgBox[b_index] = box;
		
		dict["comments"].push($newComment);
		msgDict[d_index] = dict;
		
		if ($msgPanel.attr("data-username").replace("@", "") === owner) {
			$newComment.hide();
			$messagesList.append($newComment);
			$newComment.fadeIn(400);
			autoScroll();
		} else if (!login){
			$(".friend").each(function () {
				if ($(this).attr("id").replace("@", "") === owner) {
					
					var $label = $(this).find(".label");
					var cout = parseInt($label.text());
					
					$label.css("display", "inline-block");
					$label.hide().fadeIn(400);
					$label.text(++cout);
					
					notify(name, src, text);
				}
			});
		}
	}
	
	function changeFriendsStatus(name, username, status, lastSeen) {
		$(".friend").each(function () {
			if ($(this).attr("id") === "@" + username.toLowerCase())
				if ($(this).find("span").text().toLowerCase() === name.toLowerCase()) 
					if (status === "offline") {
						$(this).removeClass("green");
						$(this).addClass("blue");
						$(this).attr("data-lastseen", lastSeen);
						
						if (! $(this).hasClass("clicked"))
							$(this).removeClass("active");
						else
							$status.text("Offline (last seen: " + lastSeen + ")");
					} else {
						$(this).removeClass("blue");
						$(this).addClass("green");
						$(this).addClass("active");
						
						if ($(this).hasClass("clicked"))
							$status.text("Online");
					}    
		});
	}
	
	function loadFriends(friends) {
		var content = "";
		for (index in friends) {
			if ( friends[index]["status"] === "online") {
				content += "<a class='friend active green item' id='@" + friends[index]["username"].toLowerCase() + "' data-src='" + friends[index]["src"] + "' data-lastseen='" + friends[index]["lastseen"] + "' data-name='" + friends[index]["name"] + "'><span>" + capitalize(friends[index]["name"]) + "</span><div class='ui blue label' style='display: none;'>0</div></a>";
			} else {
					content += "<a class='friend blue item' id='@" + friends[index]["username"].toLowerCase() + "' data-src='" + friends[index]["src"] + "' data-lastseen='" + friends[index]["lastseen"] + "' data-name='" + friends[index]["name"] + "'><span>" + capitalize(friends[index]["name"]) + "</span><div class='ui blue label' style='display: none;'>0</div></a>";
			}
		}
		$friendList.append(content);
	}
	
	function initContent() {
		$status.text("author: Mostafa Shamsitabar");
		$head.text("Welcome to my awesome chat application!");
		$("#init-content").html(
			"<h2>You don't have any friend!</h3><br><br>" +
			"<p>You can start conversations with people by adding them to your friendlist!</p>" +
			"<div style='font-size: 12px; color: rgba(0, 0, 0, 0.5);'>Add friends by their username.</div>"
		);
		$(".initiate").hide();
	}
	
	function loadContent() {
		$("#init-content").hide();
		$(".initiate").fadeIn(400);
		doFocus();
	}
	
	function showMessages() {
		$(".comment").remove();
		for (i in msgDict) {
			var dict = msgDict[i];
			if (dict["owner"] === $msgPanel.attr("data-username").replace("@", "")) {
				for (j in dict["comments"]) {
					var d = dict["comments"][j];
					d.hide();
					$messagesList.append(d);
					d.fadeIn(400);
					autoScroll();
				}
				break;
			}
		}
	}
	
	function renderContent() {
		 $(".active").each(function () {
			if ($(this).hasClass("clicked")) {
				addLastSeenData($(this));
				$head.text("Conversation with @" + $(this).find("span").text());
				
				if ($(this).hasClass("green")) {
					$status.text("Online");
				} else {
					$status.text("Offline (last seen: " + $msgPanel.attr("data-lastseen") + ")");
				}
				
				addSrcData($(this));
				addUsernameData($(this));
				addNameData($(this));
				showMessages();
			}
		})
	}
	
	function doFocus() {
		addLastSeenData($(".friend").first());
		$head.text("Conversation with @" + $(".friend").first().find("span").text());
		
		if ($(".friend").first().hasClass("green")) {
			$status.text("Online");
		}
		else {
			$status.text("Offline (last seen: " + $msgPanel.attr("data-lastseen") + ")");
		}
		
		$(".friend").first().addClass("active");
		$(".friend").first().addClass("clicked");  
		  
		addSrcData($(".friend").first());
		addUsernameData($(".friend").first());
		addNameData($(".friend").first());
		showMessages();
	}
	
	function doFocusOnInitiate() {
		addLastSeenData($(".clicked").first());
		$head.text("Conversation with @" + $(".clicked").first().find("span").text());
		
		if ($(".clicked").hasClass("green"))
			$status.text("Online");
		else
			$status.text("Offline (last seen: " + $msgPanel.attr("data-lastseen") + ")");
		
		addSrcData($(".clicked").first());
		addUsernameData($(".clicked").first());
		addNameData($(".clicked").first());
		showMessages();
	}
	
	function updateTyping() {
		if (!isTyping) {
			isTyping = true;
			socket.emit("typing", {
				"from" : cur_username,
				"to" : $msgPanel.attr("data-username").replace("@", "")
			});
		}
		
		lastTypingTime = (new Date()).getTime();

		setTimeout(function () {
			var typingTimer = (new Date()).getTime();
			var timeDiff = typingTimer - lastTypingTime;
			if (timeDiff >= 400 && isTyping) {
				isTyping = false;
				socket.emit("stop typing", {"to" : $msgPanel.attr("data-username").replace("@", "")});
			}
		}, 400);
	}
	
	var temp = $status.text();
	function addChatTyping(typer) {
		$status.text(temp + " (" + typer + " is typing..)");
	}
	
	function removeChatTyping() {
		$status.text(temp);
	}
	
	function addFriend(name, username, status, src, lastSeen, size) {
		username = username.toLowerCase();
		name = capitalize(name);
		
		if ((username === cur_username) || (doesFriendExist(username))) {
			return;
		}
		
		if (size == 1 || size == 0) {
			if (status === "online")
				$friendList.append("<a class='friend clicked active green item' id='@" + username + "' data-src='" + src + "' data-lastseen='" + lastSeen + "' data-name='" + name + "'><span>" + name + "</span><div class='ui blue label' style='display: none;'>0</div></a>");
			else 
				$friendList.append("<a class='friend clicked blue item' id='@" + username + "' data-src='" + src + "' data-lastseen='" + lastSeen + "' data-name='" + name + "'><span>" + name + "</span><div class='ui blue label' style='display: none;'>0</div></a>");
			doFocusOnInitiate();
			if (size == 0)
				loadContent();
		} else {
			if (status === "online")
				$friendList.append("<a class='friend active green item' id='@" + username + "' data-src='" + src + "' data-lastseen='" + lastSeen + "' data-name='" + name + "'><span>" + name + "</span><div class='ui blue label' style='display: none;'>0</div></a>");
			else 
				$friendList.append("<a class='friend blue item' id='@" + username + "' data-src='" + src + "' data-lastseen='" + lastSeen + "' data-name='" + name + "'><span>" + name + "</span><div class='ui blue label' style='display: none;'>0</div></a>");
		}
	}
	
	function notify(author, src, msg) {
		if (typeof notification === "undefined") {
			alert('Desktop notifications not available in your browser.'); 
			return;
		}

		if (notification.permission !== "granted") {
			notification.requestPermission();
		}
		else {
			var noty = new notification(author+ " says: ", {
				dir: "auto",
				tag: "notificationPopup",
				icon: src,
				body: msg,
			});
		}
	}
	
	function doesFriendExist(username) {
		var list = $(".friend").toArray();

		if (list.length > 0) {
			for(var i in list) {
				if ($(list[i]).attr("id").replace("@", "") === username)
					return true;
			}
		} else
			return false;
		return false;
	}
	
	function addFriendAndMessage(authorName, authorUsername, src, date, text, owner, status, lastSeen, size) {
		addFriend(authorName, authorUsername, status, src, lastSeen, size);
		addComment(authorName, src, date, text, owner, false);
	}
	
	function addSrcData(clicked) {
		$msgPanel.attr("data-src", $(clicked).attr("data-src"));
	}
	
	function addUsernameData(clicked) {
		$msgPanel.attr("data-username", $(clicked).attr("id"));
	}
	
	function addNameData(clicked) {
		$msgPanel.attr("data-name", $(clicked).attr("data-name"));
	}
	
	function addLastSeenData(clicked) {
		$msgPanel.attr("data-lastseen", $(clicked).attr("data-lastseen"));
	}
	
	function autoScroll() {
		$("#messages").scrollTop($messagesList.outerHeight());
	}
	
	// DOM EVENTS
	
	$(window).bind("beforeunload", function () {
		if (cur_username.length > 0 && cur_name.length > 0)
			socket.emit("passing the msgbox", msgBox);
	});
	
	$("#logout").on("click", function () {
		location.href = location.href;
	});
	
	$(document).on("click", ".friend", function () {
		
		$(".friend").each(function () {
			$(this).removeClass("clicked");
			if ($(this).attr("class").indexOf("green") < 0)
				$(this).removeClass("active");
		});
		
		$(this).addClass("clicked");
		$(this).addClass("active");
		
		$(this).find(".label").text(0);
		$(this).find(".label").hide();
		
		renderContent();
	});
	
	$addFriend.on("keydown", function (evt) {
		if (!evt)
			evt = window.event;
		if (evt.which === 13) {
			socket.emit("add friend", {
				"username" : $addFriend.val().toLowerCase(),
				"me" : cur_username
			});
			$addFriend.val("");
		}
	});
	
	$sendButton.on("click", function () {
		if ($msgInput.val().length !== 0) {
			isTyping = false;
			socket.emit("stop typing", {"to" : $msgPanel.attr("data-username").replace("@", "")});
			socket.emit("new message", {
				"from" : cur_username,
				"to" : $msgPanel.attr("data-username").replace("@", ""),
				"text" : $msgInput.val()
			});
			$msgInput.val("");
		}
		return false;
	});
	
	$msgInput.on("input", function () {
		updateTyping();
	});
	
	$msgInput.on("keydown", function (evt) {
		if (!evt) {
			evt = window.event;
		}
		
		if (evt.which === 13 ) {
			if ($msgInput.val().length !== 0) {
				isTyping = false;
				socket.emit("stop typing", {"to" : $msgPanel.attr("data-username").replace("@", "")});
				socket.emit("new message", {
					"from" : cur_username,
					"to" : $msgPanel.attr("data-username").replace("@", ""),
					"text" : $msgInput.val()
				});
				$msgInput.val("");
			}
			return false;
		}
	});
	
	$dive.on("click", function () {
		if ($username.val().length !== 0 && $name.val().length !== 0) {
			selectImage();
			cur_username = $username.val().toLowerCase();
			cur_name = $name.val().toLowerCase();
			
			socket.emit("login", {
				"username" : cur_username,
				"name" : cur_name,
				"src" : src
			});
		} else {
			swal({
				type: "warning",
				title: "Error!",
				text: "You must fill the fields!",
				timer: 2000,
				showConfirmButton: false
			});
			setTimeout(function () {
				location.href = location.href;
			}, 1800);
		}
	});

	// SOCKET EVENTS
	
	socket.on("user joined", function (data) {
		var uName = data["username"];
		var name = data["name"];
		
		changeFriendsStatus(name, uName, "online");
	});
	
	socket.on("login", function (data) {
		$welcome.text("Welcome, " + capitalize(data["name"]));
		$atsign.text("@" + makeTag(data["name"]));
		setImage(data["src"]);
		loadFriends(data["friends"]);
		$bg.css("display", "none");
		
		if (data["friends"].length == 0)
			initContent();
		else
			loadContent();
		convertToDict(data["msgBox"]);
	});
	
	socket.on("login error wrong", function () {
		$bg.css("display", "block");
		swal({
			type: "warning",
			title: "Error!",
			text: "Wrong value for name!",
			timer: 2000,
			showConfirmButton: false
		});
		setTimeout(function () {
			location.href = location.href;
		}, 1800);
	});
	
	socket.on("login error in use", function () {
		$bg.css("display", "block");
		swal({
			type: "warning",
			title: "Error!",
			text: "Someone is using this account right now!",
			timer: 2000,
			showConfirmButton: false
		});
		setTimeout(function () {
			location.href = location.href;
		}, 1800);
	});
	
	socket.on("add friend error", function () {
		swal({
			type: "warning",
			title: "Error!",
			text: "No such user found!",
			timer: 2000,
			showConfirmButton: false
		});
	});
	
	socket.on("add friend", function (data) {
		var friend = data["friend"];
		addFriend(friend["name"], friend["username"], friend["status"], friend["src"], friend["lastseen"], data["size"]);
		
		if (data["size"] == 1)
			loadContent();
	});
	
	socket.on("user left", function (data) {
		var uName = data["username"];
		var name = data["name"];
		
		changeFriendsStatus(name, uName, "offline", data["lastseen"]);
	});
	
	socket.on("new message", function (data) {
		if (doesFriendExist(data["to"])) {
			addComment(capitalize(data["author_name"]), data["src"], data["date"], data["text"], data["to"], false);
		} else {
			addFriendAndMessage(capitalize(data["author_name"]), data["author_username"], data["src"], data["date"], data["text"], data["to"], data["status"], data["lastseen"], $(".friend").length);
		}
	});
	
	socket.on("typing", function (data) {
		addChatTyping(data["typer"]);
	});
	
	socket.on("stop typing", function () {
		removeChatTyping();
	});
});