var Backbone = require('./../backbone.js');


// Optionsの使い方とchngae::XXXついて
// 以下のコードを実行した際にchange!!, change::hoge!!は何回実行されるだろうか
var a = new Backbone.Model({
  hoge: 'Hoge',
});

a.on('change', function(model, value){
  console.log('change!!');
});

a.on('change:hoge', function(model, value){
  console.log('change:hoge!!');
  console.log(value);
});

a.set({
  hoge: 'Hoge',
});
a.set({
});
a.set({
  hoge: 'HOGE',
});
a.set({
  hoge: 'Hoge',
}, {silent: true});
a.set({
  hoge: 'Hoge',
}, {unset: true});

console.log('-------------------------------');
console.log(a.toJSON());
console.log(a.previousAttributes());
console.log('-------------------------------');


// previousAttributesにて1世代前のModelのattributesの状態を知ることができる
var b = new Backbone.Model({
  hoge: 'Hoge',
}).set({
  fuga: 'Fuga',
}).set({
  piyo: 'Piyo',
});
console.log('-------------------------------');
console.log(b.toJSON());
console.log(b.previousAttributes());
console.log('-------------------------------');

// cloneはシャローコピー
var c = new Backbone.Model({});
var clone = c.clone();
console.log('-------------------------------');
console.log(c == clone);
console.log(c.cid);
console.log(clone.cid);
console.log('-------------------------------');


// .setの時はvalidateは基本的には無視される
// invalid!!は何回実行されるでしょう
var Smoker = Backbone.Model.extend({
  defaults: {age: 0},
  validate: function(attrs){
    return attrs.age >= 20 ? null: new Error('age');
  }
});
var d = new Smoker();
d.on('invalid', function(e){
  console.log('invalid!!');
  console.log(e);
});
console.log('-------------------------------');
d.set({age: 9}, {validate: true});
console.log(d.toJSON());
d.set({age: 9});
console.log(d.toJSON());
console.log('-------------------------------');

// .parseを利用することでコンストラクタでのattributesの加工を行うことができる
// .fetchを利用する際なんかに重宝する
var Smoker = Backbone.Model.extend({
  defaults: {age: 0},
  validate: function(attrs){
    return attrs.age >= 20 ? null: new Error('age');
  },
  parse: function(response){
    return response.user;
  }
});
var e = new Smoker({
  user: {
    age: 20,
  }
}, {parse: true});
console.log('-------------------------------');
console.log(e.toJSON());
console.log('-------------------------------');



///////////////////////////////////////////////////
// .setの復讐。
// コンソールには何と出力されるでしょうか
//
var f = new Smoker({
  age: 20,
});

f.on('invalid',    function(){ console.log('a'); });
f.on('change',     function(){ console.log('b'); });
f.on('change:age', function(){ console.log('c'); });
f.on('change:xxx', function(){ console.log('d'); });

console.log('-------------------------------');
f.set('age', 10);
f.set('age', 10);
f.set('age', 20);
f.set('age', 20);
f.set('yyy', 20);
console.log('-------------------------------');

var g = new Smoker({
  age: 20,
});

g.on('invalid',    function(){ console.log('a'); });
g.on('change',     function(){ console.log('b'); });
g.on('change:age', function(){ console.log('c'); });
g.on('change:xxx', function(){ console.log('d'); });

console.log('-------------------------------');
g.set({
  age: 10,
  xxx: 10
});
g.set({
  age: 10,
  xxx: 10
});
console.log('-------------------------------');

var h = new Smoker({
  age: 20,
});

h.on('invalid',    function(){ console.log('a'); });
h.on('change',     function(){ console.log('b'); });
h.on('change:age', function(){ console.log('c'); });
h.on('change:xxx', function(){ console.log('d'); });

console.log('-------------------------------');
h.set('age', 10, {validate: true});
h.set('age', 10, {silent: true});
h.set('age', 20, {validate: true});
h.set('age', 30, {validate: true, silent: true});
console.log('-------------------------------');

var i = new Smoker({
  age: 20,
});

i.on('invalid',    function(){ console.log('a'); });
i.on('change',     function(){ console.log('b'); });
i.on('change:age', function(){ console.log('c'); });
i.on('change:xxx', function(){ console.log('d'); });

console.log('-------------------------------');
i.set('age', 30, {silent: true});
i.set('age', void 0, {unset: true});
console.log('-------------------------------');
