/**
 * Created by Administrator on 2017/1/18.
 */
// 内置的http模块提供了HTTP服务器和客户端功能
var http = require("http");

//内置的fs模块提供了与输入输出流的功能
var fs = require("fs");

// 内置的path模块提供了与文件系统路径相关的功能
var path = require("path");

// 附加的mime模块有根据文件扩展名得出MIME类型的能力
var mime = require("mime");

// cache是用来缓存文件内容的对象
var cache = {};

//加载一个定制的Node模块
var chatServer = require('./lib/chat_server');

// 所请求的文件不存在时候发送404错误
function send404(response){
    response.writeHead(404,{'Content-Type':'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

// 提供文件数据服务
function sendFile(response,filePath,fileContents){
    response.writeHead(
        200,
        {'content-type': mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

// 把常用的数据缓存到内存里。只要第一次访问的时候才会从文件系统中读取。
// 确定文件是否缓存，若果是，就返回它。
// 如果文件还没被缓存，它会从硬盘中读取并返回它。
// 如果文件不存在，则返回一个HTTP 404错误作为响应
function serverStatic(response,cache,absPath) {
    //检查文件是否缓存在内存中
    if(cache[absPath]) {
        //从内存中返回
        sendFile(response,absPath,cache[absPath]);
    } else {
        //检查文件是否存在
        fs.exists(absPath,function(exists){
            if(exists) {
                //从硬盘中读取文件
                fs.readFile(absPath,function (err,data) {
                    if(err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        //从硬盘中读取文件并返回
                        sendFile(response,absPath,data);
                    }
                })
            } else {
                send404(response);
            }
        })
    }
}

var server = http.createServer(function (request,response) {
    var filePath = false;
    if(request.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }

    var absPath = './' + filePath;

    serverStatic(response,cache,absPath);
})

//启动Socket.IO服务器，给它提供一个已经定义好的HTTP服务器，这样它就能跟HTTP服务器共享一个TCP/IP端口
chatServer.listen(server);

server.listen(3000,function () {
    console.log("Server listening on port 3000.");
})