
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , multiparty = require('multiparty')
  , methodOverride = require('method-override')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , ss = require('socket.io-stream');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server,{log:false});
var clients = [];
var users = [];
var userss = {};
var oldSocket = "";
var uploadmu = "";
var getDiffTime = function()
{
  if(disconnect)
  {
    return connect - disconnect;
  }
  return false;
}
io.sockets.on('connection',function(socket){
  socket.on('online',function(data){
    var data = JSON.parse(data);
    //检查是否是已经登录绑定
    socket.name = data.user;
    // uploadmu = data.user;
    if(!userss[data.user]){
      userss[data.user] = data.user;
    }
    if(!clients[data.user])
    {
      //新上线用户，需要发送用户上线提醒,需要向客户端发送新的用户列表
      users.unshift(data.user);
      for(var index in clients)
      {
        clients[index].emit('system',JSON.stringify({type:'online',msg:data.user,time:(new Date()).getTime()}));
        clients[index].emit('userflush',JSON.stringify({users:users}));
      }
      socket.emit('system',JSON.stringify({type:'in',msg:'',time:(new Date()).getTime()}));
      socket.emit('userflush',JSON.stringify({users:users}));
    }
      clients[data.user] = socket;
      socket.emit('userflush',JSON.stringify({users:users}));
  });
  socket.on('say',function(data){
    //dataformat:{to:'all',from:'Nick',msg:'msg'}
    data = JSON.parse(data);
    var msgData = {
      time : (new Date()).getTime(),
      data : data
    }
    if(data.to == "all")
    {
      //对所有人说
      for(var index in clients)
      {
        clients[index].emit('say',msgData);
      }
    }
    else
    {
      //对某人说
      clients[data.to].emit('say',msgData);
      clients[data.from].emit('say',msgData);
    }
  });
  socket.on('offline',function(user){
    socket.disconnect();
  });
  socket.on('disconnect',function(){
    //有人下线
    setTimeout(userOffline,3000);
    if (userss[socket.name]) {
      //从 users 对象中删除该用户名
      delete userss[socket.name];
    }
    function userOffline()
    {
      delete userss[user];
      for(var index in clients)
      {
        if(clients[index] == socket)
        {
          users.splice(users.indexOf(index),1);
          delete clients[index];
          for(var index_inline in clients)
          {
            clients[index_inline].emit('system',JSON.stringify({type:'offline',msg:index,time:(new Date()).getTime()}));
            clients[index_inline].emit('userflush',JSON.stringify({users:users}));
          }
          break;
        }
      }
    }
  });
  socket.on('music',function(data){
    uploadmu = data.from;
  });
});

// app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  // app.use(favicon());
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(methodOverride());
  app.use(express.static(path.join(__dirname, 'public')));

// if (app.get('env') === 'development') {
//   app.use(errorHandler());
// }

app.get('/', function (req, res, next) {
  if(!req.headers.cookie)
  {
    res.redirect('/signin');
    return;
  }
  var cookies = req.headers.cookie.split("; ");
  var isSign = false;
  for(var i = 0 ; i < cookies.length; i ++)
  {
    cookie = cookies[i].split("=");
    if(cookie[0]=="user" && cookie[1] != "")
    {
      isSign = true;
      break;
    }
  }
  if(!isSign)
  {
    res.redirect('/signin');
    return;
  }
  res.sendfile('views/index.html');
});
app.get('/signin',function(req,res,next){
  res.sendfile('views/signin.html');
});
// app.get('/signup',function(req,res,next){
//   res.sendfile('views/signup.html');
// });
app.post('/signin',function(req,res,next){
  if(userss[req.body.username]){
    // res.cookie("user","");
    res.cookie("rename","true");
    res.redirect('/signin');
    //判断用户是否存在
  }else{
    res.cookie("user",req.body.username);
    res.cookie("rename","false");
    res.redirect('/');
  }

});
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
//上传文件
app.post('/uploadUserImgPre',function(req, res, next) {
  //生成multiparty对象，并配置上传目标路径
  var form = new multiparty.Form({uploadDir: './public/files/images'});
  form.parse(req,function(err, fields, files) {
    var filesTmp = JSON.stringify(files);
    console.log(files);
    if(err){
      console.log('parse error: ' + err);
    } else {
      testJson = eval("(" + filesTmp+ ")");
      console.log(testJson);
      res.json({imgSrc:testJson.fileField[0].path})
    }
  });
});
app.post('/uploadMusic',function(req, res, next) {
  //生成multiparty对象，并配置上传目标路径
  var form = new multiparty.Form({uploadDir: './public/files/music'});
  form.parse(req,function(err, fields, files) {
    var filesTmp = JSON.stringify(files);
    console.log(files);
    if(err){
      console.log('parse error: ' + err);
    } else {
      testJson = eval("(" + filesTmp+ ")");
      console.log(testJson);
      res.json({musSrc:testJson.fileField[0].path});
      for(var index in clients){
        clients[index].emit('music',{from:uploadmu,mname:testJson.fileField[0].originalFilename,msrc:testJson.fileField[0].path});
      }
    }
  });
});