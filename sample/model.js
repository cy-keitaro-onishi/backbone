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
