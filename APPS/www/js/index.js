'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');

var stompClient = null;
var username = null;

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652','#ffc107', '#ff85af', '#FF9800', '#39bbb0','#F72C5B','#4B5945',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0','#F72C5B','#4B5945','#2196F3', '#32c787', '#00BCD4', '#ff5652'
];

document.addEventListener('DOMContentLoaded', function() {
    usernamePage.classList.remove('hidden');
    chatPage.classList.add('hidden');
});

function connect(event) {
    username = document.querySelector('#name').value.trim();

    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        // Update the WebSocket endpoint if necessary
        var socket = new SockJS('https://localhost:9191/ws'); // Ensure the URL matches your server configuration
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Tell your username to the server
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    )

    var welcomeMessage = {
        sender: username,
        content: 'Welcome to the chat!',
        type: 'CHAT'
    };
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(welcomeMessage));

    connectingElement.classList.add('hidden');

    // Add message to indicate connection
    var connectionMessage = document.createElement('p');
    connectionMessage.textContent = 'Connected to the Server.';
    connectionMessage.style.color = 'green';
    messageArea.appendChild(connectionMessage);
}

function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}

function sendMessage(event) {
    var messageContent = messageInput.value.trim();

    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageContent,
            type: 'CHAT'
        };

        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));

        messageInput.value = '';
    }
    event.preventDefault();
}

var typing = false;
var lastTypingTime;
var TYPING_TIMER_LENGTH = 3000; // 3 seconds

messageInput.addEventListener('input', () => {
    if (!typing) {
        typing = true;
        stompClient.send("/app/chat.typing", {}, JSON.stringify({sender: username, typing: true}));
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
            typing = false;
            stompClient.send("/app/chat.typing", {}, JSON.stringify({sender: username, typing: false}));
        }
    }, TYPING_TIMER_LENGTH);
});

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    if (message.type === 'TYPING') {
        var typingElement = document.querySelector('.typing');
        if (message.typing) {
            typingElement.textContent = `${message.sender} is typing...`;
            typingElement.classList.remove('hidden');
            typingElement.classList.add('typing-animation'); // Add animation class
        } else {
            typingElement.classList.add('hidden');
            typingElement.classList.remove('typing-animation'); // Remove animation class
        }
        return;
    }

    var messageElement = document.createElement('li');

    if(message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
    } else {
        messageElement.classList.add('chat-message');

        var avatarElement = document.createElement('i');
        var avatarText = document.createTextNode(message.sender[0]);
        avatarElement.appendChild(avatarText);
        avatarElement.style['background-color'] = getAvatarColor(message.sender);

        messageElement.appendChild(avatarElement);

        var usernameElement = document.createElement('span');
        var usernameText = document.createTextNode(message.sender);
        usernameElement.appendChild(usernameText);
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    var messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);


