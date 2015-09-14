var Omegle = require('./index.js');
var omegle = new Omegle();
var msgCount = 0;

function say(msg) {
  console.log('Saying...');
  setTimeout(function() {
    console.log('About to say...');
    omegle.say(msg, function(err) {
      if ( err ) {
        console.log('Say error: ' + err);
        return;
      }
    
      console.log('said: ' + msg);
    });
  }, 1000);
}

omegle.connect(function(err) {
  if ( err ) {
    console.log(err);
  }
  console.log('omegle connected.');
});

omegle.on('unhandledEvent', function(event) {
  console.log('unhandledEvent=' + event);
});

omegle.on('strangerDisconnected', function() {
  console.log('stranger disconnected.');
});

omegle.on('gotMessage', function(msg) {
  msgCount += 1;
  // Ask them if they are a bot, then start repeating what they say as a 
  // question in all caps.
  if ( msgCount > 1 ) {
    console.log('Replying...');
    say(msg.toUpperCase() + '?');
  }
  else {
    console.log('Replying...');
    say('hey are u a bot?');
  }
  
  console.log(msg);
});

omegle.on('stoppedTyping', function() {
  console.log('Stranger stopped typing');
});

omegle.on('typing', function() {
  console.log('Stranger is typing.');
});

omegle.on('error', function(err) {
  console.log(err);
});
