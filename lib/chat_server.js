/**
 * Created by Administrator on 2017/1/19.
 */
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickName = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level',1);
    io.sockets.on('connection',function (socket) {

        //在用户连接上来时赋予其一个访客名
        guestNumber = assignGuestName(socket,guestNumber,nickName,namesUsed);

        //在用户连接上来时把他放入聊天室Lobby里
        joinRoom(socket,'Lobby');

        //处理用户的消息
        handleMessageBroadcasting(socket,nickName);

        //处理用户的更名
        handleNameChangeAttempts(socket,nickName,namesUsed);

        //聊天室的创建和变更
        handleRoomJoining(socket);

        //用户发出请求时，向其提供已经被占用的聊天室的列表
        socket.on('rooms',function () {
            socket.emit('room',io.sockets.manager.rooms);
        });

        //定义用户断开连接后的清楚逻辑
        handleClientDisconnection(socket,nickName,namesUsed);

    })
}

function assignGuestName(socket,guestNumber,nickName,namesUsed) {
    var name = 'Guest' + guestNumber;
    nickName[socket.id] = name;
    socket.emit('nameResult',{
        success:true,
        name:name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket,room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult',{
        room:room
    });
    socket.broadcast.to(room).emit('message',{
        text:nickName[socket.id] + 'has joined' + room+ '.'
    });

    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.lenght >1) {
        var usersInRoomSummary = 'User currently in' +room+ ":";
        for(var index in usersInRoom){
            var userSocketId = usersInRoom[index].id;
            if(userSocketId != socket.id) {
                if(index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickName[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message',{text:usersInRoomSummary});
    }
}

function handleNameChangeAttempts(socket,nickName,nameUserd) {
    socket.on('nameAttempt',function (name) {
        if(name.indexOf('Guest') == 0) {
            socket.emit('nameResult',{
                success:false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            if(nickName.indexOf(name) == -1) {
                var previousName = nickName[socket.id];
                var previusNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickName[socket.id] = name;
                delete namesUsed[previusNameIndex];
                socket.emit('namesResult',{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName + 'is now know as' + name +'.'
                });
            } else {
                socket.emit('nameResult',{
                    success:false,
                    message:'That name is already in use.'
                })
            }
        }
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message',function (message) {
        socket.broadcast.to(message.room).emit('message',{
            text: nickName[socket.id] + ':' +message.text
        })
    })
}

function handleRoomJoining(socket) {
    socket.on('join',function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    })
}

function handleClientDisconnection(socket) {
    socket.on('disconnect',function () {
        var nameIndex = namesUsed.indexOf(nickName[socket.id]);
        delete namesUsed[nameIndex];
        delete nickName[socket.id];
    })
}



























