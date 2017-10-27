// shadow-gits

if (!window.W) { window.W = new Array(); W.$modules = [];} W.$modules.push( function(require,module,exports) {

if (!Array.prototype.findIndex) {  // polyfill function
  Array.prototype.findIndex = function(predicate) {
    // 1. Let O be ? ToObject(this value).
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var o = Object(this);

    // 2. Let len be ? ToLength(? Get(O, "length")).
    var len = o.length >>> 0;

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
    var thisArg = arguments[1];

    // 5. Let k be 0.
    var k = 0;

    // 6. Repeat, while k < len
    while (k < len) {
      // a. Let Pk be ! ToString(k).
      // b. Let kValue be ? Get(O, Pk).
      // c. Let testResult be ToBoolean.
      // d. If testResult is true, return k.
      var kValue = o[k];
      if (predicate.call(thisArg, kValue, k, o)) {
        return k;
      }
      // e. Increase k by 1.
      k++;
    }

    // 7. Return -1.
    return -1;
  };
}

if (!Array.prototype.find) {  // polyfill function
  var fn_array_find_ = Array.prototype.findIndex;
  Array.prototype.find = function() {
    // 1. Let O be ? ToObject(this value).
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var o = Object(this);
    var i = fn_array_find_.apply(o,arguments);
    return i >= 0? o[i]: undefined;
  };
}

var W = require('shadow-widget');
var utils = W.$utils;

//------------

var Base64 = utils.Base64;
var Git    = {};
var Local  = {};

utils.gitOf = function(sDomain,sProtocol) {
  if (!sDomain || typeof sDomain != 'string')
    return Git;
  else if (sDomain.indexOf('localhost') == 0 || sDomain.indexOf('127.0.0.1') == 0) {
    Local.siteDomain = sDomain;
    if (sProtocol) Local.siteProtocol = sProtocol;
    return Local;
  }
  else {
    Git.siteDomain = sDomain;
    if (sProtocol) Git.siteProtocol = sProtocol;
    return Git;
  }
}

var Kind = function() {}; // Object Model Tools that like Backbone

Kind.inherits = function(parent,protoProps,staticProps) {
  var child, ctor = function(){};
  if (protoProps && protoProps.hasOwnProperty('constructor'))
    child = protoProps.constructor;
  else child = function() { parent.apply(this,arguments); };
  
  // inherits from parent
  merge(child,parent);
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  
  // instance properties
  if (protoProps) merge(child.prototype, protoProps);

  // static properties
  if (staticProps) merge(child,staticProps);

  // correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // set a convenience property in case the parent's prototype is needed later.
  child.__super__ = parent.prototype;
  return child;
  
  function merge(destination, source) {
    for (var prop in source) {
      destination[prop] = source[prop];
    }
  }
};

Kind.extend = function(protoProps,staticProps) {
  var child = Kind.inherits(this,protoProps,staticProps);
  child.extend = this.extend;
  return child;
};

var ItemContent = Kind.extend( {
  constructor: function(contentItem,ghUser,repoName,branchName) {
    if (contentItem) {
      for (var prop in contentItem) {
        this[prop] = contentItem[prop];
      }
    }
    if (ghUser) this.user = ghUser;
    if (repoName) this.repoName = repoName;
    if (branchName) this.branchName = branchName;
  },
},{});

function makeArray_(item) {
  if (!item) return [];
  if (Array.isArray(item))
    return item;
  else return [item];
}

function msgOfToday_() {
  return (new Date()).toLocaleDateString().replace(/\//g,'-');
}

function getServerUrl_(where,sPost) {
  return where.siteProtocol + '://' + where.siteDomain + (sPost[0] === '/'? sPost: '/'+sPost);
}

function fetchFileContent_(where,self,callback) {
  var reqest = { type:'GET', dataType:'json',
    url: getServerUrl_(where,'/repos/' + self.user.login + '/' + self.repoName + '/contents/' + self.path),
    data: {_:(new Date()).valueOf()+''},
    success: function(res,statusText,xhr) {
      for (var prop in res) {
        self[prop] = res[prop];  // content, sha, size ...
      }
      if (callback) callback(null,self);
    },
    error: function(xhr,statusText) {
      if (callback) callback(new Error(statusText),self);
    },
  };
  if (where.siteAuth) reqest.headers = {Authorization:where.siteAuth};
  utils.ajax(reqest);
}

function putFileContent_(where,sFile,sRaw,oldSha,callback,fileObj,dirObj,sCnt) {
  var sFilePath,sBranch,sRepo,ghUser, sNowDate = msgOfToday_();
  if (dirObj) {
    sFilePath = dirObj.path;
    sFilePath = sFilePath? sFilePath + '/' + sFile: sFile;
    sBranch = dirObj.branchName;
    sRepo = dirObj.repoName;
    ghUser = dirObj.user;
  }
  else if (fileObj) {
    sFilePath = fileObj.path;
    sBranch = fileObj.branchName;
    sRepo = fileObj.repoName;
    ghUser = fileObj.user;
  }
  else return;  // fatal error, ignore
  
  var contentIn = sRaw === undefined? sCnt: Base64.encode(sRaw);
  if (contentIn === undefined) return;  // fatal error, ignore
  
  var dData = {path:sFilePath, message:sNowDate, content:contentIn, branch:sBranch};
  if (oldSha) dData.sha = oldSha;  // !oldSha means create new (for localhost just overwrite)
  
  var reqest = { type:'PUT', dataType:'json',
    url: getServerUrl_(where,'/repos/' + ghUser.login + '/' + sRepo + '/contents/' + sFilePath),
    data: dData,
    success: function(res,statusText,xhr) {
      var fileObj2 = null, commitObj = null;
      if (res.content && res.content.type == 'file') {
        fileObj2 = new where.File(res.content,ghUser,sRepo,sBranch);
        fileObj2.content = contentIn;
        fileObj2.rawContent = sRaw;
        if (dirObj) {
          var iPos = dirObj.contents.findIndex( function(item) {
            return item.name == sFile && item.type == 'file';
          });
          if (iPos >= 0)
            dirObj.contents.splice(iPos,1,fileObj2);
          else dirObj.contents.push(fileObj2);
        }
        else {  // for fileObj, simple overwrite
          for (var prop in fileObj2) {
            if (fileObj2.hasOwnProperty(prop))
              fileObj[prop] = fileObj2[prop];
          }
        }
      }
      if (res.commit && where.Commit) { // for localhost, res.commit should be undefined
        commitObj = new where.Commit(res.commit,ghUser,sRepo);
        if (fileObj2) {
          if (fileObj2.sha) commitObj.file_sha = fileObj2.sha;
          if (fileObj2.url) commitObj.file_url = fileObj2.url;
        }
      }
      if (callback) {
        if (!fileObj2) {
          if (dirObj)
            fileObj2 = dirObj.fileOf(sFile);
          else fileObj2 = fileObj;
          fileObj2.content = contentIn;
          fileObj2.rawContent = sRaw;
        }
        callback(null,[fileObj2,commitObj]);
      }
    },
    error: function(xhr,statusText) {
      if (callback) callback(new Error(statusText),[null,null]);
    },
  };
  if (where.siteAuth) reqest.headers = {Authorization:where.siteAuth};
  
  utils.ajax(reqest);
}

function deleteFile_(where,sFile,oldSha,callback,fileObj,dirObj) {
  var sFilePath,sBranch,sRepo,ghUser, sNowDate = msgOfToday_();
  if (dirObj) {
    sFilePath = dirObj.path;
    sFilePath = sFilePath? sFilePath + '/' + sFile: sFile;
    sBranch = dirObj.branchName;
    sRepo = dirObj.repoName;
    ghUser = dirObj.user;
  }
  else if (fileObj) {
    sFilePath = fileObj.path;
    sBranch = fileObj.branchName;
    sRepo = fileObj.repoName;
    ghUser = fileObj.user;
  }
  else return;  // fatal error, ignore
  
  var reqest = { type:'DELETE', dataType:'json',
    url: getServerUrl_(where,'/repos/' + ghUser.login + '/' + sRepo + '/contents/' + sFilePath),
    data: {path:sFilePath, message:sNowDate, branch:sBranch, sha:oldSha},
    success: function(res,statusText,xhr) {
      var fileObj2;
      if (dirObj) {
        var iPos = dirObj.contents.findIndex( function(item) {
          return item.name == sFile && item.type == 'file';
        });
        if (iPos >= 0) {
          fileObj2 = dirObj.contents[iPos];
          dirObj.contents.splice(iPos,1);
        }
        else fileObj2 = dirObj.fileOf(sFile);
      }
      else fileObj2 = fileObj;
      
      if (callback) {
        var commitObj = null;
        if (res.commit && where.Commit) // for localhost res.commit should be undefined
          commitObj = new where.Commit(res.commit,ghUser,sRepo);
        callback(null,[fileObj2,commitObj]);
      }
    },
    error: function(xhr,statusText) {
      if (callback) callback(new Error(statusText),[null,null]);
    },
  };
  if (where.siteAuth) reqest.headers = {Authorization:where.siteAuth};
  
  utils.ajax(reqest);
}

function readFileContent_(self,callback) {
  if (typeof self.content != 'string') {
    self.fetchContent( function(err,data) {
      if (err)
        callback(err,data);
      else callback(null,self.content);
    });
  }
  else callback(null,self.content);
}

function readFileRaw_(self,callback) {
  if (typeof self.content != 'string') {
    self.fetchContent( function(err,data) {
      if (err)
        callback(err,data);
      else {
        self.rawContent = Base64.decode(self.content);
        callback(null,self.rawContent);
      }
    });
  }
  else {
    if (typeof self.rawContent != 'string')
      self.rawContent = Base64.decode(self.content);
    callback(null,self.rawContent);
  }
}

function fetchDirContents_(where,self,callback) {
  self.contents = [];
  
  var reqest = { type:'GET', dataType:'json',
    url: getServerUrl_(where,'/repos/' + self.user.login + '/' + self.repoName + '/contents/' + self.path), // self.path maybe ''
    data: {_:(new Date()).valueOf()+'', ref:self.branchName},
    success: function(res,statusText,xhr) {
      var b = self.contents;
      makeArray_(res).forEach( function(item) {
        if (item.type == "file") b.push(new where.File(item,self.user,self.repoName,self.branchName));
        if (item.type == "dir") b.push(new where.Dir(item,self.user,self.repoName,self.branchName));
      });
      if (callback) callback(null,self);
    },
    error: function(xhr,statusText) {
      if (callback) callback(new Error(statusText),self);
    },
  };
  if (where.siteAuth) reqest.headers = {Authorization:where.siteAuth};
  
  utils.ajax(reqest);
}

//------ Git --------
Git.siteProtocol = 'https';
Git.siteDomain = 'api.github.com';
Git.siteAuth = '';   // 'token <OAUTH-TOKEN>' or 'Basic <ACCESS-TOKEN>' // 'Basic '+Base64.encode('user:password')

Git.User = Kind.extend( {
  constructor: function(sName,infos) {
		if (infos) {
			for (var prop in infos) {
				this[prop] = infos[prop];
			}
		}
		if (sName)
			this.login = sName;
		else throw 'invalid name';
		this.isLocal = false;
  },
  
  fetch: function(callback) {
	  var self = this;
    var reqest = { type:'GET', dataType:'json',
      url: getServerUrl_(Git,'/users/' + this.login),
      data: {_:(new Date()).valueOf()+''},
      success: function(res,statusText,xhr) {
        for (var prop in res) {
          self[prop] = res[prop];
        }
        if (callback) callback(null,self);
      },
      error: function(xhr,statusText) {
        if (callback) callback(new Error(statusText),self);
      },
    };
    if (Git.siteAuth) reqest.headers = {Authorization:Git.siteAuth};
    
    utils.ajax(reqest);
  },
},{});

Git.Commit = Kind.extend({
  constructor: function(infos,ghUser,repoName) {
    for (var prop in infos) {
      this[prop] = infos[prop];
    }
    if (ghUser) this.user = ghUser;
    if (repoName) this.repoName = repoName;
  },  
},{});

function fetchCommits_(where,self,sPath,sSince,sUntil,callback) {  // only for Git, not for Local
  self.commits = [];
  
  var dData = {sha:self.branchName, _:(new Date()).valueOf()+''};
  if (sPath) dData.path = sPath;
  if (sSince) dData.since = sSince;
  if (sUntil) dData.until = sUntil;
  var reqest = { type:'GET', dataType:'json',
    url: getServerUrl_(where,'/repos/' + self.user.login + '/' + self.repoName + '/commits'),
    data: dData,
    success: function(res,statusText,xhr) {
      var b = self.commits;
      makeArray_(res).forEach( function(item) {
        if (item.commit) {
          var commitObj = new where.Commit(item.commit,self.user,self.repoName);
          if (item.sha) commitObj.sha = item.sha;
          if (item.url) commitObj.url = item.url;
          b.push(commitObj);
        }
      });
      if (callback) callback(null,self);
    },
    error: function(xhr,statusText) {
      if (callback) callback(new Error(statusText),self);
    },
  };
  if (where.siteAuth) reqest.headers = {Authorization:where.siteAuth};
  
  utils.ajax(reqest);
}

Git.File = ItemContent.extend( {
  constructor: function(contentItem,ghUser,repoName,branchName) {
    if (!repoName)
      throw 'invalid repository';
    if (!branchName)
      throw 'invalid branch';
    
    Git.File.__super__.constructor.call(this,contentItem,ghUser,repoName,branchName);
    if (typeof this.path != 'string')
      throw 'invalid path';
    if (!this.name) this.name = this.path.split('/').pop();
  },
  
  fetchContent: function(callback) {  // it will force re-fetch
    fetchFileContent_(Git,this,callback);
  },
  
  fetchCommits: function(callback,sSince,sUntil) {
    fetchCommits_(Git,this,this.path,sSince,sUntil,callback);
  },
  
  putContent: function(sRaw,callback,sCnt) {
    if (!this.sha) throw 'no sha';
    putFileContent_(Git,this.name,sRaw,this.sha,callback,this,null,sCnt);
  },
  
  remove: function(callback) {
    if (!this.sha) throw 'no sha';
    deleteFile_(this.name,this.sha,callback,this,null);
  },
  
  readContent: function(callback) {  // callback must be passed
    readFileContent_(this,callback);
  },
  
  readRaw: function(callback) {      // callback must be passed
    readFileRaw_(this,callback);
  },
},{});

Git.Dir = ItemContent.extend( {
  constructor : function(contentItem,ghUser,repoName,branchName) {
    if (!repoName)
      throw 'invalid repository';
    if (!branchName)
      throw 'invalid branch';
    
    this.contents = [];
    Git.Dir.__super__.constructor.call(this,contentItem,ghUser,repoName,branchName);
    if (typeof this.path != 'string')
      throw 'invalid path';
  },
  
  fetchContents: function(callback) {
    fetchDirContents_(Git,this,callback);
  },
  
  newFile: function(sFile,sRaw,callback,sCnt) {  // sFile should not include path segment
    putFileContent_(Git,sFile,sRaw,'',callback,null,this,sCnt);
  },
  
  putFile: function(sFile,sRaw,callback,oldSha,sCnt) {
    if (!oldSha) {
      var fileObj = this.getFile(sFile);
      if (fileObj) oldSha = file.sha;
    }
    if (!oldSha) throw 'invalid sha';
    putFileContent_(Git,sFile,sRaw,oldSha,callback,null,this,sCnt);
  },
  
  removeFile: function(sFile,callback,oldSha) {
    if (!oldSha) {
      var fileObj = this.getFile(sFile);
      if (fileObj)
        oldSha = fileObj.sha;
      else throw 'unknown file';
    }
    if (!oldSha) throw 'invalid sha';
    deleteFile_(sFile,oldSha,callback,null,this);
  },
  
  dirOf: function(sPath) {     // aDir.dirOf(sPath).fetchContents(...)
    var sFilePath = this.path; // this.path maybe ''
    sFilePath = sFilePath? sFilePath+'/'+sPath: sPath; // join current path
    return new Git.Dir({path:sFilePath},this.user,this.repoName,this.branchName);
  },
  
  fileOf: function(sPath) {    // aDir.fileOf(sPath).fetchContent(...)
    var sFilePath = this.path; // this.path maybe ''
    sFilePath = sFilePath? sFilePath+'/'+sPath: sPath; // join current path
    return new Git.File({path:sFilePath},this.user,this.repoName,this.branchName);
  },
  
  getFile: function(name) {
    return this.contents.find( function(item) {
      return item.name == name && item.type == 'file';
    });
  },
  
  getDir: function(name) {
    return this.contents.find( function(item) {
      return item.name == name && item.type == 'dir';
    });
  },
},{});

Git.Branch = Kind.extend( {
  constructor : function(ghUser,repoName,branchName) {
    if (!repoName)
      throw 'invalid repository';
    if (!branchName)
      throw 'invalid branch';
    
    if (ghUser) this.user = ghUser;
    this.isLocal = false;
    this.repoName = repoName;
    this.branchName = branchName;
    this.commits = [];
  },

  fetchCommits: function(callback,sSince,sUntil) {
    fetchCommits_(Git,this,'',sSince,sUntil,callback);
  },
  
  dirOf: function(sPath) {   // aBranch.dirOf(sPath).fetchContents(...)
    return new Git.Dir({path:sPath},this.user,this.repoName,this.branchName);
  },
  
  fileOf: function(sPath) {  // aBranch.fileOf(sPath).fetchContent(...)
    return new Git.File({path:sPath},this.user,this.repoName,this.branchName);
  },
  
  fetchIssues: function(callback,opt) {
    var option = Object.assign({_:(new Date()).valueOf()+''},opt);
    
    var self = this;
    var reqest = { type:'GET', dataType:'json',
      url: getServerUrl_(Git,'/repos/' + this.user.login + '/' + this.repoName + '/issues'),
      data: option,
      success: function(res,statusText,xhr) {
        self.issues = [];
        if (Array.isArray(res)) {
          res.forEach( function(issue) {
            self.issues.push(new Git.Issue(self.user,self.repoName,issue.number,issue));
          });
        }
        if (callback) callback(null,self);
      },
      error: function(xhr,statusText) {
        if (callback) callback(new Error(statusText),self);
      },
    };
    if (Git.siteAuth) reqest.headers = {Authorization:Git.siteAuth};
    
    utils.ajax(reqest);
  },
  
  createIssue: function(callback,opt) {
    var reqest = { type:'POST', dataType:'json',
      url: getServerUrl_(Git,'/repos/' + this.user.login + '/' + this.repoName + '/issues'),
      data:opt,  // {title,body,milestone,labels,assignees}
      success: function(res,statusText,xhr) {
        if (callback) callback(null,res);
      },
      error: function(xhr,statusText) {
        if (callback) callback(new Error(statusText),null);
      },
    };
    if (Git.siteAuth) reqest.headers = {Authorization:Git.siteAuth};
    
    utils.ajax(reqest);
  },
},{});

var issue_attrs_ = [ 'id','title','labels','state','locked','comments',
  'created_at','updated_at','closed_at','body','closed_by',
];

function assignIssue_(self,res,creator) {
  if (creator) self.create_by = creator;
  issue_attrs_.forEach( function(attr) {
    self[attr] = res[attr];
  });
}

Git.Issue = Kind.extend( {
  constructor : function(ghUser,repoName,number,infos) {
    if (!repoName)
      throw 'invalid repository';
    
    if (ghUser) this.user = ghUser;
    if (typeof number == 'number') this.number = number;
    
    this.repoName = repoName;
    this.comments = [];
    
    if (infos) assignIssue_(this,infos,infos.user);
  },
  
  fetchContents: function(callback) {
    var self = this;
    var reqest = { type:'GET', dataType:'json',
      url: getServerUrl_(Git,'/repos/' + this.user.login + '/' + this.repoName + '/issues/' + this.number),
      data: {_:(new Date()).valueOf()+''},
      success: function(res,statusText,xhr) {
        assignIssue_(self,res,res.user);
        if (callback) callback(null,self);
      },
      error: function(xhr,statusText) {
        if (callback) callback(new Error(statusText),self);
      },
    };
    if (Git.siteAuth) reqest.headers = {Authorization:Git.siteAuth};
    
    utils.ajax(reqest);
  },
  
  fetchComments: function(callback) {
    var self = this;
    var reqest = { type:'GET', dataType:'json',
      url: getServerUrl_(Git,'/repos/' + this.user.login + '/' + this.repoName + '/issues/' + this.number + '/comments'),
      data: {_:(new Date()).valueOf()+''},
      success: function(res,statusText,xhr) {
        if (callback) callback(null,res);
      },
      error: function(xhr,statusText) {
        if (callback) callback(new Error(statusText),self);
      },
    };
    if (Git.siteAuth) reqest.headers = {Authorization:Git.siteAuth};
    
    utils.ajax(reqest);
  },
  
  fetchEvents: function(callback) {
    var self = this;
    var reqest = { type:'GET', dataType:'json',
      url: getServerUrl_(Git,'/repos/' + this.user.login + '/' + this.repoName + '/issues/' + this.number + '/events'),
      data: {_:(new Date()).valueOf()+''},
      success: function(res,statusText,xhr) {
        if (callback) callback(null,res);
      },
      error: function(xhr,statusText) {
        if (callback) callback(new Error(statusText),self);
      },
    };
    if (Git.siteAuth) reqest.headers = {Authorization:Git.siteAuth};
    
    utils.ajax(reqest);
  },
},{});

//------ Local --------
Local.siteProtocol = 'http';
Local.siteDomain = 'localhost:3000';
Local.siteAuth = '';

Local.User = Kind.extend( {
  constructor: function(sName,infos) {
		if (infos) {
			for (var prop in infos) {
				this[prop] = infos[prop];
			}
		}
		if (sName)
			this.login = sName;
		else throw 'invalid name';
		this.isLocal = true;
  },
  
  fetch: function(callback) {
    if (callback) callback(null,self);  // nothing to fetch
  },
},{});

Local.Commit = null;  // not support

Local.File = ItemContent.extend( {
  constructor: function(contentItem,ghUser,repoName,branchName) {
    if (!repoName)
      throw 'invalid repository';
    if (!branchName)
      throw 'invalid branch';
    
    Local.File.__super__.constructor.call(this,contentItem,ghUser,repoName,branchName);
    if (typeof this.path != 'string')
      throw 'invalid path';
    if (!this.name) this.name = this.path.split('/').pop();
  },
  
  fetchContent: function(callback) {    // it will force re-fetch
    fetchFileContent_(Local,this,callback);
  },
  
  fetchCommits: function(callback,sSince,sUntil) {
    if (callback) callback(null,this);  // not support for localhost
  },
  
  putContent: function(sRaw,callback,sCnt) {
    putFileContent_(Local,this.name,sRaw,'',callback,this,null,sCnt); // ignore this.sha
  },
  
  remove: function(callback) {
    deleteFile_(Local,this.name,'',callback,this,null);  // ignore this.sha
  },
  
  readContent: function(callback) {  // callback must be passed
    readFileContent_(this,callback);
  },
  
  readRaw: function(callback) {      // callback must be passed
    readFileRaw_(this,callback);
  },
},{});

Local.Dir = ItemContent.extend( {
  constructor : function(contentItem,ghUser,repoName,branchName) {
    if (!repoName)
      throw 'invalid repository';
    if (!branchName)
      throw 'invalid branch';
    
    this.contents = [];
    Local.Dir.__super__.constructor.call(this,contentItem,ghUser,repoName,branchName);
    if (typeof this.path != 'string')
      throw 'invalid path';
  },
  
  fetchContents: function(callback) {
    fetchDirContents_(Local,this,callback);
  },
  
  newFile: function(sFile,sRaw,callback,sCnt) {  // sFile should not include path segment
    putFileContent_(Local,sFile,sRaw,'',callback,null,this,sCnt); // same to this.putFile()
  },
  
  putFile: function(sFile,sRaw,callback,sCnt) {
    putFileContent_(Local,sFile,sRaw,'',callback,null,this,sCnt); // ignore this.sha
  },
  
  removeFile: function(sFile,callback) {
    deleteFile_(Local,sFile,'',callback,null,this);  // ignore this.sha
  },
  
  dirOf: function(sPath) {     // aDir.dirOf(sPath).fetchContents(...)
    var sFilePath = this.path; // this.path maybe ''
    sFilePath = sFilePath? sFilePath+'/'+sPath: sPath; // join current path
    return new Local.Dir({path:sFilePath},this.user,this.repoName,this.branchName);
  },
  
  fileOf: function(sPath) {    // aDir.fileOf(sPath).fetchContent(...)
    var sFilePath = this.path; // this.path maybe ''
    sFilePath = sFilePath? sFilePath+'/'+sPath: sPath; // join current path
    return new Local.File({path:sFilePath},this.user,this.repoName,this.branchName);
  },
  
  getFile: function(name) {
    return this.contents.find( function(item) {
      return item.name == name && item.type == 'file';
    });
  },
  
  getDir: function(name) {
    return this.contents.find( function(item) {
      return item.name == name && item.type == 'dir';
    });
  },
},{});

Local.Branch = Kind.extend( {
  constructor : function(ghUser,repoName,branchName) {
    if (!repoName)
      throw 'invalid repository';
    if (!branchName)
      throw 'invalid branch';
    
    if (ghUser) this.user = ghUser;
    this.isLocal = true;
    this.repoName = repoName;
    this.branchName = branchName;
    this.commits = [];
  },
  
  fetchCommits: function(callback,sSince,sUntil) {
    if (callback) callback(null,this);  // not support
  },
  
  dirOf: function(sPath) {   // aBranch.dirOf(sPath).fetchContents(...)
    return new Local.Dir({path:sPath},this.user,this.repoName,this.branchName);
  },
  
  fileOf: function(sPath) {  // aBranch.fileOf(sPath).fetchContent(...)
    return new Local.File({path:sPath},this.user,this.repoName,this.branchName);
  },
},{});

});
