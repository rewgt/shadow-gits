### 关于 Shadow Gits

shadow-gits 为 [Github API V3](https://developer.github.com/v3/) 与 [shadow-server](https://github.com/rewgt/shadow-widget) 封装一套通用的，用于读写指定目录与文件的 API。

shadow-gits 让一个托管在 github.com 上的 repository，能在线读取指定分支（比如 gh-pages）下最新目录及文件内容，同时还支持在该分支下创建新文件，以及修改已有文件的内容。因为 `<user>` 用户 `gh-pages` 分支的 `<repo>` 库，github 提供 Web 文件服务，读取方式为 `https://<user>.github.io/<repo>/...`。

本库为在线增、删、改上述 `gh-pages` 分支中的文件提供一个精简的操作集合。同时，本软件还按相同的接口，为 Shadow Widget 开发系统的本机调测（即缺省启动在 `localhost:3000` 的 Web Service 服务）提供封装，同等实现文件增、删、改。

shadow-gits 按 BSD 协议开源。

### 安装 Shadow Gits

先安装 Shadow Widget：

``` bash
  mkdir user
  cd user
  git clone https://github.com/rewgt/shadow-server.git
```

然后安装 Shadow Gits：

``` bash
  git clone https://github.com/rewgt/shadow-gits.git
```

### 如何使用 shadow-gits

本库限在 shadow-widget 开发系统中使用，遵守 shadow-widget 相关编程约定，请参考《Shadow Widget 用户参考手册》。

第 1 步，在当前开发的 html 文件中添加 shadow-widget 与 shadow-gits 库引用，比如：

``` html
<link rel="stylesheet" shared="true" href="lib/sw_base.css" />

<script src="lib/react.min.js"></script>
<script src="lib/react-dom.min.js"></script>
<script src="lib/shadow-gits.min.js"></script>
<script src="lib/shadow-widget.min.js"></script>
```

第 2 步，编写初始化代码，获得 `Git` 模块，比如：

``` html
<script>
if (!window.W) { window.W = new Array(); W.$modules = [];}
W.$modules.push( function(require,module,exports) {

var React = require('react');
var ReactDOM = require('react-dom');

var W = require('shadow-widget');
var main = W.$main, utils = W.$utils, ex = W.$ex, idSetter = W.$idSetter;

var Git = utils.gitOf('api.github.com','https');
// var Git = utils.gitOf('localhost:3000','http');
});
</script>
```

用 `utils.gitOf('api.github.com','https')` 获得用于在线操作 github 上文件的模块，`utils.gitOf('localhost:3000','http')` 则获得操作本机文件的模块。

第 3 步，配置与使用 `Git` 模块，比如：

``` js
Git.siteAuth = 'authorization_code';  // Basic or OAuth authorization

var userObj = new Git.User('userName');    // such as 'rewgt'
var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');

braObj.fileOf('lib/base.css').readRaw( function(err,fileObj) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('content:',fileObj.rawContent);
});
```

### API 接口

1）`Git.siteAuth`

提供登录授权令牌，仅用于 api.github.com，本机 localhost 不用。支持 Basic 与 OAuth 两种格式：

```
  Basic <ACCESS_TOKEN>
  OAuth <ACCESS_TOKEN>
```

Basic 是简单认证，它的 `<ACCESS_TOKEN>` 是 `'user:password'` 经 Base64 编码后字串，可这么获得：

``` js
  // please replace with your github account and password
  Git.siteAuth = 'Basic ' + utils.Base64.encode('user:password');
```

OAuth 是 github 的 OAuth2 认证，它的 `<ACCESS_TOKEN>` 由经授权的应用程序提供，请参考 [Github OAuth](https://developer.github.com/v3/oauth/)。

2）`Git.User`

定义 User 对象，同时适用于 api.github.com 与 localhost，例如：

``` js
  // please replace with your github account name
  var userObj = new Git.User('rewgt');
```

2.1）`User.login`

当前 User 的登录名，例如：

``` js
  var userObj = new Git.User('rewgt');
  console.log('login name is:', userObj.login);
```

2.2）`User.isLocal`

指明当前 User 用于 api.github.com，还是 localhost。例如：

``` js
  var userObj = new Git.User('rewgt');
  console.log('isLocal =', userObj.isLocal);
```

请按只读方式使用本属性。

2.3）`User.fetch(callback)`

获取当前用户的详细信息，仅用于 api.github.com，localhost 不支持，例如：

``` js
  var userObj = new Git.User('rewgt');
  userObj.fetch( function(err,userObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(userObj);
  });
```

3）`Git.Branch`

定义版本分支对象，同时适用于 api.github.com 与 localhost，例如：

``` js
  // please replace with your github account name
  var userObj = new Git.User('rewgt');
  var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');
```

创建 Branch 对象时，要传入 User 对象、repository 库名称、branch 分支名称。

3.1）`Branch.isLocal`，是否为 localhost 上的分支

3.2）`Branch.user`，User 对象

3.3）`Branch.repoName`，repo 库名

3.4）`Branch.branchName`，分支名

3.5）`Branch.dirOf(sPath)`

获得 `Git.Dir` 对象，参数 `sPath` 为相对路径，例如：

``` js
  var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');
  var dirObj = braObj.dirOf('lib');
```

3.6）`Branch.fileOf(sPath)`

获得 `Git.File` 对象，参数 `sPath` 为相对路径，例如：

``` js
  var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');
  var fileObj = braObj.fileOf('lib/base.css');
```

3.7）`Branch.fetchCommits(callback, sSince,sUntil)`

取当前分支（`Branch.branchName`）的 Git.Commit 对象列表，仅适用于 api.github.com，localhost 不支持，参数 `sSince` 与 `sUntil` 用来指示查询的起止时间范围，格式为 `'YYYY-MM-DDTHH:MM:SSZ'`，这两者可以缺省，缺省时表示取全部范围，例如：

``` js
  braObj.fetchCommits( function(err,braObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(braObj.commits);
  });
```

3.8）`Branch.fetchIssues(callback, opt)`

取当前分支所在 repo 库的 issue 列表，仅适用于 api.github.com，localhost 不支持。其中 `opt` 参数可传入 github API V3 要求的额外参数，如 `since, sort, direction, state` 等。例如：

``` js
  braObj.fetchIssues( function(err,braObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(braObj.issues);
  },{since:'2017-01-01T00:00:00Z'});
```

3.9）`Branch.createIssue(callback, opt)`

在当前分支所在 repo 库创建一个新 issue，仅适用于 api.github.com，localhost 不支持。其中 `opt` 参数可传入 github API V3 要求的额外参数，如 `title,body,milestone,labels,assignees` 等。例如：

``` js
  braObj.createIssue( function(err,newIssue) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(newIssue);
  },{title:'Issue title',body:'Issue description'});
```

4）`Git.Issue`

定义 github.com 的 Issue 对象，只适用于 api.github.com，对 localhost 无效，例如：

``` js
  var issueObj = new Git.Issue(userObj,'shadow-gits',1);
  issueObj.fetchContents( function(err, issueObj) {
    // ...
  });
```

4.1）`Issue.user`，User 对象

4.2）`Issue.repoName`，repo 库名

4.3）`Issue.number`，当前 issue 的 ID 号，在 github.com 网站提交 issue 时分配的

4.4）`Issue.comments`，当前 issue 的评论列表

4.5）`Issue.fetchContents(callback)`

取得当前 issue （由 `Issue.number` 指示 ID 号）的详细定义。例如：

``` js
  var issueObj = new Git.Issue(userObj,'shadow-gits',1);
  issueObj.fetchContents( function(err, issueObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(issueObj);
  });
```

4.6）`Issue.fetchComments(callback)`

取得当前 issue 的评论列表。例如：

``` js
  issueObj.fetchComments( function(err, comments) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(comments);
  });
```

4.7）`Issue.fetchEvents(callback)`

取得当前 issue 的事件列表。例如：

``` js
  issueObj.fetchEvents( function(err, events) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(events);
  });
```

5）`Git.Dir`

定义目录对象，同时适用于 api.github.com 与 localhost，例如：

``` js
  var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');
  var dirObj = braObj.dirOf('lib');
  // var dirObj = new Git.Dir({path:'lib'},userObj,'shadow-gits','gh-pages');  // just same
```

5.1）`Dir.user`，User 对象

5.2）`Dir.repoName`，repo 库名

5.3）`Dir.branchName`，分支名

5.4）`Dir.path`，本目录的路径名

5.5）`Dir.contents`，本目录下的文件或子目录列表，需调用 `Dir.fetchContents()` 获得

5.6）`Dir.fetchContents(callback)`

取当前分支（Dir.branchName）当前目录（Dir.path）下的文件或子目录列表，例如：

``` js
  dirObj.fetchContents( function(err,dirObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(dirObj.contents);
  });
```

5.7）`Dir.newFile(sFile,sRawContent,callback,sContent)`

在当前分支、当前目录下创建一个文件，参数 `sFile` 是待创建的文件名，`sRawContent` 是文件内容，`utf-8` 字串格式。`sContent` 是经过 Base64 编码的文件内容，可以缺省。例如：

``` js
  dirObj.newFile('test2.txt','example', function(err,bOut) {
    if (err) {
      console.log(err);
      return;
    }
    var fileObj = bOut[0], commitObj = bOut[1];
    console.log(fileObj,commitObj);
  });
```

参数 `sContent` 通常缺省，当 `sRawContent` 参数为 `undefined` 时，系统将以 `sContent` 值为准存盘，否则以 `sRawContent` 为准。这两个参数的转换关系是 `sContent = utils.Base64.encode(sRawContent)`。

说明：成功创建的 `fileObj` 会自动登记到当前 `dirObj.contents` 中。

5.8）`Dir.putFile(sFile,sRawContent,callback,oldSha,sContent)`

保存新的文件内容 `sRawContent` 到当前分支、当前目录下的 `sFile` 文件中。`oldSha` 指明旧文件的 sha 值，如果该参数缺省（或传 `undefined` 值），表示自从 `Dir.contents` 中名为 `sFile` 的文件对象中找出（即取 `File.sha` 值）。`sContent` 是经过 Base64 编码的文件内容，可以缺省。例如：

``` js
  dirObj.putFile('test2.txt','changed text', function(err,bOut) {
    if (err) {
      console.log(err);
      return;
    }
    var fileObj = bOut[0], commitObj = bOut[1];
    console.log(fileObj,commitObj);
  });
```

参数 `sContent` 通常缺省，当 `sRawContent` 参数为 `undefined` 时，系统将以 `sContent` 值为准存盘，否则以 `sRawContent` 为准。这两个参数的转换关系是 `sContent = utils.Base64.encode(sRawContent)`。

说明：成功保存后的 `fileObj` 会替换当前 `dirObj.contents` 中的原文件对象。对于 localhost，文件的校验码 sha 并非必需，但对于 api.github.com，存盘时必须给出正确的原有 sha 值。

5.9）`Dir.removeFile(sFile,callback,oldSha)`

删除当前分支、当前目录下的 `sFile` 文件，`oldSha` 指明旧文件的 sha 值，如果该参数缺省，表示自从 `Dir.contents` 中名为 `sFile` 的文件对象中找出（即取 `File.sha` 值）。例如：

``` js
  dirObj.removeFile('test2.txt', function(err,bOut) {
    if (err) {
      console.log(err);
      return;
    }
    var fileObj = bOut[0], commitObj = bOut[1];
    console.log(fileObj,commitObj);  // fileObj must be null
  });
```

说明：成功删除后的 `fileObj` 会从当前 `dirObj.contents` 列表中移除。对于 localhost，文件的校验码 sha 并非必需，但对于 api.github.com，删文件时必须给出正确原有 sha 值。

5.10）`Dir.dirOf(sPath)`

获得 `Git.Dir` 对象，参数 `sPath` 为相对路径，自动串接到当前 `Dir.path` 之后，例如：

``` js
  var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');
  var dirObj = braObj.dirOf('');
  var dirObj2 = dirObj.dirOf('lib');
```

5.11）`Dir.fileOf(sPath)`

获得 `Git.File` 对象，参数 `sPath` 为相对路径，自动串接到当前 `Dir.path` 之后，例如：

``` js
  var braObj = new Git.Branch(userObj,'shadow-gits','gh-pages');
  var dirObj = braObj.dirOf('lib');
  var fileObj = dirObj.fileOf('base.css');  // get 'lib/base.css'
```

5.12）`Dir.getDir(sName)`

从当前 `Dir.contents` 列表中找出名为 `sName` 的子目录对象，如果没找到返回 `undefined`。例如：

``` js
  var dirObj = dirObj.getDir('lib');
```

说明：调用 `Dir.getDir()` 之前应先调用 `Dir.fetchContents()`，否则 `Dir.contents` 列表是空的。

5.13）`Dir.getFile(sName)`

从当前 `Dir.contents` 列表中找出名为 `sName` 的文件对象，如果没找到返回 `undefined`。例如：

``` js
  var fileObj = dirObj.getFile('README.md');
```

说明：调用 `Dir.getFile()` 之前应先调用 `Dir.fetchContents()`，否则 `Dir.contents` 列表是空的。

6）`Git.File`

定义文件对象，同时适用于 api.github.com 与 localhost，例如：

``` js
  var dirObj = braObj.dirOf('lib');
  var fileObj = dirObj.fileOf('base.css');
  // var fileObj = new Git.File({path:'lib/base.css'},userObj,'shadow-gits','gh-pages');
```

6.1）`File.user`，User 对象

6.2）`File.repoName`，repo 库名

6.3）`File.branchName`，分支名

6.4）`File.path`，本文件的路径名

6.5）`File.name`，文件名（不带路径）

6.6）`File.fetchContent(callback)`

读取当前文件内容，例如：

``` js
  fileObj.fetchContents( function(err,fileObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(fileObj.content);
  });
```

说明：每次调用本函数，都向服务侧发送请求，返回内容以 Base64 编码格式在 `fileObj.content` 记录。用户可以调用 `utils.Base64.decode(fileObj.content)` 获得解码内容，或者通过调用 `File.readRaw()` 获得解码后内容。

6.7）`File.fetchCommits(callback,sSince,sUntil)`

取当前文件的 Git.Commit 对象列表，仅适用于 api.github.com，localhost 不支持，参数 `sSince` 与 `sUntil` 用来指示查询的起止时间范围，格式为 `'YYYY-MM-DDTHH:MM:SSZ'`，这两者可以缺省，缺省时表示取全部范围，例如：

``` js
  fileObj.fetchCommits( function(err,fileObj) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(fileObj.commits);
  });
```

6.8）`File.readContent(callback)`

读取当前文件内容，例如：

``` js
  fileObj.readContent( function(err,content) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(content);
    console.log(fileObj.content, fileObj.size, fileObj.sha);
  });
```

说明：本函数与 `File.fetchContent()` 的区别是：每次调用 `fetchContent()` 都会向服务侧发送更新请求，而调用 `readContent()` 只在当前 `File.content` 未定义时才向服务侧发送一次请求，其后再次调用都将重用已读取的文件内容。

6.9）`File.readRaw(callback)`

读取当前文件内容，例如：

``` js
  fileObj.readRaw( function(err,rawContent) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(rawContent);
    console.log(fileObj.rawContent, fileObj.size, fileObj.sha);
  });
```

说明：本函数类似于 `File.readContent()`，仅附加如下一步操作：

```
  fileObj.rawContent = utils.Base64.decode(fileObj.content);
```

6.10）`File.putContent(sRawContent,callback,sContent)`

更新文件内容，`sRawContent` 是 `utf-8` 格式的内容字串。`sContent` 是经过 Base64 编码的文件内容，可以缺省。例如：

``` js
  fileObj.putContent('changed text', function(err,bOut) {
    if (err) {
      console.log(err);
      return;
    }
    var fileObj = bOut[0], commitObj = bOut[1];
    console.log(fileObj, commitObj);
  });
```

参数 `sContent` 通常缺省，当 `sRawContent` 参数为 `undefined` 时，系统将以 `sContent` 值为准存盘，否则以 `sRawContent` 为准。这两个参数的转换关系是 `sContent = utils.Base64.encode(sRawContent)`。

说明：对于 api.github.com，更新文件内容时，`fileObj.sha` 须已取得（通过 `dirObj.fetchContents()` 或 `fileObj.fetchContent()`）。

6.11）`File.remove(callback)`

删除文件内容。例如：

``` js
  fileObj.remove(function(err,bOut) {
    if (err) {
      console.log(err);
      return;
    }
    var fileObj = bOut[0], commitObj = bOut[1];
    console.log(fileObj, commitObj);  // fileObj must be null
  });
```

说明：对于 api.github.com，删除文件时，`fileObj.sha` 须已取得（通过 `dirObj.fetchContents()` 或 `fileObj.fetchContent()`）。

7）`Git.Commit`

定义提交的 Commit 对象，仅适用于 api.github.com，可用 `Brach.fetchCommits()` 取得当前分支的 Commit 对象列表，用 `File.fetchCommits()` 取得指定文件当前分支的 Commit 对象列表。

7.1）`Commit.user`，User 对象

7.2）`Commit.repoName`，repo 库名

&nbsp;
