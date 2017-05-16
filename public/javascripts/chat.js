$(document).ready(function(e) {
	$(window).keydown(function(e){
		if(e.keyCode == 116)
		{
			if(!confirm("Refresh will clear all the content, are you sure ?"))
			{
				e.preventDefault();
			}
		}
  });
	var from = $.cookie('user');
	var to = 'all';

	$("#input_content").val("");
	if (/Firefox\/\s/.test(navigator.userAgent)){
	    var socket = io.connect({transports:['xhr-polling']});
	}
	else if (/MSIE (\d+.\d+);/.test(navigator.userAgent)){
	    var socket = io.connect({transports:['jsonp-polling']});
	}
	else {
	    var socket = io.connect();
	}

	//music点击
	// $("#music").click(function(){
	// 	$(".music-input").toggleClass("music-show");
	// 	$("#content_show").toggleClass("contents-less");
	// });
	// $(".btn-sm").click(function(){
	// 	if($("#form-room-music-name, #form-room-music-url").val()){

	// 	}
	// });
	//QQ表情
	$('#emotion').qqFace({   //表情转换
    // id: 'facebox',  //表情盒子的ID
    assign: 'input_content',  //给那个id为msg的控件赋值
    path: 'images/qqface/' //表情存放的路径
	});

	socket.emit('online',JSON.stringify({user:from}));
	socket.on('disconnect',function(){
		var msg = '<div style="color:#f00">SYSTEM: Failed to connect the server</div>';
		addMsg(msg);
		$("#list").empty();
	});
	socket.on('reconnect',function(){
		socket.emit('online',JSON.stringify({user:from}));
		var msg = '<div style="color:#f00">SYSTEM: Reconnecting the server</div>';
		addMsg(msg);
	});
	socket.on('system',function(data){
		var data = JSON.parse(data);
		var time = getTimeShow(data.time);
		var msg = '';
		if(data.type =='online')
		{
			msg += 'User ' + data.msg +' online !';
		} else if(data.type =='offline')
		{
			msg += 'User ' + data.msg +' offline !';
		} else if(data.type == 'in')
		{
			msg += 'You are in the chatroom';
		} else
		{
			msg += 'Unknow system msg';
		}
		var msg = '<div style="color:#f00">SYSTEM('+time+'):'+msg+'</div>';
		addMsg(msg);
		play_ring("/ring/online.wav");
	});
	socket.on('userflush',function(data){
		var data = JSON.parse(data);
		var users = data.users;
		flushUsers(users);
	});
	socket.on('say',function(msgData){
		var time = msgData.time;
		time = getTimeShow(time);
		var data = msgData.data;
		if (data.to=='all') {
			addMsg('<div>'+data.from+'('+time+'): <br/>'+data.msg+'</div>');
		} else if(data.from == from) {
			addMsg('<div>Me('+time+')said to '+data.to+': <br/>'+data.msg+'</div>');
		} else if(data.to == from)
		{
			addMsg('<div>'+data.from+'('+time+')said to me: <br/>'+data.msg+'</div>');
			play_ring("/ring/msg.wav");
		}
	});

	// var mname = $("#form-room-music-name").val();
	// var murl = $("#form-room-music-nurl").val();
	// socket.emit('music',JSON.stringify({name:mname,url:murl}));
	socket.on('music',function(data){
		// var data = JSON.parse(data);
		data.msrc = data.msrc.replace('public','');
		data.msrc = data.msrc.replace(/\\/g,'\/');
		$(".sound").attr('src',data.msrc);
		$(".music-name").html(data.mname);
		addMsg('<div style="color:#F90">'+data.from+' shared: '+data.mname+'</div>');
		localStorage.setItem("music-src",data.msrc);
		localStorage.setItem("music-name",data.mname);
	});

	$('#j_sendmsg').on('click',function(){
		$('#j_sendmsg').val("");
	});
	$('#j_sendmsg').on('change',function(){
		// 判断上传文件类型
		var objFile = $('#j_sendmsg').val();
		var objType = objFile.substring(objFile.lastIndexOf(".")).toLowerCase();
		var formData = new FormData(document.forms.namedItem("test"));
		var arr = ["jpg","png","gif","svg"];
		if(checkFileExt(objFile,arr)){
			$.ajax({
				type: 'post',
				url: '/uploadUserImgPre',
				data: formData ,
				processData: false,
				async: false,
				cache: false,
		  	contentType: false,
				success:function(re){
					re.imgSrc = re.imgSrc.replace('public','');
					re.imgSrc = re.imgSrc.replace(/\\/g,'\/');
					$("#input_content").append('<img class="insert-img" src="'+re.imgSrc+'">');
					setTimeout(function(){
						socket.emit('say',JSON.stringify({to:to,from:from,msg:(replace_em($("#input_content").html()))}));
						$("#input_content").html("");
					  $("#input_content").focus();
					},500);

				},
				error:function(re){
					console.log(re);
				}
			});
		}
	});
	$('#j_sendMusic').on('change',function(){
		// 判断上传文件类型
		var objFile = $('#j_sendMusic').val();
		var objType = objFile.substring(objFile.lastIndexOf(".")).toLowerCase();
		var formData = new FormData(document.forms.namedItem("music"));
		var arr = ["mp3"];
		if(checkFileExt(objFile,arr)){
			socket.emit('music',{from:from});
			$.ajax({
				type: 'post',
				url: '/uploadMusic',
				data: formData ,
				processData: false,
				async: false,
				cache: false,
		  	contentType: false,
				success:function(re){

				},
				error:function(re){
					console.log(re);
				}
			});
		}
	});
	function addMsg(msg){
	  $("#contents").append(msg);
	  $("#contents").append("<br/>");
	  $("#contents").scrollTop($("#contents")[0].scrollHeight);
	}
	function flushUsers(users)
	{
		var ulEle = $("#list")
			,	people = $("#people");
		people.html("Total Users: "+users.length);
		ulEle.empty();
		ulEle.append('<li title="dbclick to chat" alt="all" onselectstart="return false">Everyone</li>');
		for(var i = 0; i < users.length; i ++)
		{
			ulEle.append('<li alt="'+users[i]+'" title="dbclick to chat" onselectstart="return false">'+users[i]+'</li>')
		}
			//双击对某人聊天
		$("#list > li").dblclick(function(e){
			if($(this).attr('alt') != from)
			{
				to = $(this).attr('alt');
				show_say_to();
			}
		});
		show_say_to();
	}
	$("#input_content").keydown(function(e) {
	  if(e.shiftKey && e.which==13){
		$("#input_content").append("<br/>");
	  } else if(e.which == 13)
	  {
		e.preventDefault();
			say();
	  }
	});
	$("#say").click(function(e){
		say();
	});
	function say()
	{
		if ($("#input_content").val() == "") {
			return;
		}
		socket.emit('say',JSON.stringify({to:to,from:from,msg:(replace_em($("#input_content").val()))}));
	  $("#input_content").val("");
	  $("#input_content").focus();
	}
	//表情替换函数
	function replace_em(str){
    str = str.replace(/\</g,'<');
    str = str.replace(/\>/g,'>');
    str = str.replace(/\n/g,'<br/>');
    str = str.replace(/\[em_([0-9]*)\]/g,'<img src="/images/qqface/$1.gif" border="0" />');
    return str;
	}
	//显示正在对谁说话
	function show_say_to()
	{
		$("#from").html(from);
		$("#to").html(to=="all" ? "Everyone" : to);
		var users = $("#list > li");
		for(var i = 0; i < users.length; i ++)
		{
			if($(users[i]).attr('alt')==to)
			{
				$(users[i]).addClass('sayingto');
			}
			else
			{
				$(users[i]).removeClass('sayingto');
			}
		}
	}
	function play_ring(url){
		var embed = '<embed id="ring" src="'+url+'" loop="0" autostart="true" hidden="true" style="height:0px; width:0px;0px;"></embed>';
		$("#ring").html(embed);
	}
	// function play_musci(url){

	// 	$(".sound").attr('src',url);
	// }
	function getTimeShow(time)
	{
		var dt = new Date(time);
		time = dt.getFullYear() + '-' + (dt.getMonth()+1) + '-' + dt.getDate() + ' '+dt.getHours() + ':' + (dt.getMinutes()<10?('0'+ dt.getMinutes()):dt.getMinutes()) + ":" + (dt.getSeconds()<10 ? ('0' + dt.getSeconds()) : dt.getSeconds());
		return time;
	}
	$.cookie('isLogin',true);

	function checkFileExt(filename,arr){
	  var flag = false; //状态
	  //取出上传文件的扩展名
	  var index = filename.lastIndexOf(".");
	  var ext = filename.substr(index+1);
	  //循环比较
	  for(var i=0;i<arr.length;i++){
	    if(ext == arr[i]){
	   		flag = true; //一旦找到合适的，立即退出循环
	   		break;
	  	}
	 	}
	  if(!flag){
	   alert("请上传正确的文件名");
	  }
	  return flag;
	}


	$('#contents').bind('DOMNodeInserted', function(e) {
		$(e.target).find("*").html();
		var c = $("#contents").html();
		localStorage.setItem("contentss",c);
		// console.log(c)
	});
	var contents = localStorage.getItem("contentss");
	if(localStorage.getItem("cookie-name") != $.cookie('user')){
		localStorage.setItem("cookie-name",$.cookie('user'));
		contents = localStorage.setItem("contentss","");
		localStorage.setItem("music-src","");
		localStorage.setItem("music-name","");
	};
	// console.log(contents)
	$("#contents").append(contents);
	$(".sound").attr('src',localStorage.getItem("music-src"));
	$(".music-name").html(localStorage.getItem("music-name"));
});
