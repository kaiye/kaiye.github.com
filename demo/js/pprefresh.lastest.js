var ppRefresh = function(){
    //设置参数
    var _options = {
            rate : 3366,                                            //刷新频率
            domRefreshQuery : '',                                   //需要刷新的DOM结构
            cssLinkList : {},                                       //待更新的CSS列表
            namePrefix : 'ppRefresh',                               //临时DOM的命名前缀
            refreshInlineStyle: true,                               //是否刷新内联style
            controlLink : 'http://yekai.net/demo/css/pprefresh.css?t=1'     //控制面板样式link
        },
        _cache = {};                                                //全局cache对象

    //初始化link列表与控制面板
    (function(){
        var links = document.getElementsByTagName('link'),
            len = links.length,
            cssLinksLen = 0,
            listHtml = '';
        //构建待更新 link列表
        for(var i=0; i < len ; i++){
            if(links[i].type == 'text/css' || links[i].rel == 'stylesheet'){

                var itemName = _options.namePrefix + 'link' + cssLinksLen;
                _options.cssLinkList[itemName] = {
                    href : links[i].href,
                    refresh : true, //默认刷新
                    dom : links[i]
                };
                listHtml += ['<li>',
                         '<input type="checkbox" id="',
                         itemName,
                         '" checked /><label for="',
                         itemName,
                         '">',
                         links[i].href,
                         '</label></li>'].join('');
                cssLinksLen++;
            }
        }

        //构建当前运行状态
        var runHtml = '<h2>'+ _options.namePrefix + '<span title="切换状态" class="on" id="' + _options.namePrefix +'Switcher">运行中</span></h2>';

        //构建刷新间隔指示
        var rateHtml = '<h2>刷新频率：<input id="'+ _options.namePrefix + 'Rate" value="' + _options.rate + '" />毫秒</h2>'

        //是否刷新内联style
        var inlineSytleHTML = '<li><input type="checkbox" checked id="' + _options.namePrefix + 'InlineStyle"/><label for="'+ _options.namePrefix + 'InlineStyle">Inline Style</label></li>';

        //指定需要刷新的DOM #ID
        var domRefreshHtml = '<h2>指定刷新区域：（document.querySelectorAll）</h2>' + '<textarea id="'+ _options.namePrefix + 'DomRefresh">'+ _options.domRefreshQuery +'</textarea>';

        //拼装控制面板
        var html = runHtml + rateHtml + '<div><h2>样式刷新列表：</h2><ul>' + inlineSytleHTML + listHtml + '</ul></div>'+ domRefreshHtml +'<span class="win" onclick="this.parentNode.style.display = \'none\'">X</span>';
        var div = document.createElement('div');
        div.setAttribute('id',_options.namePrefix + 'Control');
        div.innerHTML = html;
        div.style.dipsplay = 'none';
        document.body.insertBefore(div,document.body.firstChild);
        //插入控制面板样式文件
        var controlLink = document.createElement("link");
        controlLink.setAttribute("rel", "stylesheet");
        controlLink.setAttribute("href", _options.controlLink);
        document.getElementsByTagName('head')[0].appendChild(controlLink);
        controlLink.onload = function(){
            div.style.dipsplay = 'block';
        }
        //绑定开关事件
        document.getElementById(_options.namePrefix +"Switcher").onclick = _toggle;

        // 重置全局onerror，不上报调试错误
        window.onerror = null;
    })();
    //给URL增加时间戳强制更新
    function _refreshTimestamp(url){
        var t = 'ppstamp=' + +new Date();
        return url.indexOf('?') > -1 ? url +'&' + t : url + '?' + t;
    }
    //拼装style元素
    function _createStyleEl(cssText){
        var style = document.createElement("style");
        style.setAttribute("type", "text/css");
        style.styleSheet ? style.styleSheet.cssText = cssText : style.appendChild(document.createTextNode(cssText));
        return style;
    }
    //刷新样式
    function _refreshCSS(){
        //更新页面style样式
        if(_options.refreshInlineStyle){
            if(_cache.styleList){
                //去除老的style样式
                while(document.getElementsByTagName('style').length > 0){
                    var tmp = document.getElementsByTagName('style')[0];
                    tmp.parentNode.removeChild(tmp);
                }
                //插入新的style
                for(var i=0, len = _cache.styleList.length,style; i < len; i++){
                    style = _createStyleEl(/^<(\w+)([^>]*)>(.*?)<\/\1>$/ig.exec(_cache.styleList[i])[3]);
                    document.getElementsByTagName('head')[0].appendChild(style);
                }
            }
        }
        //更新页面link样式
        for(var list in _options.cssLinkList){
            var item = _options.cssLinkList[list];
            if(item.refresh){
                item.dom.href = _refreshTimestamp(item.href);
            }
        }
    }
    //刷新局部DOM结构
    function _refreshArea(){
        if(!document.querySelectorAll) return;
        try{
            var newList = _cache.iframeDoc.querySelectorAll(_options.domRefreshQuery),
                oldList = document.querySelectorAll(_options.domRefreshQuery),
                len = oldList.length;
            if(len > 0 && newList.length === oldList.length){
                while(len--){
                    oldList[len].innerHTML = newList[len].innerHTML;
                }
            }
        }catch(e){}
    }
    //获取新的DOM结构
    function _getHTMLContent(callback){
        var opt = {
            url: _refreshTimestamp(location.href),
            onloadFunc : function(){
                callback();
            }
        };
        //若有需要更新的DOM结构
        if(_options.domRefreshQuery.length > 0 && !_cache.loadingIframe){
            if(!document.getElementById(_options.namePrefix + 'Iframe')){
                var iframe = document.createElement('iframe');
                _cache.iframe = iframe;
                iframe.setAttribute('id',_options.namePrefix + 'Iframe');
                iframe.style.width = 0;
                iframe.style.height = 0;
                iframe.style.visibility = 'hidden';
                document.body.appendChild(iframe);
                _cache.iframe.onload = function(){
                    _cache.iframeDoc = this.contentWindow.document;
                    opt.onloadFunc();
                    _cache.loadingIframe = false;
                    _refreshArea();
                }
            }
            _cache.iframe.src = opt.url;
            _cache.loadingIframe = true;
        }
        //ajax拉取
        if(!_options.loadingAjax){
            _ajax({url : opt.url,
                   success : function(rsp){
                       var html = rsp.replace(/\r\n/ig,'').replace(/\n/ig,'');//剔除回车换行、换行
                       _cache.styleList = html.match(/(<style([^>]*)?>([\s\S]*?)<\/style>)/ig);
                       opt.onloadFunc();
                       _options.loadingAjax = false;
                       _refreshCSS()
                   }
            });
            _options.loadingAjax = true;
        }
    }
    //ajax请求基础方法
    function _ajax(opt){
        var req = null;
        if(window.XMLHttpRequest){
            req = new XMLHttpRequest();
        } else if(window.ActiveXObject){
            req = new ActiveXObject("Microsoft.XMLHTTP");
        } else {
            return;
        }
        req.onreadystatechange = function(){
            if(req.readyState == 4){
                opt.success(req.responseText);
            }
        };
        req.open ('GET', opt.url, true);
        req.send ('');
    }
    //刷新接口
    function _refresh(){
        for(var itemName in _options.cssLinkList){
            _options.cssLinkList[itemName].refresh = document.getElementById(itemName).checked;
        }
        //重置参数
        _options.rate = document.getElementById(_options.namePrefix +'Rate').value - 0;//刷新频率
        _options.domRefreshQuery = document.getElementById(_options.namePrefix +'DomRefresh').value.replace('\n','').replace(/(^\s*)|(\s*$)/g,''); //刷新query
        _options.refreshInlineStyle = document.getElementById(_options.namePrefix +'InlineStyle').checked;

        //重新获取内容
        _getHTMLContent(function(){

        });
        _cache.timer = setTimeout(_refresh,_options.rate);
    }
    //开关
    function _toggle(){
            //改变指示器状态
            var switcher = document.getElementById(_options.namePrefix +'Switcher');
                switcher.className = _cache.isRunning ? 'off' : 'on';
                switcher.innerHTML = _cache.isRunning ? '已停止' : '运行中';
            //关闭
            if(_cache.isRunning){
                if(!!_cache.timer){
                    clearInterval(_cache.timer);
                    _cache.timer = null;
                }
                _cache.isRunning = false;
            //开启
            }else{
                if(!_cache.timer){
                    _cache.timer = setTimeout(_refresh,_options.rate);
                }
                _cache.isRunning = true;
            }
    }
    return {
        toggle : function(){
            _toggle();
            document.getElementById(_options.namePrefix +'Control').style.display = 'block';
        }
    }
}();
ppRefresh.toggle();