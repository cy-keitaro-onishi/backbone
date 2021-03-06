//     Backbone.js 1.2.3

//     (c) 2010-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org
//
//     ソースコードリーディングにおいての参考資料
//     - http://www.tejitak.com/blog/?p=1495
//     - https://github.com/enja-oss/Backbone/blob/master/backbone.js

(function(factory) {

  // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
  // We use `self` instead of `window` for `WebWorker` support.
  var root = (typeof self == 'object' && self.self == self && self) ||
            (typeof global == 'object' && global.global == global && global);
  //   |
  //    ---------- ブラウザ環境ではwindowオブジェクト
  //               Node環境ではglobalオブジェクト
  //               以後root.hogehogeと出てきたらwindow.hogehogeなどと読み替えれば問題無いです

  // スクリプトの実行方法をAMD/Commonjs/scriptタグ形式の3つのパターンに適用させている
  //
  // Set up Backbone appropriately for the environment. Start with AMD.
  //
  // ここはAMDの場合のパターンである
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  // ここはCommonjsのパターンである
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore'), $;
    try { $ = require('jquery'); } catch(e) {}
    factory(root, exports, _, $);

  // Finally, as a browser global.
  // ここはscriptタグのパターンである
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(function(root, Backbone, _, $) {

  // Initial Setup
  // -------------
  // ここの段階ではまだBackboneと名前のついた参照は空です。
  // 以下で続くコードによってBackboneと名前のついた参照に対してメンバを刺していきます

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  // Backbone.noConflictにおいてすでに存在していたBackboneのオブジェクトを参照することができるようになります
  // これはすでにglobalの領域にBackboneが存在した際に、今回生成したのBackboneはなく、今回生成するBackboneの1つ前に存在していたBackboneの参照を見ることができるようになります
  var previousBackbone = root.Backbone;

  // Create a local reference to a common array method we'll want to use later.
  // Arrayではないオブジェクトに対してArray.sliceと同様の振る舞いをさせているところがいくつかあるがそれのショートカットのためにメソッドをキャッシュしているだけ
  var slice = Array.prototype.slice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.2.3';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  // プロパティにしているだけ
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };


  /////////////////////////////////////////////////////////////////////////////////////////////////
  // この辺はレガシーなWEBサーバーに対して、Backbone.syncでHTTPリクエストする際にリクエストの内容を補足するための仕組みである
  // あまり使うことはなさそうな気がする
  /////////////////////////////////////////////////////////////////////////////////////////////////

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  // trueにすることでPATCH/PUT/DELETEのメソッドのリクエストをPOSTに変換することができる
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... this will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  // trueにすることでHTTPリクエストのcontentTypeを'application/x-www-form-urlencoded'に変換することができる
  Backbone.emulateJSON = false;

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // Backbone.XXXに対してunderscore.jsのメソッドを使えるようにするための拡張ができるようにするための
  // 仕組みを定義している
  // この仕組のおかげでModel.underscoreFunctionが使えるんですね。
  // 以下がそのサンプルであるがundersore.jsの機能の一部をmixinという形でBackbone.XXXオブジェクトに対して生やしている
  // var modelMethods = { keys: 1, values: 1, pairs: 1, invert: 1, pick: 0,
  //     omit: 0, chain: 1, isEmpty: 1 };
  // addUnderscoreMethods(Model, modelMethods, 'attributes');
  /////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Proxy Backbone class methods to Underscore functions, wrapping the model's
  // `attributes` object or collection's `models` array behind the scenes.
  //
  // collection.filter(function(model) { return model.get('age') > 10 });
  // collection.each(this.addView);
  //
  // `Function#apply` can be slow so we use the method's arg count, if we know it.
  var addMethod = function(length, method, attribute) {

    // undersocreのメソッド名とそのメソッドの引数の数から、引数の役割まで決定してしまっているので
    // ちょっと危険だけど、underscore側がそのへんが統一された設計になっているので何とか動いているんですね
    // ないとは思うけど、underscore以外の何かしらのライブラリのやくわりをもたせるようなことがある場合にこの考え方は破錠するんでしょうね
    switch (length) {
      case 1: return function() {
        return _[method](this[attribute]);
      };
      case 2: return function(value) {
        return _[method](this[attribute], value);
      };
      case 3: return function(iteratee, context) {
        return _[method](this[attribute], cb(iteratee, this), context);
      };
      case 4: return function(iteratee, defaultVal, context) {
        return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
      };
      default: return function() {
        var args = slice.call(arguments);
        args.unshift(this[attribute]);
        return _[method].apply(_, args);
      };
    }
  };
  var addUnderscoreMethods = function(Class, methods, attribute) {
    _.each(methods, function(length, method) {
      if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
    });
  };

  // Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
  var cb = function(iteratee, instance) {
    if (_.isFunction(iteratee)) return iteratee;
    if (_.isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
    if (_.isString(iteratee)) return function(model) { return model.get(iteratee); };
    return iteratee;
  };
  var modelMatcher = function(attrs) {
    var matcher = _.matches(attrs);
    return function(model) {
      return matcher(model.attributes);
    };
  };

  // ここまでが全部↑のそれ
  /////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // Events.
  // 色々なBackboneが用意するオブジェクトがObserverパターンを利用することができるようにするための
  // 根幹の処理を提供するためのクラス
  // Model, CollectionなどはすべてEventsを継承している
  //
  // A = {};
  // _.extend(A, Backbone.Events);
  // A.on('foo', function(){
  //     console.log('A::foo');
  // });
  // A.on('bar', function(){
  //     console.log('A::bar');
  // });
  //
  // A.trigger('foo');
  // A.trigger('bar');
  /////////////////////////////////////////////////////////////////////////////////////////////////
  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // a custom event channel. You may bind a callback to an event with `on` or
  // remove with `off`; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {};

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Iterates over the standard `event, callback` (as well as the fancy multiple
  // space-separated events `"change blur", callback` and jQuery-style event
  // maps `{event: callback}`).
  // iterateeにはイベント登録・削除・購読・発行などの処理を行うための関数オブジェクトが入ってくる
  // イベントの登録・削除・購読・発行などはすべてこの関数を実行することになっている
  var eventsApi = function(iteratee, events, name, callback, opts) {
    var i = 0, names;
    if (name && typeof name === 'object') {
      // Handle event maps.
      if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
      for (names = _.keys(name); i < names.length ; i++) {
        events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
      }
    } else if (name && eventSplitter.test(name)) {
      // Handle space separated event names by delegating them individually.
      // イベント名をスペースで区切った文字列にしている場合はスペースで区切って複数の名前でイベントを登録することができる
      //
      // ```
      // AAA.on('hoge fuga piyo', function(){
      //     console.log('hello');
      // });
      //
      // AAA.trigger('hoge');
      // AAA.trigger('fuga');
      // AAA.trigger('piyo');
      // AAA.trigger('hoge fuga');
      // AAA.trigger('hoge fuga piyo');
      // ```
      // さて、helloは何回実行されるでしょうか。この辺がかなりとっつきづらいのスペースを用いたイベント名は使わないのが良いかもしれない
      //
      for (names = name.split(eventSplitter); i < names.length; i++) {
        events = iteratee(events, names[i], callback, opts);
      }
    } else {
      // Finally, standard events.
      events = iteratee(events, name, callback, opts);
    }
    return events;
  };

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  // イベント登録に必要なのは、イベント名、イベント発火時の処理となるcallback、callback実行時のcontext
  Events.on = function(name, callback, context) {
    return internalOn(this, name, callback, context);
  };

  // Guard the `listening` argument from the public API.
  // 渡されたオブジェクトに対して渡されたイベントを登録する
  // 具体的にはオブジェクトのイベント情報を_eventsに格納している
  // listeningに関しては購読者も登録するべき時は購読者のオブジェクトが入ってくる
  var internalOn = function(obj, name, callback, context, listening) {

    // onApiとやらは下の方にいる
    // イベント周りの処理(登録・削除)とかは全部eventsApiに対して、何らかの処理用の関数を渡すことで提供されている。
    obj._events = eventsApi(onApi, obj._events || {}, name, callback, {

        // context   : イベント発行者のcontext
        // ctx       : イベントのcallbackで利用されるcontext
        // listening : イベント購読者のcontext
        context: context,
        ctx: obj,
        listening: listening
    });

    if (listening) {
      var listeners = obj._listeners || (obj._listeners = {});
      listeners[listening.id] = listening;
    }

    return obj;
  };

  // Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  // オブジェクトに対するイベントを他のオブジェクトに購読させることができる
  // 例えば、ModelのイベントをViewに購読させ、Viewが破棄されるタイミングでModelのイベントを破棄することができる
  // listenToではなく、onを使ってModelのイベントにてViewの参照を渡してしまうとViewを削除してもModel側でViewの参照を持ってしまう(イベントが破棄されない)
  //
  // //////////////////////////////////////////
  // // .listenToを利用した例
  // // Observerパターン
  // //////////////////////////////////////////
  // AAは発行者
  // BBは購読者
  // AA = new Backbone.Model();
  // BB = new Backbone.View();
  // BB.name = 'bb';
  // 
  // BB.listenTo(AA, 'foo', function(){
  //   console.log(this.name);
  // });
  // AA.trigger('foo');
  // 
  // // BB.removeのタイミングでAAに貼られたイベントも開放する
  // BB.remove();
  // AA.trigger('foo');
  // 
  // delete AA;
  // delete BB;
  // console.log('---------------------');
  // 
  // //////////////////////////////////////////
  // // .listenToを使用せず.onで↑と同じことをするとどうなるか
  // //////////////////////////////////////////
  // AA = new Backbone.Model();
  // BB = new Backbone.View();
  // BB.name = 'bb';
  // 
  // AA.on('foo', function(){
  //   console.log(this.name);
  // }, BB);
  // AA.trigger('foo');
  // 
  // BB.remove();
  // AA.trigger('foo');
  // 
  // // 見ての通り、AAのfooイベントにはBBのcontextがまだ存在していることになる
  // // これをZombieViewという。メモリ管理上、非効率である
  // console.log(AA._events.foo[0]);
  Events.listenTo =  function(obj, name, callback) {
    if (!obj) return this;
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    // 監視オブジェクトが監視対象オブジェクトを初めて監視する際に
    // 監視オブジェクトのid, 監視対象オブジェクトのidを発行し、監視用のkey/valueを生成する
    if (!listening) {
      var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
      listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
    }

    // Bind callbacks on obj, and keep track of them on listening.
    internalOn(obj, name, callback, this, listening);
    return this;
  };

  // The reducing API that adds a callback to the `events` object.
  // オブジェクトに登録するイベントのオブジェクトを生成して返す
  // {
  //   callback  : Function : イベント発火時の処理
  //   context   : Object   : イベント登録されるオブジェクトのcontext
  //   ctx       : Object   : イベント発火時のcontext
  //   listening : Object   : 監視者が存在する場合は監視者の登録も行う
  // }
  var onApi = function(events, name, callback, options) {
    if (callback) {
      var handlers = events[name] || (events[name] = []);
      var context = options.context, ctx = options.ctx, listening = options.listening;
      if (listening) listening.count++;

      handlers.push({ callback: callback, context: context, ctx: context || ctx, listening: listening });
    }
    return events;
  };

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  // 登録したイベントを削除する
  Events.off =  function(name, callback, context) {
    if (!this._events) return this;
    this._events = eventsApi(offApi, this._events, name, callback, {
        context: context,
        listeners: this._listeners
    });
    return this;
  };

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  // listenToで登録したイベントを外す
  Events.stopListening =  function(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;

    var ids = obj ? [obj._listenId] : _.keys(listeningTo);

    for (var i = 0; i < ids.length; i++) {
      var listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
    }
    // void 0はundefinedを返す
    // undefinedが万が一定義済みの場合であってもundefinedを保証することができる
    if (_.isEmpty(listeningTo)) this._listeningTo = void 0;

    return this;
  };

  // The reducing API that removes a callback from the `events` object.
  var offApi = function(events, name, callback, options) {
    if (!events) return;

    var i = 0, listening;
    var context = options.context, listeners = options.listeners;

    // Delete all events listeners and "drop" events.
    if (!name && !callback && !context) {
      var ids = _.keys(listeners);
      for (; i < ids.length; i++) {
        listening = listeners[ids[i]];
        delete listeners[listening.id];
        delete listening.listeningTo[listening.objId];
      }
      return;
    }

    var names = name ? [name] : _.keys(events);
    for (; i < names.length; i++) {
      name = names[i];
      var handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) break;

      // Replace events if there are any remaining.  Otherwise, clean up.
      var remaining = [];
      for (var j = 0; j < handlers.length; j++) {
        var handler = handlers[j];
        if (
          callback && callback !== handler.callback &&
            callback !== handler.callback._callback ||
              context && context !== handler.context
        ) {
          remaining.push(handler);
        } else {
          listening = handler.listening;
          if (listening && --listening.count === 0) {
            delete listeners[listening.id];
            delete listening.listeningTo[listening.objId];
          }
        }
      }

      // Update tail event if the list has any events.  Otherwise, clean up.
      if (remaining.length) {
        events[name] = remaining;
      } else {
        delete events[name];
      }
    }
    if (_.size(events)) return events;
  };

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  // 1回ポッキリのイベント登録
  Events.once =  function(name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
    return this.on(events, void 0, context);
  };

  // Inversion-of-control versions of `once`.
  // 1回ポッキリのイベント購読
  Events.listenToOnce =  function(obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
    return this.listenTo(obj, events);
  };

  // Reduces the event callbacks into a map of `{event: onceWrapper}`.
  // `offer` unbinds the `onceWrapper` after it has been called.
  var onceMap = function(map, name, callback, offer) {
    if (callback) {
      var once = map[name] = _.once(function() {
        offer(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
    }
    return map;
  };

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  //
  // 登録したイベントを発火させるためのメソッド
  // 可変長引数を受けて実行することができる
  Events.trigger =  function(name) {
    if (!this._events) return this;

    var length = Math.max(0, arguments.length - 1);
    var args = Array(length);
    for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

    eventsApi(triggerApi, this._events, name, void 0, args);
    return this;
  };

  // Handles triggering the appropriate event callbacks.
  //
  // イベントを発火させるためのAPI
  // オブジェクトに登録されていたイベントをガバッと持ってきてnameと呼ばれているイベント名から
  // 発火対象のイベント選定して登録されていたcallbackを実行するだけだが、少し注意が必要
  //
  //////////////////////////////////////////
  // イベント名『all』は特別な動きをする
  //////////////////////////////////////////
  // 
  // AAAA = {};
  // _.extend(AAAA, Backbone.Events);
  // 
  // AAAA.on('hoge', function(){
  //     console.log('hey');
  // });
  // AAAA.on('all', function(){
  //     console.log('hey');
  // });
  // 
  // // さて、heyは何回実行されるでしょうか
  // AAAA.trigger('hoge');
  // AAAA.trigger('all');
  // AAAA.trigger('hey');
  var triggerApi = function(objEvents, name, cb, args) {
    if (objEvents) {
      var events = objEvents[name];
      var allEvents = objEvents.all;
      if (events && allEvents) allEvents = allEvents.slice();

      // まずマッチしたイベントを実行し
      // その後にallで登録されていたイベントを実行する
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, [name].concat(args));
    }
    return objEvents;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  //
  // Function.callの方がFunction.applyより早いから変数の数が3までの間はcallを使うようにして静的な最適化を行なっている
  // それ以上の場合はcase分を書ききれないため、applyに頼っている
  // ちなみにBackbone純正のイベントは3までで収まっているようだ
  // addMethod()と同じような感じですかね。
  //
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  // Aliases for backwards compatibility.
  // ただのalias
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  //
  // Backbone.直下にもEventsで定義されている機能を生やしている
  // Backbone.Events.on === Backbone.on -> true
  // が成り立つ
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  // こっからModelの処理
  // Modelの今コンストラクタでは初期のattributesとoptionsを渡すことができる
  // options.collection: .collectionメンバを持つかどうか、.collectionの仕組みはまだ不明
  // options.parse: attributesの内容を加工するための処理を挟ませるかどうか。
  //                具体的には.parse()をOverrideさせてユーザーが定義する必要がある
  // ちなみにoptionsはそのまま.setのoptionsとして引き渡すことができることも覚えておいたほうが良いです。
  //
  //
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});

    // new される度にユニークなIDをインスタンスに割り振る
    // 参照の関係を解決するために利用すると思うが具体的には未だ不明
    this.cid = _.uniqueId(this.cidPrefix);
    this.attributes = {};
    if (options.collection) this.collection = options.collection;

    // parseオプションが有効な場合はparseを1回挟んでattributesを均す
    if (options.parse) attrs = this.parse(attrs, options) || {};

    // .defaults()に定義しているデフォルトで利用するattributesを持ってきて引数で与えられたattrsとマージしている
    // 引数のattributesの方が優先されます。
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));

    // ここでthis.setを使ってattributesをメンバに反映している
    // .setを実行しているため、changeイベントがここでも実行されることを覚えておこう
    // しかし普通、newしている段階ではまだ、イベントの購読が行われていないはずなので体外空振りになるだろう
    this.set(attrs, options);

    // .set内で.changedが汚染されるので浄化している
    this.changed = {};

    // initialize()を実行することでユーザーが定義できるコンストラクタ関数を実行する
    // initialize()はnew XXX();の一番最後に評価されることを覚えておこう。
    // 要はnewでも.set();をすでに実行しているため、initializeでは.set()が発生しないほうがイベントの発行回数を減らすことができます。
    // あと、initializeの戻り値に対しては何も期待していないので、Overrideして何か使っても良いかもしれない。もったいないよね
    // Applicationの試用によってはこの辺重宝すると思うんだけどな
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    // .setした際のdiffを管理するための領域
    // こいつを元に最終的にどのattributeのchangeトリガーを実行するかを決定している
    changed: null,

    // The value returned during the last failed validation.
    // 最後にvalidationを実行した際の結果を保持するための領域
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    // モデルを一意に識別するための識別子
    // よくあるのがサーバー側の実装に依存してidなどになる
    idAttribute: 'id',

    // The prefix is used to create the client id which is used to identify models locally.
    // You may want to override this if you're experiencing name clashes with model ids.
    // Backbone側がModelのインスタンス1つづに一意なIDを付与する際にプレフィックスとして扱う文字列
    //
    cidPrefix: 'c',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // 実はinitializeは標準では何もしていない
    // ユーザーが任意にOverrideする必要がある
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    // attributesをcloneしているだけなのでtoJSONした結果を書き換えてもModelのattributesには影響が出ない
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    // Backbone.syncをModelのコンテキストで実行するためのショートカット
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    // 単純にkey:valueを取得するだけなのでlodashの.getみたいな強烈なことはできない。
    // Lodash .get: https://lodash.com/docs#get
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    // escapeは.getした内容をエスケープさせる
    // Backbone.jsのソースコード上ではModel.escapeを呼んでいるところは存在しない
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    // これもgetと同じくlodashみたいなことはできない
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Special-cased proxy to underscore's `_.matches` method.
    // _.iterateeに関してはaddMethodsの仕組みを使えないようだ
    matches: function(attrs) {
      return !!_.iteratee(attrs, this)(this.attributes);
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    // optionsの引数には、unset, silent, validateの3つのパラメタが有る
    // unset -> 指定したkeyを削除したい場合に利用する
    // silent -> attributes変更時のchangeイベントを発行しないようにする
    // validate -> validationを実行させるかどうか。setのときはデフォルトではvalidationは実行されない
    // 引数のパターンは(key, val, options), (key-value-Object, options)の2つのパターンをサポートしている
    set: function(key, val, options) {
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      // key, value. {key: value}の両方のパラメータの受け方をサポートしている
      // 要は引数の順番をずらしているだけである
      var attrs;
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        // var a;
        // (a = {})['hoge'] = 'fuga';
        // a -> { hoge: 'fuga' }となる
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      // validationによってコケた場合はthisではなく、falseがかえるので注意, 他ではすべてthisが帰ってくるのにね・・・・
      // しかし、ここで疑問なのが、validationでコケた場合はinvalidイベントが発行されるのでわざわざfalseを返す意味はあるのか
      // Validationの仕組みを利用したい場合は.validate()をOverrideすること
      // 間違っても._validate()をOverrideしてはいけない。やってしまうと、validイベントが飛ばなくなる
      // optionsをvalidate:trueにして引数を渡さないとvalidateは実行されない
      // ちなみにコンストラクタでも.setは呼ばれるがoptionsは入っていないのでvalidateは呼ばれない
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      // unset -> 指定したkeyを削除したい場合に利用する
      // silent -> attributes変更時のchangeイベントを発行しないようにする
      var unset      = options.unset;
      var silent     = options.silent;

      // 変更したattributeのkeyを記録させていき
      // 最終的にchange::イベントを発火させる際の名前に利用するためのもの
      var changes    = [];

      // 一旦_changingをtrueにしてModelを更新中のステータスに切り替える
      // 切り替える手前のステータスを知っておき、これを利用する
      var changing   = this._changing;
      this._changing = true;

      // 更新中から更新中に変わった際は、attributesを書き換える前に変更前の状態を覚えておく
      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }

      // 変更中のModelのattributesの状態
      var current = this.attributes;
      // .set実行時に更新したkey/valueの情報
      var changed = this.changed;
      // .setする前のModelのattributesの状態
      var prev    = this._previousAttributes;

      // For each `set` attribute, update or delete the current value.
      for (var attr in attrs) {
        val = attrs[attr];

        // 現在のvalueと書き換えるvalueが同じ場合はchangesに記録されないのでchange::keyイベントは発行されなくなる
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          changed[attr] = val;
        } else {
          delete changed[attr];
        }

        // 実際のattributesの書き換えを行っているのはここ
        // currentはthis.attributesの参照
        unset ? delete current[attr] : current[attr] = val;
      }

      // Update the `id`.
      if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

      // Trigger all relevant attribute changes.
      // 更新したすべてのkeyにて、change::key名のイベントを発行している
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0; i < changes.length; i++) {
          // current[changes[i]]は変更後のvalueが入ってくる
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;

      // silent: trueをしていない場合はchangeイベントは発火させない
      // また、pending状態でない場合もchangeイベントは発火しない
      // changesが[]のまま場合、(setした内容がかすりもしなかった場合もここはおそらく評価されない)
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;

      // thisを返すのでメソッドチェーンできます
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    // unsetは特定のメンバを削除する
    unset: function(attr, options) {
      // keyさえ指定してしまえばよく、valueの値はどうでもいいのでundefinedを送るようにしている
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    // clearはすべてのメンバを削除する
    // .cidは使いまわされる
    clear: function(options) {
      var attrs = {};
      // すべてのattributesのkeyを事前にひっぱてきておいて、1回の.setで済むようにしている
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    // attrを指定しない場合はModelすべてのattrを対象に変更履歴が有るかを評価する
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    // 渡されたattributeと自身のメンバのattributeの差分を返す
    // 差分がない場合はfalseが帰ってくるので注意
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      var changed = {};
      for (var attr in diff) {
        var val = diff[attr];
        if (_.isEqual(old[attr], val)) continue;
        changed[attr] = val;
      }
      return _.size(changed) ? changed : false;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    // .setする1つまえのattributesの状態を取得することができる
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server, merging the response with the model's
    // local attributes. Any changed attributes will trigger a "change" event.
    // fetch/save/destroyに関してはRestなAPIの実行するためのヘルパーである
    // Backbone.syncをreadメソッドで実行する(Model.urlにたいするGETリクエスト)
    // 引数のoptionsはそのままBackbone.syncのoptionsとしても使われます。
    // Backbone.jsのここの仕組みを考慮したRestなAPIでは効果を発揮するがAPIの仕様がそれに合わない場合は何の役にも立たない
    // ここの仕組みをあえて、ユーザーのWebStorage領域に対するfetch/save/destroyなどに振る舞いを変えることをすれば別のいい使い方が有るかもしれない
    // 実際にそれをやっているっぽいライブラリも有る
    // https://github.com/jeromegn/Backbone.localStorage
    fetch: function(options) {
      options = _.extend({parse: true}, options);
      var model = this;
      
      // ajaxのsuccessのcallbackを上書きする
      // 基本的にはレスポンスの内容(key/value)をmodelのattributesとして.setで登録することが役割である。
      // また、successが評価された場合に『sync』イベントを発行する
      var success = options.success;      
      options.success = function(resp) {
        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
        if (!model.set(serverAttrs, options)) return false;
        
        // 元々定義していたsuccessを評価する
        if (success) success.call(options.context, model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      
      // wrapErrorは『error』イベントを発行するためのユーティリティ
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    // Backbone.syncを使って更新・登録処理をおこなう
    // options.validate: validationを実行するかどうか
    // options.parse: Model.parseにてattributesを加工するかどうか
    // options.wait: HTTPリクエストをする前にModelのattributesを書き換えるか
    save: function(key, val, options) {
      
      // Handle both `"key", value` and `{key: value}` -style arguments.
      // 引数を→のように変換する{key, value}, options
      var attrs;
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // saveの際もModel.setを利用するが、デフォルトではvaludate, parseを有効にする
      options = _.extend({validate: true, parse: true}, options);
      var wait = options.wait;

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      // waitオプションが付いていない場合は先にthis.setを実行してModelのattributesを加工する
      // waitオプションが付いている場合はajaxのsuccessのコールバックの後にModelのattributesを加工する
      if (attrs && !wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      var attributes = this.attributes;
      
      // ajaxのsuccessのコールバックを定義しなおしている
      // Model.setの実行や、syncイベントの発行をするため
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        // HTTPリクエストの結果をparseしたものとModelのattributesの内容をマージさせてModelの状態を更新します
        model.attributes = attributes;
        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
        if (wait) serverAttrs = _.extend({}, attrs, serverAttrs);
        if (serverAttrs && !model.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, model, resp, options);
        
        // model.setが完了してからsyncイベントを発行する
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      // Set temporary attributes if `{wait: true}` to properly find new ids.
      if (attrs && wait) this.attributes = _.extend({}, attributes, attrs);

      // isNewでmodelにidが振られているかを確認する
      // idが存在する場合はupdateとみなします
      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch' && !options.attrs) options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // Restore attributes.
      this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    // Backbone.syncを使ってModelの削除を行います。
    // Modelが購読しているイベントも削除します
    // options.waitがある場合はHTTPリクエストの完了前にModelの削除を行います
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      var wait = options.wait;

      var destroy = function() {
        model.stopListening();
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (wait) destroy();
        if (success) success.call(options.context, model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      var xhr = false;
      if (this.isNew()) {
        _.defer(options.success);
      } else {
        wrapError(this, options);
        xhr = this.sync('delete', this, options);
      }
      if (!wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      var id = this.get(this.idAttribute);
      return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    // parseはModelがnewされるとき渡されるatttibutesを加工する仕組みをユーザー自身が都合のいい形に変換するものであり
    // ユーザーによってOverrideされることを期待している
    // sync関係のAPIを利用してModelの生成を行う場合に重宝される
    // .setの際はparseは評価されない。
    // コンストラクタの際は明示的にoptionsでparse:trueを指定すれば評価してくれる
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    // Model.cloneを行うことによってコンストラクタを呼ぶことができるので
    // idの採番が行いクローンを作成するので
    // 違うObjectとなる
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    // サーバーで保存されたものかどうかを評価する
    // サーバー側から取得したModelにはidがくっついている、という前提で評価する
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    // 今のModelの状態をvalidateするとどうなるかを試すことができる。
    // validイベントも発火する
    isValid: function(options) {
      return this._validate({}, _.defaults({validate: true}, options));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    // ルールに反した場合はinvalidイベントが発火する
    // _validate自体は.setのときに呼ばれている
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model, mapped to the
  // number of arguments they take.
  // 以下のunderscore.jsで提供されているメソッドをModel.で使えるようにしている
  // _(args)として与えられる変数はModel.attributesになるのでAPIを実行しやすい
  var modelMethods = { keys: 1, values: 1, pairs: 1, invert: 1, pick: 0,
      omit: 0, chain: 1, isEmpty: 1 };

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  addUnderscoreMethods(Model, modelMethods, 'attributes');

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analogous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Splices `insert` into `array` at index `at`.
  var splice = function(array, insert, at) {
    at = Math.min(Math.max(at, 0), array.length);
    var tail = Array(array.length - at);
    var length = insert.length;
    for (var i = 0; i < tail.length; i++) tail[i] = array[i + at];
    for (i = 0; i < length; i++) array[i + at] = insert[i];
    for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model) { return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set. `models` may be Backbone
    // Models or raw JavaScript objects to be converted to Models, or any
    // combination of the two.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      options = _.extend({}, options);
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      var removed = this._removeModels(models, options);
      if (!options.silent && removed.length) this.trigger('update', this, options);
      return singular ? removed[0] : removed;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      if (models == null) return;

      options = _.defaults({}, options, setOptions);
      if (options.parse && !this._isModel(models)) models = this.parse(models, options);

      var singular = !_.isArray(models);
      models = singular ? [models] : models.slice();

      var at = options.at;
      if (at != null) at = +at;
      if (at < 0) at += this.length + 1;

      var set = [];
      var toAdd = [];
      var toRemove = [];
      var modelMap = {};

      var add = options.add;
      var merge = options.merge;
      var remove = options.remove;

      var sort = false;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      var model;
      for (var i = 0; i < models.length; i++) {
        model = models[i];

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        var existing = this.get(model);
        if (existing) {
          if (merge && model !== existing) {
            var attrs = this._isModel(model) ? model.attributes : model;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort) sort = existing.hasChanged(sortAttr);
          }
          if (!modelMap[existing.cid]) {
            modelMap[existing.cid] = true;
            set.push(existing);
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(model, options);
          if (model) {
            toAdd.push(model);
            this._addReference(model, options);
            modelMap[model.cid] = true;
            set.push(model);
          }
        }
      }

      // Remove stale models.
      if (remove) {
        for (i = 0; i < this.length; i++) {
          model = this.models[i];
          if (!modelMap[model.cid]) toRemove.push(model);
        }
        if (toRemove.length) this._removeModels(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      var orderChanged = false;
      var replace = !sortable && add && remove;
      if (set.length && replace) {
        orderChanged = this.length != set.length || _.some(this.models, function(model, index) {
          return model !== set[index];
        });
        this.models.length = 0;
        splice(this.models, set, 0);
        this.length = this.models.length;
      } else if (toAdd.length) {
        if (sortable) sort = true;
        splice(this.models, toAdd, at == null ? this.length : at);
        this.length = this.models.length;
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0; i < toAdd.length; i++) {
          if (at != null) options.index = at + i;
          model = toAdd[i];
          model.trigger('add', model, this, options);
        }
        if (sort || orderChanged) this.trigger('sort', this, options);
        if (toAdd.length || toRemove.length) this.trigger('update', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options = options ? _.clone(options) : {};
      for (var i = 0; i < this.models.length; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      return this.remove(model, options);
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      return this.remove(model, options);
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      var id = this.modelId(this._isModel(obj) ? obj.attributes : obj);
      return this._byId[obj] || this._byId[id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      if (index < 0) index += this.length;
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      return this[first ? 'find' : 'filter'](attrs);
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      var comparator = this.comparator;
      if (!comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      var length = comparator.length;
      if (_.isFunction(comparator)) comparator = _.bind(comparator, this);

      // Run sort based on type of `comparator`.
      if (length === 1 || _.isString(comparator)) {
        this.models = this.sortBy(comparator);
      } else {
        this.models.sort(comparator);
      }
      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = _.extend({parse: true}, options);
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success.call(options.context, collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      var wait = options.wait;
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp, callbackOpts) {
        if (wait) collection.add(model, callbackOpts);
        if (success) success.call(callbackOpts.context, model, resp, callbackOpts);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models, {
        model: this.model,
        comparator: this.comparator
      });
    },

    // Define how to uniquely identify models in the collection.
    modelId: function (attrs) {
      return attrs[this.model.prototype.idAttribute || 'id'];
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (this._isModel(attrs)) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method called by both remove and set.
    _removeModels: function(models, options) {
      var removed = [];
      for (var i = 0; i < models.length; i++) {
        var model = this.get(models[i]);
        if (!model) continue;

        var index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;

        // Remove references before triggering 'remove' event to prevent an
        // infinite loop. #3693
        delete this._byId[model.cid];
        var id = this.modelId(model.attributes);
        if (id != null) delete this._byId[id];

        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }

        removed.push(model);
        this._removeReference(model, options);
      }
      return removed;
    },

    // Method for checking whether an object should be considered a model for
    // the purposes of adding to the collection.
    _isModel: function (model) {
      return model instanceof Model;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      var id = this.modelId(model.attributes);
      if (id != null) this._byId[id] = model;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      delete this._byId[model.cid];
      var id = this.modelId(model.attributes);
      if (id != null) delete this._byId[id];
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if (model) {
        if ((event === 'add' || event === 'remove') && collection !== this) return;
        if (event === 'destroy') this.remove(model, options);
        if (event === 'change') {
          var prevId = this.modelId(model.previousAttributes());
          var id = this.modelId(model.attributes);
          if (prevId !== id) {
            if (prevId != null) delete this._byId[prevId];
            if (id != null) this._byId[id] = model;
          }
        }
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var collectionMethods = { forEach: 3, each: 3, map: 3, collect: 3, reduce: 0,
      foldl: 0, inject: 0, reduceRight: 0, foldr: 0, find: 3, detect: 3, filter: 3,
      select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
      contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
      head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
      without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
      isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
      sortBy: 3, indexBy: 3, findIndex: 3, findLastIndex: 3};

  // Mix in each Underscore method as a proxy to `Collection#models`.
  addUnderscoreMethods(Collection, collectionMethods, 'models');

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  // Viewのコンストラクタ
  // 引数にoptionsを渡すことでクラス側で定義しているメソッドやプロパティをOverrideすることができる
  // ただし、OverrideできるものはviewOptionsに定義されているkey名のものに限っている
  // コンストラクタは関数は触らないで、newの振る舞いを変えるにはModelと同じく、initializeをオーバーライドさせる
  var View = Backbone.View = function(options) {
    
    // view1, view2みたいな感じになるようにインスタンスに対して一意なコードを割り振っている
    this.cid = _.uniqueId('view');
    
    // 特定のkeyのもののみ、オーバーライドされることを許可している
    _.extend(this, _.pick(options, viewOptions));

    // DOM周りのセットアップやイベントの登録などを行う    
    this._ensureElement();
    
    // Modelと同じくinitializeを最後に実行している
    // Modelと同じくプレーンな状態ではinitializeは何も評価しないし、何も返さないのでユーザーが定義する
    this.initialize.apply(this, arguments);
  };

  // Cached regex to split keys for `delegate`.
  // イベントのkeyをイベント名とセレクタ名で分割するための正規表現オブジェクト
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // コンストラクタの引数でOverrideが可能なオブジェクトのkey名
  var viewOptions = [
    // Viewで利用するModel
    'model',
    // Viewで利用するCollection
    'collection',
    // View自身のDOM要素のセレクタを定義する
    // コンストラクタ内でDOMのオブジェクトに変換される
    // DOMをセレクタを用いて取得しなくてもよく、id, classNameなどを利用して動的にDOMを構築することもできる
    'el',
    // View自身のDOM要素のrootのDOMに付与するID
    // ※ elの方が優先して使われる
    'id',
    // View自身のDOM要素のrootのDOMに付与するプロパティ
    // ※ elの方が優先して使われる
    'attributes',
    // View自身のDOM要素のrootのDOMに付与するクラス名
    // ※ elの方が優先して使われる
    'className',
    // View自身のDOM要素のrootのDOMに付与するタグ名
    // ※ elの方が優先して使われる
    'tagName',
    // Viewのイベントのkey/value
    'events'
  ];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    // デフォルトでは『<div>』をViewのDOM要素して扱うことになる。
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    // View自身がもつDOM要素に対してのjQuery.fn.findのショートカット
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // ユーザーが定義する初期化処理を実装するところ
    // Modelの時と同じようなのり
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    // DOMの要素を画面に出力するための実装を行うところ
    // 生のBackboneだとrenderの内容を常にユーザーが定義する必要がある
    // return this;をすることが一般的なようだ
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    // DOMからViewを削除するための処理
    remove: function() {
      
      // DOMからViewのHTML要素を削除する
      // 具体的にはjQueryのAPIが実行されるだけである 
      this._removeElement();
      
      // Viewが購読しているイベントを全て破棄する。
      // stopListeningをせずに、view = null;などをしてViewのクラスを消してしまうと、イベント発行元に購読者としてのViewのインスタンスが残ってしまうので注意すること。ようはイベントをその後も拾い続けてしまう。
      // .stopListeningはBackbone.Eventsで実装されているものであり、Backbone.ViewはBackbone.Eventsを継承している
      this.stopListening();
      return this;
    },

    // Remove this view's element from the document and all event listeners
    // attached to it. Exposed for subclasses using an alternative DOM
    // manipulation API.
    // DOMからViewのHTML要素を削除する
    _removeElement: function() {
      this.$el.remove();
    },

    // Change the view's element (`this.el` property) and re-delegate the
    // view's events on the new element.
    // Viewの要素を変更し、イベント周りを均す
    setElement: function(element) {
      // Viewのイベントを一旦剥がす
      this.undelegateEvents();
      
      // this.elの書き換えを行う
      this._setElement(element);
      
      // Viewのイベントを付け直す
      this.delegateEvents();
      return this;
    },

    // Creates the `this.el` and `this.$el` references for this view using the
    // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
    // context or an element. Subclasses can override this to utilize an
    // alternative DOM manipulation API and are only required to set the
    // `this.el` property.
    // this.elの要素の書き換えを行う
    // this.el: Viewの要素のテキストデータ
    // this.$el: Viewの要素のjQueryオブジェクト
    // 単純に$elは$(el)のショートカットみたいな扱いになります。
    _setElement: function(el) {
      this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
      this.el = this.$el[0];
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // this.eventsに記載されているイベントの内容をViewに登録させるための処理
    // this.eventsはkey/valueのオブジェクトでもいいし、key/valueのオブジェクトを返すような関数でもOK
    delegateEvents: function(events) {
      
      // 定義されているeventsを持ってくる
      events || (events = _.result(this, 'events'));
      if (!events) return this;
      
      // イベントの登録前に一旦イベントを外して均す
      this.undelegateEvents();
      
      for (var key in events) {
        // イベントのcallback関数はViewのコンテキスト上に存在する関数名を指定するのもOKだけど、関数そのものを指定することもできる
        // {a: 'alistener', b: function(){...}} が混ざってもいいということ
        var method = events[key];
        if (!_.isFunction(method)) method = this[method];
        if (!method) continue;
        
        // イベントのkeyを分割する
        // ex) 'click hoge' => [click, click, hoge]みたいな
        var match = key.match(delegateEventSplitter);
        
        // _.bindにてcallback関数のcontextをViewのcontextに書き換えた関数として生成しなおしている。
        // _.bindのがどういうものかは以下を見るのが早いかと
        // なのでeventsに設定できるcallbackは必ずViewになる
        // eventsのcallbackを別のcontextで実行する方法は見つからない。
        // ----------------------------------------------------------------------------------------------------
        // var func = function(greeting){ return greeting + ': ' + this.name };
        // func = _.bind(func, {name: 'moe'}, 'hi');
        // func();
        // => 'hi: moe'
        // ----------------------------------------------------------------------------------------------------
        this.delegate(match[1], match[2], _.bind(method, this));
      }
      return this;
    },

    // Add a single event listener to the view's element (or a child element
    // using `selector`). This only works for delegate-able events: not `focus`,
    // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
    // イベントの登録を行う処理
    // ViewのイベントはすべてjQueryのAPIを使って実装されている
    // イベントの登録を行う際にコンストラクタでインスタンスに対して一意なIDを採番していたが、これがここに来て意味を出した。
    // これにより、同じViewだが、インスタンスの違う場合、別のイベントとして対応することができる
    delegate: function(eventName, selector, listener) {

      // 実際にイベントを登録するときは『click.delegateEventsview1』みたいな感じになる。
      // ここでいう『delegateEventsview1』の部分はこのイベントのネームスペースとして扱えるようになり。
      //ネームスペースを利用したイベントの削除なんかができるようになるらしい。
      // https://api.jquery.com/on/
      // この記事にも書かれているが気持ち悪い挙動なので注意。
      // http://qiita.com/sasaplus1/items/0ec036c1a8789b9d9907
      this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
      return this;
    },

    // Clears all callbacks previously bound to the view by `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    // Viewに紐付けられたjQueryのイベントをすべて取っ払う
    undelegateEvents: function() {
      if (this.$el) this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // A finer-grained `undelegateEvents` for removing a single delegated event.
    // `selector` and `listener` are both optional.
    // 指定された、Viewに紐付けられたjQueryのイベントを取っ払う
    undelegate: function(eventName, selector, listener) {
      this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
      return this;
    },

    // Produces a DOM element to be assigned to your view. Exposed for
    // subclasses using an alternative DOM manipulation API.
    // タグ名をもとにHTMLタグの文字列を生成する。
    // window.documentのAPIをそのまま使っているだけである
    _createElement: function(tagName) {
      return document.createElement(tagName);
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    // 
    // this.elが定義されていた場合は、this.elを評価し、結果の文字列をView自身のDOM要素として扱うようになる。
    // this.elは文字列として定義されていてもいいし、関数として定義されていてもいい。.result便利だなぁ
    // this.elが存在しない場合はthis.attributes, this.id, this.className, this.tagNameに定義されているものを利用してView自身のDOM要素として扱うことになる
    // この中でthis.tagNameに関してはデフォルトで『div』が定義されているので、仮に何にも定義されていない状態だと、『<div>』がViewのDOMになる
    // ※ Model.attributesとView.attributesは全く世界が違うので注意すること。View.attributesはDOM要素のattributesのことを指している。『href, srcとかのあれね。』
    _ensureElement: function() {
      if (!this.el)
      {
        // this.elが定義されていない場合は、Viewのメンバ変数を利用してDOMを生成する
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this._createElement(_.result(this, 'tagName')));
        this._setAttributes(attrs);
      }
      else
      {
        // this.elを定義しているときはそれを単純に利用するだけ
        this.setElement(_.result(this, 'el'));
      }
    },

    // Set attributes from a hash on this view's element.  Exposed for
    // subclasses using an alternative DOM manipulation API.
    // View自身のDOM要素にattributesを設定する
    // jQueryのAPIをそのまま使っているだけである。
    _setAttributes: function(attributes) {
      this.$el.attr(attributes);
    }

  });
  

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  // Backbone.syncはHTTPのリクエストを行うためのAPI
  // 基本的にBackbone.syncを直接触ることは少なく、Backbone.Model.saveやBackbone.Collection.fetchなどの中でBackbone.syncを実行するようになっている
  // method: HTTPのメソッド名に変換するための識別子。詳しくはmethodMapのオブジェクトを参照
  // model: Backbone.Modelのインスタンス
  // options: リクエストのbodyなど色々、最終的に$.ajax()の引数にも利用されます。要はここに{success: Function, error: Function}とか書く必要があります
  Backbone.sync = function(method, model, options) {
    
    // HTTPのメソッド名がtypeには入ることになる、GET, POSTなど
    var type = methodMap[method];

    // Default options, unless specified.
    // optionsをオーバーライドする
    // emulateHTTP, emulateJSONの役割に関しては他のところで説明しているので割愛する
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options
    // 変数paramsは最終的に$.ajax()の引数に使われます
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    // options.urlが実装されていない場合はModel.urlを評価した結果を利用します。
    // いづれかのurlを取得できない場合(実装されていない場合は)例外を発行します
    // params.urlはHTTPのリクエストのエンドポイントです。
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    // params.data(HTTPのBODYにあたるところ)を決定するためのアルゴリズムです
    // 
    // 更新系のリクエストの場合
    // options.attrsが実装されていればそれを利用します
    // options.attrsが実装されていない場合はmodel.toJSON()の結果を利用します
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    // ここに関してもBackbone.emulateJSONで説明したので割愛
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {

    　// ここに関してもBackbone.emulateJSONで説明したので割愛
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
     
      // beforeSendはajaxで通信を行う直前に評価するメソッドです。
      // 通信の直前でヘッダーの書き換えを行います。
      // 仮にoptionsに対してbeforeSendが実装されていると、単純に上書きされてしまい、実装していたはずのbeforeSendが評価されなくなってしまうので
      // 一旦、実装されているbeforeSendをキャッシュして多段的に実行するようになっています。
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    // dataに指定したオブジェクトをクエリ文字列に変換するかどうかを設定します。
    // ajaxの機能です。GETリクエスト以外は不要です
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // Pass along `textStatus` and `errorThrown` from jQuery.
    // エラーの際のハンドリング用のメソッドも少しカスタマイズして多段的に実行するようになっています
    // 最終的にoptionsを引数に受けたModelの『request』イベントが発行されるのでその時にstatusを簡単に補足するためにoptionsのメンバを更新していますね
    // Modelのイベント走らせるとかもいいと思うんですけどね。
    var error = options.error;
    options.error = function(xhr, textStatus, errorThrown) {
      options.textStatus = textStatus;
      options.errorThrown = errorThrown;
      if (error) error.call(options.context, xhr, textStatus, errorThrown);
    };

    // Make the request, allowing the user to override any Ajax options.
    // 実際に$.ajaxを実行してHTTPリクエストを飛ばしています。
    // リクエストを飛ばした際にModelの『request』イベントを発行しています。
    // リクエストが終了された時に発行されるイベントはありません。あったらloading画面の表示・非表示とか書きやすくなるんじゃないかなと思います。
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  // CURDベースの名前の付け方のものをHTTPのメソッド名に変換させます
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  //
  // ここからRouter
  // RouterはMVCでいうところのControllerと思って良い, Marionette.jsではRouter, Controllerで役割を分けることができるがBackbone.jsでは両方の役割を持つことになる
  // 引数optionsには.Router.routesを上書きするための情報を入力することができる
  // ModelやViewと同じく、ユーザーがー定義している.initializeを最後に評価する
  var Router = Backbone.Router = function(options) {
    
    // optionsがあれが.routesにて
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    
    
    // ルーティング情報の登録を行う
    this._bindRoutes();
    
    // ユーザー定義の初期化処理の実行
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  // 文字列を正規表現オブジェクト変換する際に使う
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    // ルーティング情報の登録を行う
    // 引数の順番をずらす仕組みが入っているので少し見づらい
    route: function(route, name, callback) {
      
      // routeが正規表現のオブジェクトじゃないは場合に正規表現のオブジェクトに変換する
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);

      // 2つめの文字列にはcallback用の関数が入ってくることがあるので
      // その場合は引数の役割をずらす 
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      // ここでやっと変数callbackに関数が入ることを約束できる
      if (!callback) callback = this[name];
      
      // 一旦整理すると
      // route: ルーティング情報のkey名となる正規表現オブジェクト
      // name: ルーティング実行時のcallback関数のメソッド名(Router.xxx)と読める場合にのみ利用、callbackが無名関数の場合は特に役割がない
      // callback: ルーティング実行時のcallback関数
      
      
      // この記述に関してはvar self = this;と同じ意味合いで使っている
      // ↓のhistory.routeにて無名関数と登録するがその関数のcontextがRouterとは異なるからこうなっている
      var router = this;
      
      // ルーティングの関する情報はBackbone.historyに登録する
      // Backbone.history.routeに関しては単純にデータストアに登録するだけである
      // 第二引数の無名関数がルーティング成立時に実装する関数になる
      // fragmentっていうのは実際にブラウザのURLに使われている【blog/1】のようなハッシュの内容の文字列を指している
      Backbone.history.route(route, function(fragment) {
        
        // ルーターに登録されている引数の情報を取り出す。
        // 要は、blog/(:id)みたいな感じで仮に登録されていたとすると、[id, ...]みたいな配列にparseさせる役割を持つ
        var args = router._extractParameters(route, fragment);
        
        // router.executeにてルーティング時のcallbackを実行している
        // falseならrouteイベントを実行しない、って言うことをやっているが.executeの評価結果は常にundefinedになるはずなので意味ない気がする。なんんだろうかこれは・・・・
        if (router.execute(callback, args, name) !== false) {
          
          
          // ルーティング時にイベントを3つ発行している
          // Routerの 【route:ルーティング名】, 引数にパラメータ
          // Routerの 【route】, 引数にパラメーター
          // historyの【route】, 引数にパラメーター
          router.trigger.apply(router, ['route:' + name].concat(args));
          router.trigger('route', name, args);
          Backbone.history.trigger('route', router, name, args);
        }
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    // ルーターに登録されているcallbasckを実際に実行する役割を持つ
    // 見ての通り、callbackの実行時のコンテキストはRouterになるので注意
    execute: function(callback, args, name) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    // Backbone.history.navigateへのショートカットの役割である。
    // Backbone.history.navigateがどのような役割かはそっちの開設の時に
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    // .routesに定義されているルーティング情報の登録を行う
    // Routerの役割はほぼこれが全てであり、定義されているルーティング情報をBackbone.historyに登録し、
    // ルーティング完了時のcallbackを実行し、イベントを発行できるようにしているだけである。
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      
      // popによって後ろの要素から登録していってるのに注目!!
      // ネタバレをすると、ルーティングに関する情報はBackbone.historyに全部登録されます
      // その際はここでpopした要素をBackbone.history.handlersという配列にunshiftで追加していくので結果的にBackbone.Routerに登録されている順番で、最終的に登録されます。
      // 最後に、フラグメント(URLのハッシュの文字列)にマッチしたルーティングを検索する際はBackbone.history.handlersを上から順番に探索していきます。
      // 要は何を言いたいかというと、よくアクセスされるページはBackbone.Routerで定義する際になるべく小さいインデックスにすべきです。最終的な探索コストを減らすことができます
      while ((route = routes.pop()) != null) {
        
        // route: ルーティング時の名前, mypage,とかblog(/:id)とかの文字列が入る
        // this.routes[route]: ↑に紐付いたルーティング成立時のcallbackの関数名or関数がはいる
        // this.routeによって実際にルーティング情報を登録することができる
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    // 文字列を正規表現オブジェクトに変換することができる
    // 何やってるか全く理解できないけど、これとかUnderscore.jsに組み込んだらいいんちゃうんかな？
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    // URLのフラグメントの内容からRouterに登録している正規表現を元に配列を生成する
    // 要は、blog/1みたいなフラグメントで、blog/(:id)みたいにRouterで登録していた際に[1]のような配列を生成させる
    _extractParameters: function(route, fragment) {

      // 引数routeは正規表現オブジェクトなので、route.execはRegExp.prototype.execのことである
      // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
      // 文字列を正規表現オブジェクトで評価する
      var params = route.exec(fragment).slice(1);
      
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  //
  //
  // ここからBackbone.History
  // Backbone.HistoryはHTML5のpushStateなどのAPIをラップすることで、URLの変更を管理し、Routerにイベントを発火させる仕組みを提供している
  // pushStateなどに対応していないブラウザにも対応するために、独自のURL管理のためのポーリングの仕組みを提供することも行なっている
  // -- おさらい --
  // history.pushState: ブラウザの履歴を追加するための仕組み(HTML5のAPIのこと) 
  // popStateイベント: 履歴を移動したら発火するイベント
  // hashchangeイベント: URLのハッシュだけが変わった場合に発火するイベント 
  var History = Backbone.History = function() {
    
    // ルーティングの情報を格納するための配列
    this.handlers = [];
    
    // this.checkUrlをHistoryのコンテキストで実行できることを保証している
    this.checkUrl = _.bind(this.checkUrl, this);

    // Ensure that `History` can be used outside of the browser.
    // window.location/window.historyのショートカットを作成する
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  // .startが実行されたかどうかをメモしておく。
  // Backbone.Historyに直接メモすることでHistoryの実装を継承したものが仮に複数あったとしても、1つしか実行できないことを保証している
  // Backbone.Historyはブラウザの状態(URL)などを直接管理するものなので、唯一無二であることが望ましい
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // URLの変更を検知するためにポーリングの仕組みを利用するが
    // そのポーリングの周期を定義している
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      var path = this.location.pathname.replace(/[^\/]$/, '$&/');
      return path === this.root && !this.getSearch();
    },

    // Does the pathname match the root?
    matchRoot: function() {
      var path = this.decodeFragment(this.location.pathname);
      var root = path.slice(0, this.root.length - 1) + '/';
      return root === this.root;
    },

    // Unicode characters in `location.pathname` are percent encoded so they're
    // decoded for comparison. `%25` should not be decoded since it may be part
    // of an encoded parameter.
    decodeFragment: function(fragment) {
      return decodeURI(fragment.replace(/%25/g, '%2525'));
    },

    // In IE6, the hash fragment and search params are incorrect if the
    // fragment contains `?`.
    getSearch: function() {
      var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
      return match ? match[0] : '';
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the pathname and search params, without the root.
    getPath: function() {
      var path = this.decodeFragment(
        this.location.pathname + this.getSearch()
      ).slice(this.root.length - 1);
      return path.charAt(0) === '/' ? path.slice(1) : path;
    },

    // Get the cross-browser normalized URL fragment from the path or hash.
    // 現在のfragmentの文字列を取得する
    // fragmentの文字列とは【router.html#mypage】でいうところの【mypage】みたいなものである
    getFragment: function(fragment) {
      if (fragment == null) {
        if (this._usePushState || !this._wantsHashChange) {
          fragment = this.getPath();
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    // Backbone.Historyの起動コマンド
    // 渡せるoptions
    // silent: start実行時のfragmentを元にルーターに登録されているcallbackを即時実行するか否か
    // hashChange: onhashChangeを使ったURLの変更管理を行うか否か
    // pushState: pushStateを使ったURLの変更管理を行うか否か
    // root: URLのどこを起点にルーターを設置するか。デフォルトでは【/】なっている。何かしらの理由で/mypageから始めたいとかの場合にこれを利用する
    start: function(options) {

      // Backbone.Historyは実行中であれば、例外を返す
      if (History.started) throw new Error('Backbone.history has already been started');
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      // rootと呼ばれるものは上書きすることができる。
      // rootとは、URLのどこを起点にルーターを設置するかを決めるものだと思っていい
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root
      ;
      // onhashchangeに対応しているブラウザかを確認して、結果をメンバに持たせる
      // optionsにてhashChangeを使わない用に設定することも可能である
      // ユーザーが使いたいかどうかと、ブラウザが対応しているかどうかの結果を元に、実際に使うか否かを評価している
      this._wantsHashChange = this.options.hashChange !== false;
      this._hasHashChange   = 'onhashchange' in window && (document.documentMode === void 0 || document.documentMode > 7);
      this._useHashChange   = this._wantsHashChange && this._hasHashChange;
      
      // onhashchangeと同じく、window.history.pushStateを使うか否かを評価している
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.history && this.history.pushState);
      this._usePushState    = this._wantsPushState && this._hasPushState;
      
      // 現在のフラグメントの文字列を取得している
      this.fragment         = this.getFragment();
      
      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          var root = this.root.slice(0, -1) || '/';
          this.location.replace(root + '#' + this.getPath());
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot()) {
          this.navigate(this.getHash(), {replace: true});
        }

      }

      // Proxy an iframe to handle location events if the browser doesn't
      // support the `hashchange` event, HTML5 history, or the user wants
      // `hashChange` but not `pushState`.
      // pushStateもhashChangeも使わない・使えない場合はiframeを使って履歴管理を行う？
      if (!this._hasHashChange && this._wantsHashChange && !this._usePushState) {
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'javascript:0';
        this.iframe.style.display = 'none';
        this.iframe.tabIndex = -1;
        var body = document.body;
        // Using `appendChild` will throw on IE < 9 if the document is not ready.
        var iWindow = body.insertBefore(this.iframe, body.firstChild).contentWindow;
        iWindow.document.open();
        iWindow.document.close();
        iWindow.location.hash = '#' + this.fragment;
      }

      // Add a cross-platform `addEventListener` shim for older browsers.
      // これはaddEventListenerのクロスブラウザ対応の書き方
      // addEventListenerが対応していないブラウザの場合はattachEventが実行される
      // IE8以前のやつの対応になる 
      var addEventListener = window.addEventListener || function (eventName, listener) {
        return attachEvent('on' + eventName, listener);
      };

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      // pushStateを使えるばあい(使いたい場合)はpopstateにイベントを登録してURLを確認させてルーターのcallbackを実行させる
      // pushStateを使わない場合はhashchangeにイベントを登録させてURLを確認させてルーターのcallbackを実行させる
      // ↑の両方とも使わない場合(hashchangeっぽいことはやりたい)場合はポーリングさせ、URLを確認させてルーターのcallbackを実行させる
      // 要はpopStateによる、URLの検知方法を優先して使います
      if (this._usePushState) {
        addEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        addEventListener('hashchange', this.checkUrl, false);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // start時にsilentオプションを設定できる、これは現在のfragmentの情報を元に即時にRouterのcallbackを実行するかどうかを制御するためのものである。
      // デフォルトではundefinedになっているので即時実行される。
      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    // Backbone.historyによる、URLの変更検知を止める
    // 何かしらの色々なイベントやタイマーを止めるだけで特に特別なことはしていない
    stop: function() {
      
      // Add a cross-platform `removeEventListener` shim for older browsers.
      // addEventListenerの時と同じくIE8対応
      var removeEventListener = window.removeEventListener || function (eventName, listener) {
        return detachEvent('on' + eventName, listener);
      };

      // Remove window listeners.
      if (this._usePushState) {
        removeEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        removeEventListener('hashchange', this.checkUrl, false);
      }

      // Clean up the iframe if necessary.
      if (this.iframe) {
        document.body.removeChild(this.iframe);
        this.iframe = null;
      }

      // Some environments will throw when clearing an undefined interval.
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    // ルーティングの情報.handlersに保存する。
    // 基本的にはBackbone.Routerのコンストラクタによって実行されて、Backbone.Routerで定義されているルーティング情報が登録されると思っておけば良い
    // 要はBackbone.historyがルーティング情報を持つことになるので、結局Backbone.Routerは別に使わなくたっていい(routeイベントが発行されなくなるだけである)
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    // 現在のURLを元にルーターに登録されているcallbackを実行するためのメソッド
    checkUrl: function(e) {
      
      // 現在のフラグメントを取得
      var current = this.getFragment();

      // If the user pressed the back button, the iframe's hash will have
      // changed and we should use that for comparison.
      if (current === this.fragment && this.iframe) {
        current = this.getHash(this.iframe.contentWindow);
      }

      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    // フラグメントの文字列を元にルーターにcallbackが存在するかを調べてマッチした場合にcallbackを実行する
    // ルーティング情報はすべて正規表現のオブジェクトとしての検索キーを所有しているので、それを使ってフラグメントの文字列を評価する
    loadUrl: function(fragment) {
      // If the root doesn't match, no routes can match either.
      if (!this.matchRoot()) return false;
      
      // ここでBackbone.history.fragmentを更新している
      fragment = this.fragment = this.getFragment(fragment);
      return _.some(this.handlers, function(handler) {
        // 正規表現オブジェクトを使ってルーティングが存在するかを評価
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    // フラグメントの内容をhistoryに保存させ、loadUrlを実行し、Routerに登録されているcallbackを実行する
    // 保存するフラグメント(URLを決定させる文字列)とoptionsを引数に受ける
    // optionsに設定できる項目
    // trigger: Routerに登録されているcallbackを最終的に実行するかどうかを評価する
    // replace: this.history.replaceState, this.history.pushStateのどっちを利用するかを決定することができる。要は上書きか・追加か
    navigate: function(fragment, options) {
      if (!History.started) return false;
      
      // optionsがtrueの場合は{trigger: true}に変換される
      // optionsがundefinedの場合は{trigger: false}に変換される
      if (!options || options === true) options = {trigger: !!options};

      // Normalize the fragment.
      // 現在のフラグメントを取得
      fragment = this.getFragment(fragment || '');

      // Don't include a trailing slash on the root.
      var root = this.root;
      if (fragment === '' || fragment.charAt(0) === '?') {
        root = root.slice(0, -1) || '/';
      }
      var url = root + fragment;

      // Strip the hash and decode for matching.
      fragment = this.decodeFragment(fragment.replace(pathStripper, ''));

      // fragmentに更新がない場合(URLのハッシュに変更がない場合)
      // は何も処理をせずに終了する
      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._usePushState) {
        
        // options.replaceの内容によって上書きでのhistory保存か、追加かを決定し、実行する
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        
        // pushStateを利用しないでhashchangeでやりたい場合はURLのハッシュを上書きし、iframeを使っている場合はiframeのページの切り替えを行い、履歴を辿れるようにしている
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getHash(this.iframe.contentWindow))) {
          var iWindow = this.iframe.contentWindow;

          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if (!options.replace) {
            iWindow.document.open();
            iWindow.document.close();
          }

          this._updateHash(iWindow.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        // pushState, hashchangeのどっちも対応していない場合は単純にリダイレクトさせる
        return this.location.assign(url);
      }
      
      // triggerオプションが指定されている場合はfragmentに対応したルーターのcallbackを実行することになる
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    // URLのハッシュの書き換えを行う
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  // ここでもうHistoryのインスタンスを作っているので
  // Backbone.historyを扱う場合はBackbone.historyの参照を利用すべき
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function and add the prototype properties.
    child.prototype = _.create(parent.prototype, protoProps);
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error.call(options.context, model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));
